import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { employeeWorld, type EmployeeWorld } from './employees.fixtures';
import { app, createFixtures, write } from './helpers';

const fx = createFixtures();
let w: EmployeeWorld;

const URL = '/api/v2/employees';
const ids = (res: request.Response) => (res.body.data as Array<{ id: string }>).map((e) => e.id).sort();

beforeAll(async () => {
  await prepareV2();
  w = await employeeWorld(fx);
});
afterAll(() => fx.cleanup());

describe('GET /employees', () => {
  it('lists the whole mine for admin, SHEQ and stores, with paging', async () => {
    const all = [w.employees.a.id, w.employees.b.id, w.employees.c.id, w.employees.d.id].sort();
    for (const agent of [w.agents.admin, w.agents.sheq, w.agents.stores]) {
      const res = await agent.get(URL).query({ q: fx.tag });
      expect(res.status).toBe(200);
      expect(ids(res)).toEqual(all);
    }
    const page = await w.agents.admin.get(URL).query({ q: fx.tag, pageSize: 3, page: 2 });
    expect(page.body.meta).toMatchObject({ page: 2, pageSize: 3, total: 4, pageCount: 2 });
    expect(page.body.data).toHaveLength(1);
  });

  it('returns a full DTO with organisation and allowed actions', async () => {
    const res = await w.agents.sectionRep.get(URL).query({ q: w.employees.a.worksNumber });
    expect(res.body.data[0]).toMatchObject({
      id: w.employees.a.id,
      fullName: `Thandiwe ${fx.tag}Moyo`,
      isActive: true,
      section: { id: w.mine.section.id },
      department: { id: w.mine.department.id },
      jobTitle: { id: w.jobTitle.id, name: `${fx.tag}-Fitter` },
      costCentre: { id: w.costCentre.id, code: `${fx.tag}-CC` },
      allowedActions: ['edit', 'deactivate'],
    });
    expect(res.body.data[0].passwordHash).toBeUndefined();
  });

  it('limits a section rep to their section', async () => {
    const res = await w.agents.sectionRep.get(URL).query({ q: fx.tag });
    expect(ids(res)).toEqual([w.employees.a.id, w.employees.d.id].sort());
  });

  it('limits HOD and department rep to their department, even with another departmentId', async () => {
    const mine = [w.employees.a.id, w.employees.b.id, w.employees.d.id].sort();
    for (const agent of [w.agents.hod, w.agents.deptRep]) {
      expect(ids(await agent.get(URL).query({ q: fx.tag }))).toEqual(mine);
      const widened = await agent.get(URL).query({ q: fx.tag, departmentId: w.other.department.id });
      expect(widened.body.data).toEqual([]);
    }
    const hodRes = await w.agents.hod.get(URL).query({ q: fx.tag });
    expect(hodRes.body.data[0].allowedActions).toEqual([]);
  });

  it('searches by full name and works number', async () => {
    const byName = await w.agents.admin.get(URL).query({ q: `thandiwe ${fx.tag}moyo` });
    expect(ids(byName)).toEqual([w.employees.a.id]);
    const byNumber = await w.agents.admin.get(URL).query({ q: w.employees.c.worksNumber });
    expect(ids(byNumber)).toEqual([w.employees.c.id]);
  });

  it('filters by department, section, job title and status', async () => {
    const admin = w.agents.admin;
    expect(ids(await admin.get(URL).query({ q: fx.tag, departmentId: w.other.department.id }))).toEqual([w.employees.c.id]);
    expect(ids(await admin.get(URL).query({ q: fx.tag, sectionId: w.sectionB.id }))).toEqual([w.employees.b.id]);
    expect(ids(await admin.get(URL).query({ q: fx.tag, jobTitleId: w.jobTitle.id }))).toEqual([w.employees.a.id]);
    expect(ids(await admin.get(URL).query({ q: fx.tag, status: 'inactive' }))).toEqual([w.employees.d.id]);
  });

  it('sorts by an allowed key', async () => {
    const res = await w.agents.admin.get(URL).query({ q: fx.tag, sort: 'worksNumber', order: 'desc' });
    const numbers = res.body.data.map((e: { worksNumber: string }) => e.worksNumber);
    expect(numbers).toEqual([...numbers].sort().reverse());
    const bySection = await w.agents.admin.get(URL).query({ q: fx.tag, sort: 'section', order: 'asc' });
    expect(bySection.status).toBe(200);
  });

  it('rejects bad query parameters', async () => {
    expect((await w.agents.admin.get(URL).query({ sort: 'passwordHash' })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ sectionId: 'nope' })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ status: 'gone' })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ pageSize: 1000 })).status).toBe(422);
  });

  it('requires a session', async () => {
    expect((await request(app).get(URL)).status).toBe(401);
    expect((await request(app).get(`${URL}/options`)).status).toBe(401);
    expect((await request(app).get(`${URL}/${w.employees.a.id}`)).status).toBe(401);
  });
});

