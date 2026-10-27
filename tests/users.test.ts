import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { app, createFixtures, signIn, write } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;

const fx = createFixtures();
const TEMP = /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/;

let adminAgent: Agent;
let hodAgent: Agent;
let admin: Awaited<ReturnType<typeof fx.user>>;
let hod: Awaited<ReturnType<typeof fx.user>>;
let mine: Awaited<ReturnType<typeof fx.org>>;
let other: Awaited<ReturnType<typeof fx.org>>;
let free: Awaited<ReturnType<typeof fx.employee>>;
let taken: Awaited<ReturnType<typeof fx.employee>>;
const roleIds: Record<string, string> = {};

const createUser = (body: Record<string, unknown>) => write(adminAgent, 'post', '/api/v2/users').send(body);

beforeAll(async () => {
  await prepareV2();
  mine = await fx.org();
  other = await fx.org();
  free = await fx.employee(mine.section.id, { firstName: 'Zelda', lastName: `Free${fx.tag}` });
  taken = await fx.employee(mine.section.id, { lastName: `Taken${fx.tag}` });
  admin = await fx.user('admin');
  hod = await fx.user('hod', { departmentId: mine.department.id, employeeId: taken.id });
  adminAgent = await signIn(admin.username);
  hodAgent = await signIn(hod.username);
  for (const name of ['admin', 'hod', 'department-rep', 'section-rep', 'stores', 'sheq']) {
    roleIds[name] = (await fx.role(name)).id;
  }
});
afterAll(() => fx.cleanup());

describe('GET /api/v2/roles/options', () => {
  it('lists the roles with their keys and labels', async () => {
    const res = await hodAgent.get('/api/v2/roles/options');
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { key: string }) => r.key)).toEqual(
      expect.arrayContaining(['admin', 'hod', 'section-rep'])
    );
    expect(res.body.data[0]).toMatchObject({ id: expect.any(String), name: expect.any(String), key: 'admin' });
  });

  it('requires a session', async () => {
    expect((await request(app).get('/api/v2/roles/options')).status).toBe(401);
  });
});

describe('GET /api/v2/users', () => {
  it('pages and searches by username without exposing password hashes', async () => {
    const res = await adminAgent.get('/api/v2/users').query({ q: fx.tag, pageSize: 1 });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 1, total: 2, pageCount: 2 });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('searches by employee name and works number', async () => {
    const byName = await adminAgent.get('/api/v2/users').query({ q: `Test ${taken.lastName}` });
    expect(byName.body.data.map((u: { id: string }) => u.id)).toEqual([hod.id]);
    expect(byName.body.data[0]).toMatchObject({
      name: `Test ${taken.lastName}`,
      role: { key: 'hod' },
      employee: { worksNumber: taken.worksNumber, department: { id: mine.department.id } },
      managedDepartment: { id: mine.department.id },
      managedSection: null,
    });
    const byNumber = await adminAgent.get('/api/v2/users').query({ q: taken.worksNumber });
    expect(byNumber.body.data.map((u: { id: string }) => u.id)).toEqual([hod.id]);
  });

  it('filters by role and status and sorts', async () => {
    const hods = await adminAgent.get('/api/v2/users').query({ q: fx.tag, role: 'hod' });
    expect(hods.body.data.map((u: { id: string }) => u.id)).toEqual([hod.id]);
    const inactive = await adminAgent.get('/api/v2/users').query({ q: fx.tag, status: 'inactive' });
    expect(inactive.body.meta.total).toBe(0);
    const sorted = await adminAgent.get('/api/v2/users').query({ q: fx.tag, sort: 'role', order: 'asc' });
    expect(sorted.body.data.map((u: { role: { key: string } }) => u.role.key)).toEqual(['admin', 'hod']);
    for (const sort of ['name', 'lastLogin', 'createdAt', 'username']) {
      expect((await adminAgent.get('/api/v2/users').query({ q: fx.tag, sort })).status).toBe(200);
    }
  });

  it('rejects unknown sort keys and filters', async () => {
    expect((await adminAgent.get('/api/v2/users').query({ sort: 'passwordHash' })).status).toBe(422);
    expect((await adminAgent.get('/api/v2/users').query({ role: 'owner' })).status).toBe(422);
    expect((await adminAgent.get('/api/v2/users').query({ pageSize: 500 })).status).toBe(422);
  });

  it('is admin only', async () => {
    expect((await request(app).get('/api/v2/users')).status).toBe(401);
    expect((await hodAgent.get('/api/v2/users')).status).toBe(403);
    expect((await hodAgent.get(`/api/v2/users/${hod.id}`)).status).toBe(403);
    expect((await hodAgent.get('/api/v2/users/employee-options')).status).toBe(403);
  });
});

