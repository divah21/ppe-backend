import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { app, createFixtures, write } from './helpers';
import { ids, orgWorld } from './organisation.fixtures';

const fx = createFixtures();
let w: Awaited<ReturnType<typeof orgWorld>>;
let cc: { mine: { id: string; code: string; name: string }; other: { id: string }; shared: { id: string }; inactive: { id: string } };

const URL = '/api/v2/cost-centers';

beforeAll(async () => {
  await prepareV2();
  w = await orgWorld(fx);
  cc = {
    mine: await fx.make('CostCenter', { code: `${fx.tag}-100`, name: 'Plant', departmentId: w.mine.department.id }),
    other: await fx.make('CostCenter', { code: `${fx.tag}-200`, name: 'Mining', departmentId: w.other.department.id }),
    shared: await fx.make('CostCenter', { code: `${fx.tag}-300`, name: 'Mine-wide', departmentId: null }),
    inactive: await fx.make('CostCenter', { code: `${fx.tag}-400`, name: 'Old plant', departmentId: w.mine.department.id, isActive: false }),
  };
  await fx.employee(w.mine.section.id, { costCenterId: cc.mine.id });
});
afterAll(() => fx.cleanup());

describe('GET /cost-centers', () => {
  it('pages the whole mine for admins, sorted by code', async () => {
    const res = await w.agents.admin.get(URL).query({ q: fx.tag, pageSize: 2 });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ total: 4, pageCount: 2 });
    expect(res.body.data.map((c: { id: string }) => c.id)).toEqual([cc.mine.id, cc.other.id]);

    const one = await w.agents.admin.get(`${URL}/${cc.mine.id}`);
    expect(one.body.data).toMatchObject({
      code: `${fx.tag}-100`,
      name: 'Plant',
      departmentId: w.mine.department.id,
      department: { id: w.mine.department.id, name: w.mine.department.name },
      employeeCount: 1,
      isActive: true,
      description: null,
    });
    const shared = await w.agents.admin.get(`${URL}/${cc.shared.id}`);
    expect(shared.body.data).toMatchObject({ departmentId: null, department: null });
  });

  it('searches name and code, and filters by department and status', async () => {
    const byName = await w.agents.admin.get(URL).query({ q: 'plant', departmentId: w.mine.department.id });
    expect(ids(byName.body)).toEqual([cc.mine.id, cc.inactive.id].sort());
    const active = await w.agents.admin.get(URL).query({ q: fx.tag, departmentId: w.mine.department.id, status: 'active' });
    expect(ids(active.body)).toEqual([cc.mine.id]);
    const sorted = await w.agents.admin.get(URL).query({ q: fx.tag, sort: 'department', order: 'asc' });
    expect(sorted.status).toBe(200);
  });

  it('gives sheq and stores the whole mine', async () => {
    for (const agent of [w.agents.sheq, w.agents.stores]) expect((await agent.get(URL).query({ q: fx.tag })).body.meta.total).toBe(4);
  });

  it('limits department roles and section reps to their department, hiding unassigned ones', async () => {
    for (const agent of [w.agents.hod, w.agents.departmentRep, w.agents.sectionRep]) {
      const res = await agent.get(URL).query({ q: fx.tag });
      expect(ids(res.body)).toEqual([cc.mine.id, cc.inactive.id].sort());
      const widened = await agent.get(URL).query({ q: fx.tag, departmentId: w.other.department.id });
      expect(widened.body.data).toEqual([]);
      expect((await agent.get(`${URL}/${cc.other.id}`)).status).toBe(404);
      expect((await agent.get(`${URL}/${cc.shared.id}`)).status).toBe(404);
    }
  });

  it('rejects bad queries and requires a session', async () => {
    expect((await w.agents.admin.get(URL).query({ sort: 'employees' })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ order: 'sideways' })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ departmentId: 'abc' })).status).toBe(422);
    expect((await request(app).get(URL)).status).toBe(401);
    expect((await request(app).get(`${URL}/options`)).status).toBe(401);
  });
});

