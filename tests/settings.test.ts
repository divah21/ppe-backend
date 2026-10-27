import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import request from 'supertest';
import { Op } from 'sequelize';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Row } from '../src/core/db';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { app, createFixtures, signIn, write } from './helpers';

const fx = createFixtures();
let adminAgent: Awaited<ReturnType<typeof signIn>>;
let sheqAgent: Awaited<ReturnType<typeof signIn>>;
let admin: Row;
let ppeItem: Row;

// The same module instance the API loaded, so its functions can be stubbed
const backupHelper = createRequire(import.meta.url)('../helpers/backup_helper');
const original = { performBackup: backupHelper.performBackup };

// Settings are global: snapshot every row this file may touch and put them back afterwards
const TOUCHED = ['notifications', 'email', 'allocation', 'general'];
let snapshot: Array<Record<string, unknown>> = [];
let backupDir: string;
const BACKUP_FILE = `ppe_backup_${fx.tag}.sql`;

beforeAll(async () => {
  await prepareV2();
  snapshot = (await models.Setting.findAll({ where: { category: { [Op.in]: TOUCHED } } })).map((r) => r.get({ plain: true }));
  admin = await fx.user('admin');
  adminAgent = await signIn(admin.username);
  sheqAgent = await signIn((await fx.user('sheq')).username);
  ppeItem = await fx.make('PPEItem', { name: `${fx.tag}-gloves` });
  const pathRow = await models.Setting.findOne({ where: { category: 'database', key: 'backupPath' } });
  backupDir = path.resolve((pathRow?.value as string | null) || backupHelper.DEFAULT_BACKUP_PATH);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, BACKUP_FILE), '-- test backup\n');
});

afterAll(async () => {
  backupHelper.performBackup = original.performBackup;
  fs.rmSync(path.join(backupDir, BACKUP_FILE), { force: true });
  await models.Setting.destroy({ where: { category: { [Op.in]: TOUCHED } } });
  if (snapshot.length) await models.Setting.bulkCreate(snapshot);
  await fx.cleanup();
});

const setting = (groups: Array<{ category: string; settings: Array<{ key: string }> }>, category: string, key: string) =>
  groups.find((g) => g.category === category)!.settings.find((s) => s.key === key) as Record<string, unknown>;

describe('GET /api/v2/settings', () => {
  it('returns every category with defaults for unset keys', async () => {
    const res = await adminAgent.get('/api/v2/settings');
    expect(res.status).toBe(200);
    expect(res.body.data.map((g: { category: string }) => g.category)).toEqual([
      'general',
      'notifications',
      'security',
      'database',
      'email',
      'appearance',
      'api',
      'users',
      'allocation',
    ]);
    expect(setting(res.body.data, 'database', 'backupTime')).toMatchObject({ kind: 'time' });
    expect(setting(res.body.data, 'notifications', 'budgetThreshold')).toMatchObject({ kind: 'number', min: 1, max: 100, unit: '%' });
    expect(setting(res.body.data, 'email', 'smtpPassword')).toMatchObject({ kind: 'secret', value: null });
  });

  it('is for admins only', async () => {
    expect((await sheqAgent.get('/api/v2/settings')).status).toBe(403);
    expect((await sheqAgent.get('/api/v2/settings/backups')).status).toBe(403);
    expect((await write(sheqAgent, 'put', '/api/v2/settings/general').send({ maintenanceMode: true })).status).toBe(403);
    expect((await request(app).get('/api/v2/settings')).status).toBe(401);
  });
});

