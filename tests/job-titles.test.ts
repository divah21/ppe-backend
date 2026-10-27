import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { app, createFixtures, write } from './helpers';
import { ids, orgWorld } from './organisation.fixtures';

const fx = createFixtures();
let w: Awaited<ReturnType<typeof orgWorld>>;
let siblingSection: { id: string };
let titles: { used: { id: string; name: string }; sibling: { id: string }; other: { id: string }; inactive: { id: string } };

const URL = '/api/v2/job-titles';

beforeAll(async () => {
  await prepareV2();
  w = await orgWorld(fx);
  siblingSection = await fx.make('Section', { name: `${fx.tag}-sibling`, departmentId: w.mine.department.id });
  titles = {
    used: await fx.make('JobTitle', { name: `${fx.tag}-Fitter`, code: `${fx.tag}F`, sectionId: w.mine.section.id }),
    sibling: await fx.make('JobTitle', { name: `${fx.tag}-Clerk`, sectionId: siblingSection.id }),
    other: await fx.make('JobTitle', { name: `${fx.tag}-Driver`, sectionId: w.other.section.id }),
    inactive: await fx.make('JobTitle', { name: `${fx.tag}-Retired`, sectionId: w.mine.section.id, isActive: false }),
  };
  await fx.employee(w.mine.section.id, { jobTitleId: titles.used.id });
});
afterAll(() => fx.cleanup());

const all = () => [titles.used.id, titles.sibling.id, titles.other.id, titles.inactive.id].sort();

describe('GET /job-titles', () => {
  it('pages the whole mine for admins with section, department and employee count', async () => {
    const res = await w.agents.admin.get(URL).query({ q: fx.tag, pageSize: 3 });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 3, total: 4, pageCount: 2 });

    const one = await w.agents.admin.get(`${URL}/${titles.used.id}`);
    expect(one.body.data).toMatchObject({
      name: `${fx.tag}-Fitter`,
      code: `${fx.tag}F`,
      sectionId: w.mine.section.id,
      section: { id: w.mine.section.id, name: w.mine.section.name },
      departmentId: w.mine.department.id,
      department: { id: w.mine.department.id, name: w.mine.department.name },
      employeeCount: 1,
      isActive: true,
    });
  });

  it('filters by section, department and status', async () => {
    const bySection = await w.agents.admin.get(URL).query({ q: fx.tag, sectionId: w.mine.section.id });
    expect(ids(bySection.body)).toEqual([titles.used.id, titles.inactive.id].sort());

    const byDept = await w.agents.admin.get(URL).query({ q: fx.tag, departmentId: w.mine.department.id, status: 'active' });
    expect(ids(byDept.body)).toEqual([titles.used.id, titles.sibling.id].sort());
  });

  it('sorts by section and department', async () => {
    for (const sort of ['section', 'department', 'code', 'createdAt']) {
      const res = await w.agents.admin.get(URL).query({ q: fx.tag, sort, order: 'asc' });
      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(4);
    }
    const bySection = await w.agents.admin.get(URL).query({ q: fx.tag, sort: 'section', order: 'asc' });
    const names = bySection.body.data.map((j: { section: { name: string } }) => j.section.name);
    expect(names).toEqual([...names].sort());
  });

  it('gives sheq and stores the whole mine', async () => {
    for (const agent of [w.agents.sheq, w.agents.stores]) expect(ids((await agent.get(URL).query({ q: fx.tag })).body)).toEqual(all());
  });

  it('limits HODs and department reps to their department', async () => {
    for (const agent of [w.agents.hod, w.agents.departmentRep]) {
      const res = await agent.get(URL).query({ q: fx.tag });
      expect(ids(res.body)).toEqual([titles.used.id, titles.sibling.id, titles.inactive.id].sort());
      const widened = await agent.get(URL).query({ q: fx.tag, departmentId: w.other.department.id });
      expect(widened.body.data).toEqual([]);
      expect((await agent.get(`${URL}/${titles.other.id}`)).status).toBe(404);
    }
  });

  it('limits a section rep to their section', async () => {
    const res = await w.agents.sectionRep.get(URL).query({ q: fx.tag });
    expect(ids(res.body)).toEqual([titles.used.id, titles.inactive.id].sort());
    const widened = await w.agents.sectionRep.get(URL).query({ q: fx.tag, sectionId: siblingSection.id });
    expect(widened.body.data).toEqual([]);
    expect((await w.agents.sectionRep.get(`${URL}/${titles.sibling.id}`)).status).toBe(404);
  });

  it('rejects bad queries', async () => {
    expect((await w.agents.admin.get(URL).query({ sort: 'sectionId; drop' })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ pageSize: 0 })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ sectionId: '1' })).status).toBe(422);
    expect((await w.agents.admin.get(`${URL}/1`)).status).toBe(422);
  });

  it('requires a session', async () => {
    expect((await request(app).get(URL)).status).toBe(401);
    expect((await request(app).get(`${URL}/options`)).status).toBe(401);
  });
});