describe('GET /api/v2/users/:id', () => {
  it('returns one user', async () => {
    const res = await adminAgent.get(`/api/v2/users/${hod.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: hod.id, username: hod.username, isActive: true, mustChangePassword: false });
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('returns 404 for an unknown id and 422 for a malformed one', async () => {
    expect((await adminAgent.get(`/api/v2/users/${randomUUID()}`)).status).toBe(404);
    expect((await adminAgent.get('/api/v2/users/nope')).status).toBe(422);
  });
});

describe('pickers', () => {
  it('offers only active employees without an account', async () => {
    const res = await adminAgent.get('/api/v2/users/employee-options').query({ q: fx.tag });
    expect(res.status).toBe(200);
    const ids = res.body.data.map((e: { id: string }) => e.id);
    expect(ids).toContain(free.id);
    expect(ids).not.toContain(taken.id);
    const byName = await adminAgent.get('/api/v2/users/employee-options').query({ q: `Zelda Free${fx.tag}` });
    expect(byName.body.data).toEqual([
      expect.objectContaining({ id: free.id, worksNumber: free.worksNumber, section: { id: mine.section.id, name: mine.section.name } }),
    ]);
  });

  it('lists active sections with their department', async () => {
    const res = await adminAgent.get('/api/v2/users/section-options');
    expect(res.body.data).toContainEqual({
      id: other.section.id,
      name: other.section.name,
      departmentId: other.department.id,
      departmentName: other.department.name,
    });
  });
});

describe('POST /api/v2/users', () => {
  it('creates an account for an employee with a one-time temporary password', async () => {
    const employee = await fx.employee(other.section.id);
    const res = await createUser({
      employeeId: employee.id,
      username: `${fx.tag}-rep`,
      roleId: roleIds['section-rep'],
      sectionId: other.section.id,
      departmentId: other.department.id,
    });
    expect(res.status).toBe(201);
    fx.track('User', res.body.data.id);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.data).toMatchObject({
      username: `${fx.tag}-rep`,
      role: { key: 'section-rep' },
      mustChangePassword: true,
      isActive: true,
      managedSection: { id: other.section.id },
      managedDepartment: null,
      employee: { id: employee.id },
    });
    expect(res.body.data.temporaryPassword).toMatch(TEMP);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);

    const again = await adminAgent.get(`/api/v2/users/${res.body.data.id}`);
    expect(again.body.data.temporaryPassword).toBeUndefined();

    const rep = await signIn(`${fx.tag}-rep`, res.body.data.temporaryPassword);
    expect((await rep.get('/api/v2/auth/me')).body.data.mustChangePassword).toBe(true);
    expect((await rep.get('/api/v2/roles/options')).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('drops a scope the role does not use', async () => {
    const employee = await fx.employee(other.section.id);
    const res = await createUser({
      employeeId: employee.id,
      username: `${fx.tag}-stores`,
      roleId: roleIds.stores,
      departmentId: other.department.id,
      sectionId: other.section.id,
    });
    expect(res.status).toBe(201);
    fx.track('User', res.body.data.id);
    expect(res.body.data).toMatchObject({ managedDepartment: null, managedSection: null });
  });

  it('allows one account per employee and unique usernames', async () => {
    const second = await createUser({ employeeId: taken.id, username: `${fx.tag}-second`, roleId: roleIds.stores });
    expect(second.status).toBe(409);
    expect(second.body.error.message).toMatch(/already has a user account/);

    const dup = await createUser({ employeeId: free.id, username: hod.username.toUpperCase(), roleId: roleIds.stores });
    expect(dup.status).toBe(409);
    expect(dup.body.error.message).toMatch(/username is already taken/);
  });

  it('requires the scope the role needs', async () => {
    const hodNoDept = await createUser({ employeeId: free.id, username: `${fx.tag}-x1`, roleId: roleIds.hod });
    expect(hodNoDept.status).toBe(422);
    expect(hodNoDept.body.error.details.fieldErrors.departmentId).toBeDefined();

    const repNoSection = await createUser({ employeeId: free.id, username: `${fx.tag}-x2`, roleId: roleIds['section-rep'] });
    expect(repNoSection.status).toBe(422);
    expect(repNoSection.body.error.details.fieldErrors.sectionId).toBeDefined();

    const unknownDept = await createUser({
      employeeId: free.id,
      username: `${fx.tag}-x3`,
      roleId: roleIds['department-rep'],
      departmentId: randomUUID(),
    });
    expect(unknownDept.status).toBe(422);
    expect(unknownDept.body.error.details.fieldErrors.departmentId).toBeDefined();
  });

  it('validates the body', async () => {
    const bad = await createUser({ employeeId: 'x', username: 'a b', roleId: '' });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.details.fieldErrors)).toEqual(
      expect.arrayContaining(['employeeId', 'username', 'roleId'])
    );
    const unknownEmployee = await createUser({ employeeId: randomUUID(), username: `${fx.tag}-x4`, roleId: roleIds.stores });
    expect(unknownEmployee.status).toBe(422);
    expect(unknownEmployee.body.error.details.fieldErrors.employeeId).toBeDefined();
    const unknownRole = await createUser({ employeeId: free.id, username: `${fx.tag}-x5`, roleId: randomUUID() });
    expect(unknownRole.status).toBe(422);
  });

  it('refuses inactive employees', async () => {
    const leaver = await fx.employee(mine.section.id, { isActive: false });
    const res = await createUser({ employeeId: leaver.id, username: `${fx.tag}-leaver`, roleId: roleIds.stores });
    expect(res.status).toBe(422);
  });

  it('is admin only', async () => {
    const body = { employeeId: free.id, username: `${fx.tag}-x6`, roleId: roleIds.stores };
    expect((await write(hodAgent, 'post', '/api/v2/users').send(body)).status).toBe(403);
    expect((await request(app).post('/api/v2/users').send(body)).status).toBe(401);
  });
});

describe('PUT /api/v2/users/:id', () => {
  it('changes role and scope, clearing the scope the new role does not use', async () => {
    const employee = await fx.employee(mine.section.id);
    const user = await fx.user('section-rep', { employeeId: employee.id, sectionId: mine.section.id });
    const res = await write(adminAgent, 'put', `/api/v2/users/${user.id}`).send({
      username: user.username,
      roleId: roleIds.hod,
      departmentId: other.department.id,
      sectionId: mine.section.id,
      isActive: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      role: { key: 'hod' },
      managedDepartment: { id: other.department.id },
      managedSection: null,
    });
    const row = await models.User.findByPk(user.id);
    expect(row?.sectionId).toBeNull();
  });

  it('deactivating ends the user’s sessions', async () => {
    const user = await fx.user('stores');
    const agent = await signIn(user.username);
    expect((await agent.get('/api/v2/auth/me')).status).toBe(200);

    const res = await write(adminAgent, 'put', `/api/v2/users/${user.id}`).send({
      username: user.username,
      roleId: roleIds.stores,
      isActive: false,
    });
    expect(res.body.data.isActive).toBe(false);
    expect((await agent.get('/api/v2/auth/me')).status).toBe(401);
    expect((await write(agent, 'post', '/api/v2/auth/refresh')).status).toBe(401);
  });

  it('stops an admin deactivating or demoting themselves', async () => {
    const off = await write(adminAgent, 'put', `/api/v2/users/${admin.id}`).send({
      username: admin.username,
      roleId: roleIds.admin,
      isActive: false,
    });
    expect(off.status).toBe(409);
    const demote = await write(adminAgent, 'put', `/api/v2/users/${admin.id}`).send({
      username: admin.username,
      roleId: roleIds.sheq,
      isActive: true,
    });
    expect(demote.status).toBe(409);
    const row = await models.User.findByPk(admin.id);
    expect(row).toMatchObject({ isActive: true, roleId: roleIds.admin });
  });

  it('rejects a username taken by someone else', async () => {
    const res = await write(adminAgent, 'put', `/api/v2/users/${admin.id}`).send({
      username: hod.username,
      roleId: roleIds.admin,
      isActive: true,
    });
    expect(res.status).toBe(409);
  });

  it('validates, 404s and is admin only', async () => {
    const body = { username: hod.username, roleId: roleIds.hod, departmentId: mine.department.id, isActive: true };
    expect((await write(adminAgent, 'put', `/api/v2/users/${hod.id}`).send({ ...body, isActive: 'yes' })).status).toBe(422);
    expect((await write(adminAgent, 'put', `/api/v2/users/${randomUUID()}`).send(body)).status).toBe(404);
    expect((await write(hodAgent, 'put', `/api/v2/users/${hod.id}`).send(body)).status).toBe(403);
    expect((await request(app).put(`/api/v2/users/${hod.id}`).send(body)).status).toBe(401);
  });
});

describe('POST /api/v2/users/:id/reset-password', () => {
  it('issues a new temporary password once and ends the user’s sessions', async () => {
    const user = await fx.user('sheq');
    const agent = await signIn(user.username);

    const res = await write(adminAgent, 'post', `/api/v2/users/${user.id}/reset-password`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.data).toMatchObject({ id: user.id, username: user.username, mustChangePassword: true });
    expect(res.body.data.temporaryPassword).toMatch(TEMP);

    expect((await agent.get('/api/v2/auth/me')).status).toBe(401);
    const fresh = await signIn(user.username, res.body.data.temporaryPassword);
    expect((await fresh.get('/api/v2/auth/me')).body.data.mustChangePassword).toBe(true);

    const audit = await models.AuditLog.findOne({ where: { entityId: user.id, action: 'RESET' } });
    expect(JSON.stringify(audit?.toJSON())).not.toContain(res.body.data.temporaryPassword);
  });

  it('refuses to reset the admin’s own password here', async () => {
    expect((await write(adminAgent, 'post', `/api/v2/users/${admin.id}/reset-password`)).status).toBe(409);
  });

  it('404s, validates and is admin only', async () => {
    expect((await write(adminAgent, 'post', `/api/v2/users/${randomUUID()}/reset-password`)).status).toBe(404);
    expect((await write(adminAgent, 'post', '/api/v2/users/nope/reset-password')).status).toBe(422);
    expect((await write(hodAgent, 'post', `/api/v2/users/${admin.id}/reset-password`)).status).toBe(403);
    expect((await request(app).post(`/api/v2/users/${admin.id}/reset-password`)).status).toBe(401);
  });
});