describe('PUT /api/v2/settings/:category', () => {
  it('saves typed values and records who changed what', async () => {
    const res = await write(adminAgent, 'put', '/api/v2/settings/notifications').send({ budgetThreshold: 75, weeklyReports: false });
    expect(res.status).toBe(200);
    const budget = res.body.data.settings.find((s: { key: string }) => s.key === 'budgetThreshold');
    expect(budget).toMatchObject({ value: 75, isDefault: false });
    const row = await models.Setting.findOne({ where: { category: 'notifications', key: 'budgetThreshold' } });
    expect(row).toMatchObject({ value: '75', valueType: 'number', updatedBy: admin.id });

    const entry = await models.AuditLog.findOne({ where: { userId: admin.id, action: 'SETTINGS_UPDATE' } });
    expect(entry?.meta).toEqual({ category: 'notifications', updatedKeys: ['budgetThreshold', 'weeklyReports'] });
  });

  it('keeps secrets write-only', async () => {
    const res = await write(adminAgent, 'put', '/api/v2/settings/email').send({ smtpPassword: `${fx.tag}-secret`, smtpPort: 465 });
    expect(res.status).toBe(200);
    const secret = res.body.data.settings.find((s: { key: string }) => s.key === 'smtpPassword');
    expect(secret).toMatchObject({ value: null, hasValue: true });
    expect(JSON.stringify(res.body)).not.toContain(`${fx.tag}-secret`);
    const logged = await models.AuditLog.findAll({ where: { userId: admin.id } });
    expect(JSON.stringify(logged.map((l) => [l.changes, l.meta]))).not.toContain(`${fx.tag}-secret`);
  });

  it('validates each key against its rules', async () => {
    const bad = await write(adminAgent, 'put', '/api/v2/settings/notifications').send({ budgetThreshold: 500 });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details.fieldErrors.budgetThreshold).toEqual(['Enter 100 or less']);

    const typed = await write(adminAgent, 'put', '/api/v2/settings/email').send({ fromEmail: 'not-an-email', smtpPort: '25' });
    expect(Object.keys(typed.body.error.details.fieldErrors).sort()).toEqual(['fromEmail', 'smtpPort']);

    const unknown = await write(adminAgent, 'put', '/api/v2/settings/general').send({ backdoor: true });
    expect(unknown.status).toBe(422);
    expect((await write(adminAgent, 'put', '/api/v2/settings/general').send({})).status).toBe(422);
    expect((await write(adminAgent, 'put', '/api/v2/settings/general').send({ currency: 'rands' })).status).toBe(422);
    expect((await write(adminAgent, 'put', '/api/v2/settings/secrets').send({ a: 1 })).status).toBe(422);
  });

  it('only allows catalogue items as additional items', async () => {
    const missing = await write(adminAgent, 'put', '/api/v2/settings/allocation').send({
      allowedAdditionalItemIds: ['00000000-0000-4000-8000-000000000000'],
    });
    expect(missing.status).toBe(422);
    expect(missing.body.error.details.fieldErrors.allowedAdditionalItemIds).toBeDefined();

    const options = await adminAgent.get('/api/v2/settings/allocation/item-options');
    expect(options.body.data).toContainEqual({ id: ppeItem.id, name: `${fx.tag}-gloves` });
    expect((await sheqAgent.get('/api/v2/settings/allocation/item-options')).status).toBe(403);

    const ok = await write(adminAgent, 'put', '/api/v2/settings/allocation').send({ allowedAdditionalItemIds: [ppeItem.id] });
    expect(ok.status).toBe(200);
    expect(ok.body.data.settings.find((s: { key: string }) => s.key === 'allowedAdditionalItemIds').value).toEqual([ppeItem.id]);
  });
});

describe('backups', () => {
  it('lists backup files with paging and status', async () => {
    const list = await adminAgent.get('/api/v2/settings/backups').query({ pageSize: 100 });
    expect(list.status).toBe(200);
    expect(list.body.data).toContainEqual({ filename: BACKUP_FILE, sizeBytes: 15, createdAt: expect.any(String) });
    expect(JSON.stringify(list.body)).not.toContain(backupDir.replace(/\\/g, '\\\\'));

    const status = await adminAgent.get('/api/v2/settings/backups/status');
    expect(status.body.data).toMatchObject({ autoBackup: expect.any(Boolean), backupTime: expect.any(String), running: false });
    expect(status.body.data.totalBackups).toBeGreaterThanOrEqual(1);
  });

  it('runs one backup at a time', async () => {
    let finish: () => void = () => undefined;
    backupHelper.performBackup = () =>
      new Promise((resolve) => {
        finish = () => resolve({ filename: 'ppe_backup_2026-10-27_12-00-00.sql', size: 2048, timestamp: '2026-10-27T12:00:00.000Z' });
      });
    const first = write(adminAgent, 'post', '/api/v2/settings/backups').then((r) => r);
    await new Promise((r) => setTimeout(r, 100));
    const second = await write(adminAgent, 'post', '/api/v2/settings/backups');
    expect(second.status).toBe(409);
    finish();
    const res = await first;
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ filename: 'ppe_backup_2026-10-27_12-00-00.sql', sizeBytes: 2048, createdAt: '2026-10-27T12:00:00.000Z' });
  });

  it('reports a failed backup without leaking details', async () => {
    backupHelper.performBackup = () => Promise.reject(new Error('pg_dump: password authentication failed for user postgres'));
    const res = await write(adminAgent, 'post', '/api/v2/settings/backups');
    expect(res.status).toBe(500);
    expect(res.body.error.message).toMatch(/could not be created/);
    expect(JSON.stringify(res.body)).not.toContain('pg_dump');
  });

  it('downloads only files in the backup folder', async () => {
    const res = await adminAgent.get(`/api/v2/settings/backups/${BACKUP_FILE}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain(BACKUP_FILE);
    expect((await adminAgent.get('/api/v2/settings/backups/ppe_backup_missing.sql')).status).toBe(404);
    expect((await adminAgent.get('/api/v2/settings/backups/..%2F.env')).status).toBe(422);
    expect((await sheqAgent.get(`/api/v2/settings/backups/${BACKUP_FILE}`)).status).toBe(403);
  });
});