describe('GET /job-titles/options', () => {
  it('lists active titles for a section', async () => {
    const res = await w.agents.admin.get(`${URL}/options`).query({ sectionId: w.mine.section.id });
    expect(res.body.data).toEqual([{ id: titles.used.id, name: titles.used.name }]);
    const dept = await w.agents.admin.get(`${URL}/options`).query({ departmentId: w.mine.department.id });
    expect(ids(dept.body)).toEqual([titles.used.id, titles.sibling.id].sort());
  });

  it('is scoped and validated', async () => {
    const hod = await w.agents.hod.get(`${URL}/options`).query({ sectionId: w.other.section.id });
    expect(hod.body.data).toEqual([]);
    const rep = await w.agents.sectionRep.get(`${URL}/options`).query({ departmentId: w.mine.department.id });
    expect(ids(rep.body)).toEqual([titles.used.id]);
    expect((await w.agents.admin.get(`${URL}/options`).query({ sectionId: 'x' })).status).toBe(422);
  });
});

describe('job title writes', () => {
  it('lets an admin create, update, move and delete a job title', async () => {
    const created = await write(w.agents.admin, 'post', URL).send({
      name: `${fx.tag}-Welder`,
      code: `${fx.tag}W`,
      sectionId: w.mine.section.id,
    });
    expect(created.status).toBe(201);
    fx.track('JobTitle', created.body.data.id);
    expect(created.body.data).toMatchObject({ name: `${fx.tag}-Welder`, isActive: true, employeeCount: 0, departmentId: w.mine.department.id });

    const updated = await write(w.agents.admin, 'put', `${URL}/${created.body.data.id}`).send({
      name: `${fx.tag}-Boilermaker`,
      sectionId: w.other.section.id,
      isActive: false,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      name: `${fx.tag}-Boilermaker`,
      code: null,
      isActive: false,
      sectionId: w.other.section.id,
      departmentId: w.other.department.id,
    });

    expect((await write(w.agents.admin, 'delete', `${URL}/${created.body.data.id}`)).status).toBe(204);
  });

  it('rejects duplicate names in a section and duplicate codes anywhere', async () => {
    const sameName = await write(w.agents.admin, 'post', URL).send({ name: titles.used.name.toLowerCase(), sectionId: w.mine.section.id });
    expect(sameName.status).toBe(409);
    expect(sameName.body.error.message).toMatch(/already exists in the section/);

    const sameCode = await write(w.agents.admin, 'post', URL).send({
      name: `${fx.tag}-Other`,
      code: `${fx.tag}f`,
      sectionId: w.other.section.id,
    });
    expect(sameCode.status).toBe(409);
    expect(sameCode.body.error.message).toMatch(/code/);

    const elsewhere = await write(w.agents.admin, 'post', URL).send({ name: titles.used.name, sectionId: w.other.section.id });
    expect(elsewhere.status).toBe(201);
    fx.track('JobTitle', elsewhere.body.data.id);
  });

  it('keeps its own name and code on update', async () => {
    const res = await write(w.agents.admin, 'put', `${URL}/${titles.used.id}`).send({
      name: titles.used.name,
      code: `${fx.tag}F`,
      sectionId: w.mine.section.id,
    });
    expect(res.status).toBe(200);
  });

  it('validates input', async () => {
    const bad = await write(w.agents.admin, 'post', URL).send({ name: '', sectionId: 'x', isActive: 'yes' });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.details.fieldErrors).sort()).toEqual(['isActive', 'name', 'sectionId']);

    const ghost = await write(w.agents.admin, 'post', URL).send({
      name: `${fx.tag}-Ghost`,
      sectionId: '00000000-0000-4000-8000-000000000000',
    });
    expect(ghost.status).toBe(422);
    expect(ghost.body.error.details.fieldErrors.sectionId).toEqual(['Choose a section']);
  });

  it('refuses to delete a job title still in use', async () => {
    const res = await write(w.agents.admin, 'delete', `${URL}/${titles.used.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ employees: 1 });

    const category = await fx.make('JobTitle', { name: `${fx.tag}-Category`, sectionId: w.other.section.id });
    const mapped = await fx.make('JobTitle', { name: `${fx.tag}-Mapped`, sectionId: w.other.section.id, ppeCategoryId: category.id });
    const blocked = await write(w.agents.admin, 'delete', `${URL}/${category.id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.details).toEqual({ mappedJobTitles: 1 });
    expect(mapped.id).toBeDefined();
  });

  it('returns 404 for unknown job titles', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    expect((await w.agents.admin.get(`${URL}/${missing}`)).status).toBe(404);
    expect((await write(w.agents.admin, 'put', `${URL}/${missing}`).send({ name: 'Nobody', sectionId: w.mine.section.id })).status).toBe(404);
    expect((await write(w.agents.admin, 'delete', `${URL}/${missing}`)).status).toBe(404);
  });

  it('forbids everyone but admins', async () => {
    const body = { name: `${fx.tag}-Nope`, sectionId: w.mine.section.id };
    for (const agent of [w.agents.hod, w.agents.departmentRep, w.agents.sectionRep, w.agents.sheq, w.agents.stores]) {
      expect((await write(agent, 'post', URL).send(body)).status).toBe(403);
      expect((await write(agent, 'put', `${URL}/${titles.sibling.id}`).send(body)).status).toBe(403);
      expect((await write(agent, 'delete', `${URL}/${titles.sibling.id}`)).status).toBe(403);
    }
  });
});