describe('GET /employees/options', () => {
  it('returns active, scoped employees with works numbers', async () => {
    const res = await w.agents.sectionRep.get(`${URL}/options`).query({ q: fx.tag });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: w.employees.a.id, name: `Thandiwe ${fx.tag}Moyo`, worksNumber: w.employees.a.worksNumber }]);
    expect(res.body.meta).toBeUndefined();
  });

  it('caps results at 20 and filters by section', async () => {
    const res = await w.agents.admin.get(`${URL}/options`);
    expect(res.body.data.length).toBeLessThanOrEqual(20);
    const bySection = await w.agents.admin.get(`${URL}/options`).query({ sectionId: w.sectionB.id });
    expect(bySection.body.data.map((o: { id: string }) => o.id)).toEqual([w.employees.b.id]);
  });

  it('validates the query', async () => {
    expect((await w.agents.admin.get(`${URL}/options`).query({ sectionId: 'x' })).status).toBe(422);
  });
});

describe('GET /employees/lookups', () => {
  it('returns the organisation pickers within the user scope', async () => {
    const rep = (await w.agents.sectionRep.get(`${URL}/lookups`)).body.data;
    expect(rep.sections.map((s: { id: string }) => s.id)).toEqual([w.mine.section.id]);
    expect(rep.departments).toEqual([{ id: w.mine.department.id, name: w.mine.department.name }]);
    expect(rep.jobTitles).toEqual([{ id: w.jobTitle.id, name: `${fx.tag}-Fitter`, sectionId: w.mine.section.id }]);
    expect(rep.costCentres).toEqual(expect.arrayContaining([{ id: w.costCentre.id, code: `${fx.tag}-CC`, name: `${fx.tag} Plant` }]));

    const hod = (await w.agents.hod.get(`${URL}/lookups`)).body.data;
    expect(hod.sections.map((s: { id: string }) => s.id).sort()).toEqual([w.mine.section.id, w.sectionB.id].sort());

    const admin = (await w.agents.admin.get(`${URL}/lookups`)).body.data;
    expect(admin.sections.map((s: { id: string }) => s.id)).toEqual(expect.arrayContaining([w.other.section.id]));
  });
});

describe('GET /employees/:id', () => {
  it('includes current PPE with renewal status and recent requests', async () => {
    const res = await w.agents.admin.get(`${URL}/${w.employees.a.id}`);
    expect(res.status).toBe(200);
    const body = res.body.data;
    expect(body.ppeSummary).toEqual({ activeItems: 2, overdue: 1, dueSoon: 0, requestCount: 1 });
    expect(body.currentPpe).toHaveLength(2);
    const boots = body.currentPpe.find((p: { ppeItem: { itemCode: string } }) => p.ppeItem.itemCode === `${fx.tag}-BOOT`);
    expect(boots).toMatchObject({ quantity: 1, size: '9', dueStatus: 'overdue' });
    expect(boots.daysUntilRenewal).toBeLessThan(0);
    const helmet = body.currentPpe.find((p: { ppeItem: { itemCode: string } }) => p.ppeItem.itemCode === `${fx.tag}-HELM`);
    expect(helmet.dueStatus).toBe('ok');
    expect(body.recentRequests).toEqual([
      expect.objectContaining({ id: w.request.id, status: 'pending', requestType: 'replacement', itemCount: 1 }),
    ]);
  });

  it('is a 404 outside the user scope', async () => {
    expect((await w.agents.sectionRep.get(`${URL}/${w.employees.b.id}`)).status).toBe(404);
    expect((await w.agents.hod.get(`${URL}/${w.employees.c.id}`)).status).toBe(404);
    expect((await w.agents.hod.get(`${URL}/${w.employees.b.id}`)).status).toBe(200);
  });

  it('validates the id', async () => {
    expect((await w.agents.admin.get(`${URL}/not-a-uuid`)).status).toBe(422);
  });
});