describe('GET /cost-centers/options', () => {
  it('lists active cost centres as "code · name"', async () => {
    const res = await w.agents.admin.get(`${URL}/options`).query({ departmentId: w.mine.department.id });
    expect(res.body.data).toEqual([{ id: cc.mine.id, name: `${fx.tag}-100 · Plant` }]);
  });

  it('is scoped and validated', async () => {
    const rep = await w.agents.sectionRep.get(`${URL}/options`);
    expect(ids(rep.body)).toEqual([cc.mine.id]);
    const hod = await w.agents.hod.get(`${URL}/options`).query({ departmentId: w.other.department.id });
    expect(hod.body.data).toEqual([]);
    expect((await w.agents.admin.get(`${URL}/options`).query({ departmentId: '1' })).status).toBe(422);
  });
});

describe('cost centre writes', () => {
  it('lets an admin create, update, unassign and delete a cost centre', async () => {
    const created = await write(w.agents.admin, 'post', URL).send({
      code: `${fx.tag}-500`,
      name: 'Workshop',
      departmentId: w.mine.department.id,
      description: 'Engineering workshop',
    });
    expect(created.status).toBe(201);
    fx.track('CostCenter', created.body.data.id);
    expect(created.body.data).toMatchObject({ code: `${fx.tag}-500`, isActive: true, departmentId: w.mine.department.id });

    const updated = await write(w.agents.admin, 'put', `${URL}/${created.body.data.id}`).send({
      code: `${fx.tag}-501`,
      name: 'Workshop (central)',
      departmentId: '',
      isActive: false,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      code: `${fx.tag}-501`,
      departmentId: null,
      department: null,
      description: null,
      isActive: false,
    });

    expect((await write(w.agents.admin, 'delete', `${URL}/${created.body.data.id}`)).status).toBe(204);
  });

  it('rejects a duplicate code regardless of case', async () => {
    const dup = await write(w.agents.admin, 'post', URL).send({ code: `${fx.tag}-100`.toUpperCase(), name: 'Copy' });
    expect(dup.status).toBe(409);
    const rename = await write(w.agents.admin, 'put', `${URL}/${cc.other.id}`).send({ code: `${fx.tag}-100`, name: 'Mining' });
    expect(rename.status).toBe(409);
    const same = await write(w.agents.admin, 'put', `${URL}/${cc.other.id}`).send({
      code: `${fx.tag}-200`,
      name: 'Mining',
      departmentId: w.other.department.id,
    });
    expect(same.status).toBe(200);
  });

  it('validates input', async () => {
    const bad = await write(w.agents.admin, 'post', URL).send({ code: '', name: 'x', departmentId: 'nope' });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.details.fieldErrors).sort()).toEqual(['code', 'departmentId', 'name']);

    const ghost = await write(w.agents.admin, 'post', URL).send({
      code: `${fx.tag}-999`,
      name: 'Ghost',
      departmentId: '00000000-0000-4000-8000-000000000000',
    });
    expect(ghost.status).toBe(422);
    expect(ghost.body.error.details.fieldErrors.departmentId).toEqual(['Choose a department']);
  });

  it('refuses to delete a cost centre with employees', async () => {
    const res = await write(w.agents.admin, 'delete', `${URL}/${cc.mine.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/still has 1 employee\./);
  });

  it('returns 404 for unknown cost centres', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    expect((await w.agents.admin.get(`${URL}/${missing}`)).status).toBe(404);
    expect((await write(w.agents.admin, 'put', `${URL}/${missing}`).send({ code: 'X1', name: 'None' })).status).toBe(404);
    expect((await write(w.agents.admin, 'delete', `${URL}/${missing}`)).status).toBe(404);
  });

  it('forbids everyone but admins', async () => {
    const body = { code: `${fx.tag}-nope`, name: 'Nope' };
    for (const agent of [w.agents.hod, w.agents.departmentRep, w.agents.sectionRep, w.agents.sheq, w.agents.stores]) {
      expect((await write(agent, 'post', URL).send(body)).status).toBe(403);
      expect((await write(agent, 'put', `${URL}/${cc.shared.id}`).send(body)).status).toBe(403);
      expect((await write(agent, 'delete', `${URL}/${cc.shared.id}`)).status).toBe(403);
    }
  });
});
