import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { app, createFixtures, write } from './helpers';
import { ids, orgWorld } from './organisation.fixtures';

const fx = createFixtures();
let w: Awaited<ReturnType<typeof orgWorld>>;
let extra: { id: string; name: string };
let inactive: { id: string };

const URL = '/api/v2/sections';

beforeAll(async () => {
  await prepareV2();
  w = await orgWorld(fx);
  extra = await fx.make('Section', { name: `${fx.tag}-extra`, code: `${fx.tag}X`, departmentId: w.mine.department.id });
  inactive = await fx.make('Section', { name: `${fx.tag}-old`, departmentId: w.other.department.id, isActive: false });
  await fx.employee(w.mine.section.id);
  await fx.make('JobTitle', { name: `${fx.tag}-jt`, sectionId: w.mine.section.id });
});
afterAll(() => fx.cleanup());

describe('GET /sections', () => {
  it('pages and searches the whole mine for admins, with department and counts', async () => {
    const res = await w.agents.admin.get(URL).query({ q: fx.tag, pageSize: 2 });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 4, pageCount: 2 });

    const one = await w.agents.admin.get(`${URL}/${w.mine.section.id}`);
    expect(one.body.data).toMatchObject({
      id: w.mine.section.id,
      departmentId: w.mine.department.id,
      department: { id: w.mine.department.id, name: w.mine.department.name },
      employeeCount: 1,
      jobTitleCount: 1,
      isActive: true,
      code: null,
    });
  });

  it('filters by department and status and sorts by department', async () => {
    const byDept = await w.agents.admin.get(URL).query({ q: fx.tag, departmentId: w.mine.department.id });
    expect(ids(byDept.body)).toEqual([w.mine.section.id, extra.id].sort());

    const inactiveOnly = await w.agents.admin.get(URL).query({ q: fx.tag, status: 'inactive' });
    expect(ids(inactiveOnly.body)).toEqual([inactive.id]);

    const sorted = await w.agents.admin.get(URL).query({ q: fx.tag, sort: 'department', order: 'desc' });
    expect(sorted.status).toBe(200);
    const names = sorted.body.data.map((s: { department: { name: string } }) => s.department.name);
    expect(names).toEqual([...names].sort().reverse());
  });

  it('searches by code', async () => {
    const res = await w.agents.admin.get(URL).query({ q: `${fx.tag}X` });
    expect(ids(res.body)).toEqual([extra.id]);
  });

  it('gives sheq and stores the whole mine', async () => {
    for (const agent of [w.agents.sheq, w.agents.stores]) {
      expect((await agent.get(URL).query({ q: fx.tag })).body.meta.total).toBe(4);
    }
  });

  it('limits HODs and department reps to their department, even when asking for another', async () => {
    for (const agent of [w.agents.hod, w.agents.departmentRep]) {
      const res = await agent.get(URL).query({ q: fx.tag });
      expect(ids(res.body)).toEqual([w.mine.section.id, extra.id].sort());
      const widened = await agent.get(URL).query({ q: fx.tag, departmentId: w.other.department.id });
      expect(widened.body.data).toEqual([]);
      expect((await agent.get(`${URL}/${w.other.section.id}`)).status).toBe(404);
    }
  });

  it('limits a section rep to their own section', async () => {
    const res = await w.agents.sectionRep.get(URL).query({ q: fx.tag });
    expect(ids(res.body)).toEqual([w.mine.section.id]);
    expect((await w.agents.sectionRep.get(`${URL}/${extra.id}`)).status).toBe(404);
    expect((await w.agents.sectionRep.get(`${URL}/${w.mine.section.id}`)).status).toBe(200);
  });

  it('rejects bad queries', async () => {
    expect((await w.agents.admin.get(URL).query({ sort: 'password' })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ pageSize: 5000 })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ departmentId: 'nope' })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ status: 'gone' })).status).toBe(422);
    expect((await w.agents.admin.get(`${URL}/not-a-uuid`)).status).toBe(422);
  });

  it('returns 404 for an unknown section', async () => {
    expect((await w.agents.admin.get(`${URL}/00000000-0000-4000-8000-000000000000`)).status).toBe(404);
  });

  it('requires a session', async () => {
    expect((await request(app).get(URL)).status).toBe(401);
    expect((await request(app).get(`${URL}/options`)).status).toBe(401);
    expect((await request(app).get(`${URL}/${w.mine.section.id}`)).status).toBe(401);
  });
});

describe('GET /sections/options', () => {
  it('lists active sections, optionally for one department', async () => {
    const res = await w.agents.admin.get(`${URL}/options`).query({ departmentId: w.mine.department.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      [w.mine.section, extra].map((s) => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name))
    );
    const other = await w.agents.admin.get(`${URL}/options`).query({ departmentId: w.other.department.id });
    expect(ids(other.body)).toEqual([w.other.section.id]);
  });

  it('is scoped and validated', async () => {
    const rep = await w.agents.sectionRep.get(`${URL}/options`);
    expect(ids(rep.body)).toEqual([w.mine.section.id]);
    const hod = await w.agents.hod.get(`${URL}/options`).query({ departmentId: w.other.department.id });
    expect(hod.body.data).toEqual([]);
    expect((await w.agents.admin.get(`${URL}/options`).query({ departmentId: 'x' })).status).toBe(422);
  });
});