describe('POST /employees', () => {
  const body = (extra: Record<string, unknown> = {}) => ({
    worksNumber: `${fx.tag}-new-${Math.random().toString(36).slice(2, 8)}`,
    firstName: 'Nomsa',
    lastName: `${fx.tag}Khumalo`,
    sectionId: w.mine.section.id,
    ...extra,
  });

  it('lets a section rep add someone to their own section', async () => {
    const res = await write(w.agents.sectionRep, 'post', URL).send(
      body({ email: 'Nomsa@Example.com', gender: 'female', jobTitleId: w.jobTitle.id, phoneNumber: '+263 77 123 4567' })
    );
    expect(res.status).toBe(201);
    fx.track('Employee', res.body.data.id);
    expect(res.body.data).toMatchObject({
      email: 'nomsa@example.com',
      gender: 'FEMALE',
      isActive: true,
      section: { id: w.mine.section.id },
      jobTitle: { id: w.jobTitle.id },
    });
    expect(res.body.data.dateJoined).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('lets a department rep add to any section of their department', async () => {
    const res = await write(w.agents.deptRep, 'post', URL).send(body({ sectionId: w.sectionB.id, dateJoined: '2024-02-01' }));
    expect(res.status).toBe(201);
    fx.track('Employee', res.body.data.id);
    expect(res.body.data.dateJoined).toBe('2024-02-01');
  });

  it('refuses a section outside the user scope', async () => {
    const rep = await write(w.agents.sectionRep, 'post', URL).send(body({ sectionId: w.sectionB.id }));
    expect(rep.status).toBe(422);
    expect(rep.body.error.details.fieldErrors.sectionId).toBeDefined();
    const dept = await write(w.agents.deptRep, 'post', URL).send(body({ sectionId: w.other.section.id }));
    expect(dept.status).toBe(422);
  });

  it('refuses unknown job titles and cost centres', async () => {
    const res = await write(w.agents.admin, 'post', URL).send(body({ jobTitleId: '00000000-0000-4000-8000-000000000000' }));
    expect(res.status).toBe(422);
    expect(res.body.error.details.fieldErrors.jobTitleId).toBeDefined();
  });

  it('refuses a job title from another section', async () => {
    const res = await write(w.agents.deptRep, 'post', URL).send(body({ sectionId: w.sectionB.id, jobTitleId: w.jobTitle.id }));
    expect(res.status).toBe(422);
    expect(res.body.error.details.fieldErrors.jobTitleId).toEqual(['Choose a job title from the selected section']);
  });

  it('reports a duplicate works number as 409', async () => {
    const res = await write(w.agents.admin, 'post', URL).send(body({ worksNumber: w.employees.c.worksNumber }));
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already used/);
  });

  it('validates the body', async () => {
    const res = await write(w.agents.admin, 'post', URL).send({ worksNumber: '', email: 'nope', gender: 'x', phoneNumber: 'abc' });
    expect(res.status).toBe(422);
    const fields = Object.keys(res.body.error.details.fieldErrors);
    expect(fields).toEqual(expect.arrayContaining(['worksNumber', 'firstName', 'lastName', 'sectionId', 'email', 'gender', 'phoneNumber']));
  });

  it('forbids roles v1 does not allow', async () => {
    for (const agent of [w.agents.hod, w.agents.sheq, w.agents.stores]) {
      expect((await write(agent, 'post', URL).send(body())).status).toBe(403);
    }
    expect((await request(app).post(URL).set('Origin', 'http://localhost:3000').send(body())).status).toBe(401);
  });
});

describe('PUT /employees/:id', () => {
  const full = (extra: Record<string, unknown> = {}) => ({
    worksNumber: w.employees.b.worksNumber,
    firstName: 'Brian',
    lastName: `${fx.tag}Ncube`,
    sectionId: w.sectionB.id,
    ...extra,
  });

  it('lets a department rep edit within the department', async () => {
    const res = await write(w.agents.deptRep, 'put', `${URL}/${w.employees.b.id}`).send(
      full({ firstName: 'Bryan', costCenterId: w.costCentre.id, contractType: 'permanent' })
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ firstName: 'Bryan', contractType: 'PERMANENT', costCentre: { id: w.costCentre.id } });
  });

  it('is a 404 outside the scope', async () => {
    const res = await write(w.agents.sectionRep, 'put', `${URL}/${w.employees.b.id}`).send(full());
    expect(res.status).toBe(404);
  });

  it('refuses moving an employee out of the user scope', async () => {
    const res = await write(w.agents.deptRep, 'put', `${URL}/${w.employees.b.id}`).send(full({ sectionId: w.other.section.id }));
    expect(res.status).toBe(422);
  });

  it('refuses a works number already in use', async () => {
    const res = await write(w.agents.admin, 'put', `${URL}/${w.employees.b.id}`).send(full({ worksNumber: w.employees.a.worksNumber }));
    expect(res.status).toBe(409);
  });

  it('validates and gates by role', async () => {
    expect((await write(w.agents.admin, 'put', `${URL}/${w.employees.b.id}`).send({ firstName: '' })).status).toBe(422);
    expect((await write(w.agents.hod, 'put', `${URL}/${w.employees.b.id}`).send(full())).status).toBe(403);
  });

  it('checks the job title against the section, but keeps an older cross-section link editable', async () => {
    const moved = await write(w.agents.deptRep, 'put', `${URL}/${w.employees.b.id}`).send(full({ jobTitleId: w.jobTitle.id }));
    expect(moved.status).toBe(422);
    expect(moved.body.error.details.fieldErrors.jobTitleId).toBeDefined();

    const legacy = await fx.employee(w.sectionB.id, { jobTitleId: w.jobTitle.id, firstName: 'Legacy' });
    const kept = await write(w.agents.deptRep, 'put', `${URL}/${legacy.id}`).send({
      worksNumber: legacy.worksNumber,
      firstName: 'Legacy',
      lastName: 'Edited',
      sectionId: w.sectionB.id,
      jobTitleId: w.jobTitle.id,
    });
    expect(kept.status).toBe(200);
    expect(kept.body.data.lastName).toBe('Edited');
  });

  it('ignores fields that are not part of the form', async () => {
    const res = await write(w.agents.admin, 'put', `${URL}/${w.employees.b.id}`).send(full({ isActive: false, id: w.employees.a.id }));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: w.employees.b.id, isActive: true });
  });
});

