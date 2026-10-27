import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PASSWORD, app, createFixtures } from './helpers';

const fx = createFixtures();
const token: Record<string, string> = {};
let a: Awaited<ReturnType<typeof fx.org>>;
let b: Awaited<ReturnType<typeof fx.org>>;
let empA: Awaited<ReturnType<typeof fx.employee>>;
let empB: Awaited<ReturnType<typeof fx.employee>>;
let requestB: Awaited<ReturnType<typeof fx.make>>;
let failureB: Awaited<ReturnType<typeof fx.make>>;

const get = (who: string, url: string) => request(app).get(`/api/v1${url}`).set('Authorization', `Bearer ${token[who]}`);

beforeAll(async () => {
  a = await fx.org();
  b = await fx.org();
  empA = await fx.employee(a.section.id);
  empB = await fx.employee(b.section.id);
  const item = await fx.make('PPEItem', { name: `${fx.tag} gloves`, itemCode: `${fx.tag}-GLV` });
  await fx.make('Allocation', { employeeId: empB.id, ppeItemId: item.id, quantity: 1, issueDate: new Date(), status: 'active', allocationType: 'replacement' });

  const users = {
    sectionRep: await fx.user('section-rep', { sectionId: a.section.id }),
    hod: await fx.user('hod', { departmentId: a.department.id }),
    stores: await fx.user('stores'),
  };
  requestB = await fx.make('Request', { status: 'pending', employeeId: empB.id, requestedById: users.stores.id });
  failureB = await fx.make('FailureReport', {
    employeeId: empB.id,
    ppeItemId: item.id,
    description: 'torn',
    reportedDate: new Date(),
  });
  for (const [name, user] of Object.entries(users)) {
    const res = await request(app).post('/api/v1/auth/login').send({ username: user.username, password: PASSWORD });
    token[name] = res.body.data.accessToken;
  }
});
afterAll(() => fx.cleanup());

describe('v1 record scoping', () => {
  it('keeps the employee list inside the caller scope even when a filter asks for another section', async () => {
    const ids = async (who: string, query: string) =>
      (await get(who, `/employees?search=${fx.tag}&${query}`)).body.data.map((e: { id: string }) => e.id);
    expect(await ids('sectionRep', `sectionId=${b.section.id}`)).toEqual([]);
    expect(await ids('sectionRep', '')).toEqual([empA.id]);
    expect(await ids('hod', `departmentId=${b.department.id}`)).toEqual([]);
    expect(await ids('hod', '')).toEqual([empA.id]);
    expect((await ids('stores', '')).sort()).toEqual([empA.id, empB.id].sort());
  });

  it('hides employees outside the scope by id', async () => {
    for (const url of [`/employees/${empB.id}`, `/employees/${empB.id}/allocations`, `/employees/${empB.id}/requests`]) {
      expect((await get('sectionRep', url)).status).toBe(404);
      expect((await get('hod', url)).status).toBe(404);
      expect((await get('stores', url)).status).toBe(200);
    }
    expect((await get('sectionRep', `/employees/${empA.id}`)).status).toBe(200);
  });

  it('does not let a section rep move or edit employees outside their section', async () => {
    const put = (id: string, body: object) =>
      request(app).put(`/api/v1/employees/${id}`).set('Authorization', `Bearer ${token.sectionRep}`).send(body);
    expect((await put(empA.id, { sectionId: b.section.id })).status).toBe(403);
    expect((await put(empB.id, { firstName: 'Changed' })).status).toBe(404);
  });

  it('scopes allocations, requests and failure reports', async () => {
    expect((await get('hod', `/allocations?employeeId=${empB.id}`)).body.data).toEqual([]);
    expect((await get('stores', `/allocations?employeeId=${empB.id}`)).body.data).toHaveLength(1);

    expect((await get('hod', `/requests/${requestB.id}`)).status).toBe(404);
    expect((await get('stores', `/requests/${requestB.id}`)).status).toBe(200);
    expect((await get('hod', `/requests?employeeId=${empB.id}`)).body.data).toEqual([]);

    expect((await get('hod', `/failures/${failureB.id}`)).status).toBe(404);
    expect((await get('stores', `/failures/${failureB.id}`)).status).toBe(200);
  });
});

describe('v1 employee request history', () => {
  it('lists requests without exposing approver password hashes', async () => {
    const res = await get('stores', `/employees/${empB.id}/requests`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { id: string }) => r.id)).toEqual([requestB.id]);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });
});