describe('section writes', () => {
  it('lets an admin create, update, move and delete a section', async () => {
    const created = await write(w.agents.admin, 'post', URL).send({
      name: `${fx.tag}-new`,
      code: 'NEW',
      departmentId: w.mine.department.id,
    });
    expect(created.status).toBe(201);
    fx.track('Section', created.body.data.id);
    expect(created.body.data).toMatchObject({ name: `${fx.tag}-new`, code: 'NEW', isActive: true, employeeCount: 0 });
    expect(created.body.data.department.id).toBe(w.mine.department.id);

    const updated = await write(w.agents.admin, 'put', `${URL}/${created.body.data.id}`).send({
      name: `${fx.tag}-moved`,
      departmentId: w.other.department.id,
      isActive: false,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ name: `${fx.tag}-moved`, code: null, isActive: false, departmentId: w.other.department.id });

    expect((await write(w.agents.admin, 'delete', `${URL}/${created.body.data.id}`)).status).toBe(204);
    expect((await w.agents.admin.get(`${URL}/${created.body.data.id}`)).status).toBe(404);
  });

  it('rejects a duplicate name in the same department but allows it in another', async () => {
    const dup = await write(w.agents.admin, 'post', URL).send({
      name: w.mine.section.name.toUpperCase(),
      departmentId: w.mine.department.id,
    });
    expect(dup.status).toBe(409);

    const elsewhere = await write(w.agents.admin, 'post', URL).send({
      name: w.mine.section.name,
      departmentId: w.other.department.id,
    });
    expect(elsewhere.status).toBe(201);
    fx.track('Section', elsewhere.body.data.id);

    const rename = await write(w.agents.admin, 'put', `${URL}/${extra.id}`).send({
      name: w.mine.section.name,
      departmentId: w.mine.department.id,
    });
    expect(rename.status).toBe(409);
  });

  it('keeps its own name on update', async () => {
    const res = await write(w.agents.admin, 'put', `${URL}/${extra.id}`).send({
      name: extra.name,
      code: `${fx.tag}X`,
      departmentId: w.mine.department.id,
    });
    expect(res.status).toBe(200);
  });

  it('validates input', async () => {
    const bad = await write(w.agents.admin, 'post', URL).send({ name: 'x' });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details.fieldErrors).toMatchObject({ name: ['Enter a name'], departmentId: ['Choose a department'] });

    const ghost = await write(w.agents.admin, 'post', URL).send({
      name: `${fx.tag}-ghost`,
      departmentId: '00000000-0000-4000-8000-000000000000',
    });
    expect(ghost.status).toBe(422);
    expect(ghost.body.error.details.fieldErrors.departmentId).toEqual(['Choose a department']);

    const longCode = await write(w.agents.admin, 'post', URL).send({
      name: `${fx.tag}-long`,
      code: 'x'.repeat(21),
      departmentId: w.mine.department.id,
    });
    expect(longCode.status).toBe(422);
  });

  it('returns 404 when updating or deleting an unknown section', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    const body = { name: `${fx.tag}-none`, departmentId: w.mine.department.id };
    expect((await write(w.agents.admin, 'put', `${URL}/${missing}`).send(body)).status).toBe(404);
    expect((await write(w.agents.admin, 'delete', `${URL}/${missing}`)).status).toBe(404);
  });

  it('refuses to delete a section that still has employees or job titles', async () => {
    const res = await write(w.agents.admin, 'delete', `${URL}/${w.mine.section.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/1 employee, 1 job title, 1 user account/);
    expect(res.body.error.details).toMatchObject({ employees: 1, jobTitles: 1, users: 1 });
  });

  it('refuses to delete a section that only has job titles, which the database would cascade', async () => {
    const section = await fx.make('Section', { name: `${fx.tag}-titles-only`, departmentId: w.other.department.id });
    await fx.make('JobTitle', { name: `${fx.tag}-only`, sectionId: section.id });
    const res = await write(w.agents.admin, 'delete', `${URL}/${section.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ jobTitles: 1 });
  });

  it('forbids everyone but admins', async () => {
    const body = { name: `${fx.tag}-nope`, departmentId: w.mine.department.id };
    for (const agent of [w.agents.hod, w.agents.departmentRep, w.agents.sectionRep, w.agents.sheq, w.agents.stores]) {
      expect((await write(agent, 'post', URL).send(body)).status).toBe(403);
      expect((await write(agent, 'put', `${URL}/${extra.id}`).send(body)).status).toBe(403);
      expect((await write(agent, 'delete', `${URL}/${extra.id}`)).status).toBe(403);
    }
  });

  it('requires a session to write', async () => {
    const res = await request(app).post(URL).set('Origin', 'http://localhost:3000').send({});
    expect(res.status).toBe(401);
  });
});
