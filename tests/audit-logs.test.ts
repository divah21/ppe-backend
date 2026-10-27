import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Row } from '../src/core/db';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { app, createFixtures, signIn } from './helpers';

const fx = createFixtures();
let adminAgent: Awaited<ReturnType<typeof signIn>>;
let sheqAgent: Awaited<ReturnType<typeof signIn>>;
let actor: Row;
let entry: Row;
const ACTION = `${fx.tag}-UPDATE`;
const URL = '/api/v2/audit-logs';

beforeAll(async () => {
  await prepareV2();
  const { section } = await fx.org();
  const employee = await fx.employee(section.id, { firstName: 'Audit', lastName: 'Person' });
  actor = await fx.user('stores', { employeeId: employee.id });
  const admin = await fx.user('admin');
  entry = await models.AuditLog.create({
    userId: actor.id,
    action: ACTION,
    entityType: `${fx.tag}-THING`,
    entityId: randomUUID(),
    changes: { body: { name: 'Boots', password: 'hunter2', nested: [{ refreshToken: 'abc' }] } },
    meta: { url: '/api/v1/things', headers: { authorization: 'Bearer secret' } },
    ipAddress: '10.0.0.1',
    userAgent: 'vitest',
  });
  await models.AuditLog.create({ userId: actor.id, action: `${fx.tag}-CREATE`, entityType: `${fx.tag}-THING` });
  adminAgent = await signIn(admin.username);
  sheqAgent = await signIn((await fx.user('sheq')).username);
});
afterAll(() => fx.cleanup());

describe('GET /api/v2/audit-logs', () => {
  it('pages and filters by user and action', async () => {
    const res = await adminAgent.get(URL).query({ userId: actor.id, pageSize: 1 });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ total: 2, pageSize: 1, pageCount: 2 });

    const byAction = await adminAgent.get(URL).query({ action: ACTION });
    expect(byAction.body.data).toEqual([
      {
        id: entry.id,
        action: ACTION,
        entityType: `${fx.tag}-THING`,
        entityId: entry.entityId,
        user: { id: actor.id, username: actor.username, name: 'Audit Person', role: 'stores' },
        ipAddress: '10.0.0.1',
        createdAt: expect.any(String),
      },
    ]);
  });

  it('filters by entity type, search and date range', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await adminAgent.get(URL).query({ entityType: `${fx.tag}-THING`, q: `${fx.tag}-cre`, from: today, to: today });
    expect(res.body.data.map((r: { action: string }) => r.action)).toEqual([`${fx.tag}-CREATE`]);
    const past = await adminAgent.get(URL).query({ entityType: `${fx.tag}-THING`, to: '2020-01-01' });
    expect(past.body.meta.total).toBe(0);
  });

  it('sorts by an allowed key only', async () => {
    const res = await adminAgent.get(URL).query({ userId: actor.id, sort: 'action', order: 'asc' });
    expect(res.body.data.map((r: { action: string }) => r.action)).toEqual([`${fx.tag}-CREATE`, ACTION]);
    expect((await adminAgent.get(URL).query({ sort: 'changes' })).status).toBe(422);
  });

  it('rejects bad filters', async () => {
    expect((await adminAgent.get(URL).query({ userId: 'someone' })).status).toBe(422);
    expect((await adminAgent.get(URL).query({ from: '2026-13-01' })).status).toBe(422);
    const range = await adminAgent.get(URL).query({ from: '2026-05-02', to: '2026-05-01' });
    expect(range.status).toBe(422);
    expect(range.body.error.details.fieldErrors.to).toBeDefined();
  });

  it('is for admins only', async () => {
    expect((await sheqAgent.get(URL)).status).toBe(403);
    expect((await sheqAgent.get(`${URL}/${entry.id}`)).status).toBe(403);
    expect((await request(app).get(URL)).status).toBe(401);
  });
});

describe('GET /api/v2/audit-logs/:id', () => {
  it('shows the change with credentials redacted', async () => {
    const res = await adminAgent.get(`${URL}/${entry.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: entry.id,
      userAgent: 'vitest',
      changes: { body: { name: 'Boots', password: '[REDACTED]', nested: [{ refreshToken: '[REDACTED]' }] } },
      meta: { url: '/api/v1/things', headers: { authorization: '[REDACTED]' } },
    });
  });

  it('returns 404 for an unknown entry and 422 for a bad id', async () => {
    expect((await adminAgent.get(`${URL}/${randomUUID()}`)).status).toBe(404);
    expect((await adminAgent.get(`${URL}/not-an-id`)).status).toBe(422);
  });
});

describe('GET /api/v2/audit-logs/facets', () => {
  it('lists actions, entity types and people in the log', async () => {
    const res = await adminAgent.get(`${URL}/facets`);
    expect(res.status).toBe(200);
    expect(res.body.data.actions).toEqual(expect.arrayContaining([ACTION, `${fx.tag}-CREATE`]));
    expect(res.body.data.entityTypes).toContain(`${fx.tag}-THING`);
    expect(res.body.data.users).toContainEqual({ id: actor.id, name: 'Audit Person' });
  });
});