describe('deactivate and activate', () => {
  it('lets a section rep deactivate, and only an admin reactivate', async () => {
    const id = w.employees.a.id;
    const off = await write(w.agents.sectionRep, 'post', `${URL}/${id}/deactivate`);
    expect(off.status).toBe(200);
    expect(off.body.data).toMatchObject({ isActive: false, allowedActions: ['edit'] });

    const again = await write(w.agents.sectionRep, 'post', `${URL}/${id}/deactivate`);
    expect(again.status).toBe(200);

    expect((await write(w.agents.sectionRep, 'post', `${URL}/${id}/activate`)).status).toBe(403);
    const on = await write(w.agents.admin, 'post', `${URL}/${id}/activate`);
    expect(on.status).toBe(200);
    expect(on.body.data.isActive).toBe(true);

    const logged = await models.AuditLog.count({ where: { entityId: id, action: ['DEACTIVATE', 'ACTIVATE'] } });
    expect(logged).toBe(2);
  });

  it('scopes and gates status changes', async () => {
    expect((await write(w.agents.sectionRep, 'post', `${URL}/${w.employees.c.id}/deactivate`)).status).toBe(404);
    expect((await write(w.agents.stores, 'post', `${URL}/${w.employees.c.id}/deactivate`)).status).toBe(403);
    expect((await write(w.agents.admin, 'post', `${URL}/nope/deactivate`)).status).toBe(422);
  });
});
