import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { app, createFixtures, signIn, write } from './helpers';

const fx = createFixtures();
let adminAgent: Awaited<ReturnType<typeof signIn>>;
let hodAgent: Awaited<ReturnType<typeof signIn>>;
let mine: { department: { id: string; name: string }; section: { id: string } };
let other: { department: { id: string } };

beforeAll(async () => {
  await prepareV2();
  mine = await fx.org();
  other = await fx.org();
  adminAgent = await signIn((await fx.user('admin')).username);
  hodAgent = await signIn((await fx.user('hod', { departmentId: mine.department.id })).username);
});
afterAll(() => fx.cleanup());

describe('GET /api/v2/departments', () => {
  it('pages, searches and counts sections for admins', async () => {
    const res = await adminAgent.get('/api/v2/departments').query({ q: fx.tag, pageSize: 1 });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 1, total: 2, pageCount: 2 });
    expect(res.body.data[0]).toMatchObject({ sectionCount: 1, isActive: true });
  });

  it('limits a HOD to their own department', async () => {
    const res = await hodAgent.get('/api/v2/departments').query({ q: fx.tag });
    expect(res.body.data.map((d: { id: string }) => d.id)).toEqual([mine.department.id]);
    expect((await hodAgent.get(`/api/v2/departments/${other.department.id}`)).status).toBe(404);
  });

  it('rejects an unknown sort key and oversized pages', async () => {
    expect((await adminAgent.get('/api/v2/departments').query({ sort: 'password' })).status).toBe(422);
    expect((await adminAgent.get('/api/v2/departments').query({ pageSize: 5000 })).status).toBe(422);
  });

  it('requires a session', async () => {
    expect((await request(app).get('/api/v2/departments')).status).toBe(401);
  });
});

describe('writes', () => {
  it('lets an admin create, update and delete', async () => {
    const created = await write(adminAgent, 'post', '/api/v2/departments').send({ name: `${fx.tag}-new`, code: `${fx.tag}N` });
    expect(created.status).toBe(201);
    fx.track('Department', created.body.data.id);

    const updated = await write(adminAgent, 'put', `/api/v2/departments/${created.body.data.id}`).send({
      name: `${fx.tag}-renamed`,
      isActive: false,
    });
    expect(updated.body.data).toMatchObject({ name: `${fx.tag}-renamed`, isActive: false, code: null });

    expect((await write(adminAgent, 'delete', `/api/v2/departments/${created.body.data.id}`)).status).toBe(204);
  });

  it('refuses to delete a department that still has sections', async () => {
    const res = await write(adminAgent, 'delete', `/api/v2/departments/${mine.department.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/still has 1 section/);
  });

  it('reports duplicates as 409 and bad input as 422', async () => {
    const dup = await write(adminAgent, 'post', '/api/v2/departments').send({ name: mine.department.name });
    expect(dup.status).toBe(409);
    const bad = await write(adminAgent, 'post', '/api/v2/departments').send({ name: 'x' });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details.fieldErrors.name).toBeDefined();
  });

  it('forbids non-admins', async () => {
    expect((await write(hodAgent, 'post', '/api/v2/departments').send({ name: `${fx.tag}-hod` })).status).toBe(403);
  });
});
