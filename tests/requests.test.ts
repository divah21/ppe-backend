import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { app, write } from './helpers';
import { createRequestWorld, type RequestWorld } from './requests.fixtures';

let w: RequestWorld;
const URL = '/api/v2/requests';
const ids = (res: { body: { data: Array<{ id: string }> } }) => res.body.data.map((r) => r.id);

beforeAll(async () => {
  await prepareV2();
  w = await createRequestWorld();
});
afterAll(() => w.cleanup());

describe('auth', () => {
  it('requires a session for every endpoint', async () => {
    const id = '00000000-0000-4000-8000-000000000000';
    expect((await request(app).get(URL)).status).toBe(401);
    expect((await request(app).get(`${URL}/counts`)).status).toBe(401);
    expect((await request(app).get(`${URL}/${id}`)).status).toBe(401);
    expect((await request(app).post(URL).set('Origin', 'http://localhost:3000').send({})).status).toBe(401);
    expect((await request(app).post(`${URL}/${id}/approve`).set('Origin', 'http://localhost:3000').send({})).status).toBe(401);
  });
});

describe('POST /requests', () => {
  const body = () => ({
    employeeId: w.employees.empA1.id,
    requestType: 'replacement',
    comment: 'Worn out',
    items: [
      { ppeItemId: w.ppe.gloves.id, quantity: 2 },
      { ppeItemId: w.ppe.boots.id, quantity: 1, size: '9' },
    ],
  });

  it('lets a section rep raise a request for an employee in their section', async () => {
    const res = await write(w.agents.sectionRep, 'post', URL).send(body());
    expect(res.status).toBe(201);
    const d = res.body.data;
    expect(d).toMatchObject({
      status: 'pending',
      requestType: 'replacement',
      comment: 'Worn out',
      employee: { id: w.employees.empA1.id, section: { id: w.a.section.id }, department: { id: w.a.department.id } },
      section: { id: w.a.section.id },
      department: { id: w.a.department.id },
      itemCount: 2,
      totalQuantity: 3,
      waitingDays: 0,
    });
    expect(d.number).toMatch(/^REQ-[0-9A-F]{8}$/);
    expect(d.allowedActions).toEqual(['approve', 'reject', 'cancel']);
    expect(d.items).toHaveLength(2);
    expect(d.items.find((i: { size: string }) => i.size === '9')).toMatchObject({ quantity: 1, issuedQuantity: 0, outstanding: 1 });
    expect(d.timeline.map((s: { key: string; state: string }) => `${s.key}:${s.state}`)).toEqual([
      'submitted:done',
      'sectionRep:current',
      'hod:upcoming',
      'stores:upcoming',
      'issue:upcoming',
    ]);
    const row = await models.Request.findByPk(d.id);
    expect(row).toMatchObject({ sectionId: w.a.section.id, departmentId: w.a.department.id, requestedById: w.users.sectionRep.id });
  });

  it('lets an admin raise a request for any employee', async () => {
    const res = await write(w.agents.admin, 'post', URL).send({ ...body(), employeeId: w.employees.empA1b.id, requestType: 'new' });
    expect(res.status).toBe(201);
    expect(res.body.data.allowedActions).toEqual(['approve', 'reject', 'cancel']);
  });

  it('validates the body (422)', async () => {
    const empty = await write(w.agents.sectionRep, 'post', URL).send({ employeeId: w.employees.empA1.id, items: [] });
    expect(empty.status).toBe(422);
    expect(empty.body.error.details.fieldErrors.items).toBeDefined();

    const badQty = await write(w.agents.sectionRep, 'post', URL).send({ ...body(), items: [{ ppeItemId: w.ppe.gloves.id, quantity: 0 }] });
    expect(badQty.status).toBe(422);

    const noEmployee = await write(w.agents.sectionRep, 'post', URL).send({ ...body(), employeeId: 'nope' });
    expect(noEmployee.status).toBe(422);
    expect(noEmployee.body.error.details.fieldErrors.employeeId).toBeDefined();
  });

  it('requires a size for sized items and rejects duplicates', async () => {
    const noSize = await write(w.agents.sectionRep, 'post', URL).send({ ...body(), items: [{ ppeItemId: w.ppe.boots.id, quantity: 1 }] });
    expect(noSize.status).toBe(422);
    expect(noSize.body.error.message).toMatch(/Choose a size/);

    const dup = await write(w.agents.sectionRep, 'post', URL).send({
      ...body(),
      items: [
        { ppeItemId: w.ppe.gloves.id, quantity: 1 },
        { ppeItemId: w.ppe.gloves.id, quantity: 2 },
      ],
    });
    expect(dup.status).toBe(422);
  });

  it('keeps replacement and annual requests within the PPE matrix, as v1 does', async () => {
    const outside = await write(w.agents.sectionRep, 'post', URL).send({
      ...body(),
      items: [{ ppeItemId: w.ppe.helmet.id, quantity: 1 }],
    });
    expect(outside.status).toBe(422);
    expect(outside.body.error.message).toMatch(/not in this employee's PPE matrix/);

    const emergency = await write(w.agents.sectionRep, 'post', URL).send({
      ...body(),
      requestType: 'emergency',
      items: [{ ppeItemId: w.ppe.helmet.id, quantity: 1 }],
    });
    expect(emergency.status).toBe(201);
  });

  it('refuses an annual issue before the item is due', async () => {
    const next = new Date(Date.now() + 30 * 86_400_000);
    const alloc = await models.Allocation.create({
      employeeId: w.employees.empA1.id,
      ppeItemId: w.ppe.gloves.id,
      quantity: 1,
      status: 'active',
      nextRenewalDate: next,
    });
    try {
      const res = await write(w.agents.sectionRep, 'post', URL).send({
        ...body(),
        requestType: 'annual',
        items: [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }],
      });
      expect(res.status).toBe(422);
      expect(res.body.error.message).toMatch(/not due until/);

      const boots = await write(w.agents.sectionRep, 'post', URL).send({
        ...body(),
        requestType: 'annual',
        items: [{ ppeItemId: w.ppe.boots.id, quantity: 1, size: '8' }],
      });
      expect(boots.status).toBe(201);
    } finally {
      await alloc.destroy();
    }
  });

  it('hides employees outside the caller scope (404) and forbids other roles (403)', async () => {
    expect((await write(w.agents.sectionRep, 'post', URL).send({ ...body(), employeeId: w.employees.empA2.id })).status).toBe(404);
    expect((await write(w.agents.sectionRep, 'post', URL).send({ ...body(), employeeId: w.employees.empB.id })).status).toBe(404);
    for (const agent of [w.agents.hod, w.agents.deptRep, w.agents.sheq, w.agents.stores]) {
      expect((await write(agent, 'post', URL).send(body())).status).toBe(403);
    }
  });

  it('refuses an inactive employee', async () => {
    await w.employees.empA1b.update({ isActive: false });
    try {
      const res = await write(w.agents.sectionRep, 'post', URL).send({ ...body(), employeeId: w.employees.empA1b.id });
      expect(res.status).toBe(422);
    } finally {
      await w.employees.empA1b.update({ isActive: true });
    }
  });
});

describe('GET /requests', () => {
  let pendingA1: string;
  let hodA2: string;
  let hodB: string;
  let approvedA1: string;
  let rejectedB: string;

  beforeAll(async () => {
    const { empA1, empA2, empB } = w.employees;
    const item = [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }];
    pendingA1 = (await w.insertRequest('pending', empA1, item)).id;
    hodA2 = (await w.insertRequest('hod-review', empA2, item, { sectionRepApprovalDate: new Date(Date.now() - 3 * 86_400_000) })).id;
    hodB = (await w.insertRequest('hod-review', empB, item)).id;
    approvedA1 = (await w.insertRequest('approved', empA1, item, { storesApprovalDate: new Date() })).id;
    rejectedB = (await w.insertRequest('rejected', empB, item, { requestType: 'annual' })).id;
  });

  const inWorld = { pageSize: 100 };

  it('limits a section rep to their own section', async () => {
    const res = await w.agents.sectionRep.get(URL).query(inWorld);
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual(expect.arrayContaining([pendingA1, approvedA1]));
    expect(ids(res)).not.toContain(hodA2);
    expect(ids(res)).not.toContain(hodB);

    const other = await w.agents.sectionRepA2.get(URL).query(inWorld);
    expect(ids(other)).toContain(hodA2);
    expect(ids(other)).not.toContain(pendingA1);
  });

  it('limits HODs and department reps to their department, and filters never widen scope', async () => {
    const hod = await w.agents.hod.get(URL).query(inWorld);
    expect(ids(hod)).toEqual(expect.arrayContaining([pendingA1, hodA2, approvedA1]));
    expect(ids(hod)).not.toContain(hodB);

    const dept = await w.agents.deptRep.get(URL).query(inWorld);
    expect(ids(dept)).toContain(hodA2);
    expect(ids(dept)).not.toContain(hodB);

    const widened = await w.agents.hodB.get(URL).query({ ...inWorld, departmentId: w.a.department.id });
    expect(widened.body.data).toEqual([]);
  });

  it('shows the whole mine to stores, SHEQ and admin, narrowed by filters', async () => {
    for (const agent of [w.agents.stores, w.agents.sheq, w.agents.admin]) {
      const res = await agent.get(URL).query({ ...inWorld, departmentId: w.b.department.id });
      expect(ids(res).sort()).toEqual([hodB, rejectedB].sort());
    }
    const bySection = await w.agents.admin.get(URL).query({ ...inWorld, sectionId: w.a.section2.id });
    expect(ids(bySection)).toEqual([hodA2]);
    const byType = await w.agents.admin.get(URL).query({ ...inWorld, departmentId: w.b.department.id, type: 'annual' });
    expect(ids(byType)).toEqual([rejectedB]);
    const byStatus = await w.agents.admin.get(URL).query({ ...inWorld, departmentId: w.b.department.id, status: 'hod-review' });
    expect(ids(byStatus)).toEqual([hodB]);
  });

  it('returns list DTOs with waiting days and allowed actions', async () => {
    const res = await w.agents.hod.get(URL).query({ ...inWorld, sectionId: w.a.section2.id });
    expect(res.body.data[0]).toMatchObject({
      id: hodA2,
      status: 'hod-review',
      statusLabel: 'Awaiting HOD',
      waitingDays: 3,
      itemCount: 1,
      totalQuantity: 1,
      allowedActions: ['approve', 'reject'],
      employee: { id: w.employees.empA2.id, worksNumber: w.employees.empA2.worksNumber },
      department: { id: w.a.department.id },
    });
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 100 });
  });

  it('serves the tab views and matching counts', async () => {
    const q = { departmentId: w.a.department.id };
    const mine = await w.agents.hod.get(URL).query({ ...inWorld, ...q, view: 'mine' });
    expect(mine.body.data.every((r: { status: string }) => r.status === 'hod-review')).toBe(true);
    expect(ids(mine)).toContain(hodA2);

    const ready = await w.agents.stores.get(URL).query({ ...inWorld, ...q, view: 'ready' });
    expect(ids(ready)).toEqual([approvedA1]);
    const storesMine = await w.agents.stores.get(URL).query({ ...inWorld, ...q, view: 'mine' });
    expect(ids(storesMine)).toContain(approvedA1);

    const rejected = await w.agents.admin.get(URL).query({ ...inWorld, departmentId: w.b.department.id, view: 'rejected' });
    expect(ids(rejected)).toEqual([rejectedB]);

    const counts = await w.agents.hod.get(`${URL}/counts`).query(q);
    expect(counts.status).toBe(200);
    for (const view of ['mine', 'all', 'approval', 'ready', 'fulfilled', 'rejected']) {
      const list = await w.agents.hod.get(URL).query({ ...q, view, pageSize: 1 });
      expect(counts.body.data[view]).toBe(list.body.meta.total);
    }
    expect(counts.body.data.ready).toBe(1);
  });

  it('searches by request number and employee', async () => {
    const number = `REQ-${hodB.slice(0, 8).toUpperCase()}`;
    const byNumber = await w.agents.admin.get(URL).query({ q: number });
    expect(ids(byNumber)).toContain(hodB);
    const byWorks = await w.agents.admin.get(URL).query({ q: w.employees.empB.worksNumber, ...inWorld });
    expect(ids(byWorks).sort()).toEqual([hodB, rejectedB].sort());
    const byName = await w.agents.admin.get(URL).query({ q: `Test ${w.employees.empB.lastName}`, ...inWorld });
    expect(ids(byName)).toContain(hodB);
  });

  it('sorts and pages', async () => {
    const res = await w.agents.admin.get(URL).query({ departmentId: w.b.department.id, sort: 'status', order: 'asc', pageSize: 1 });
    expect(res.body.meta).toMatchObject({ total: 2, pageCount: 2 });
    expect(res.body.data[0].status).toBe('hod-review');
  });

  it('rejects unknown views, sorts and filters (422)', async () => {
    expect((await w.agents.admin.get(URL).query({ view: 'everything' })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ sort: 'rejectionReason' })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ status: 'lost' })).status).toBe(422);
    expect((await w.agents.admin.get(URL).query({ departmentId: 'x' })).status).toBe(422);
  });
});

describe('GET /requests/:id', () => {
  it('returns 404 out of scope and 422 for a bad id', async () => {
    const r = await w.insertRequest('hod-review', w.employees.empB, [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }]);
    expect((await w.agents.hod.get(`${URL}/${r.id}`)).status).toBe(404);
    expect((await w.agents.sectionRep.get(`${URL}/${r.id}`)).status).toBe(404);
    expect((await w.agents.hodB.get(`${URL}/${r.id}`)).status).toBe(200);
    expect((await w.agents.stores.get(`${URL}/${r.id}`)).body.data.allowedActions).toEqual([]);
    expect((await w.agents.hodB.get(`${URL}/not-a-uuid`)).status).toBe(422);
  });
});

describe('lookups for the new request form', () => {
  it('searches employees within scope', async () => {
    const mine = await w.agents.sectionRep.get(`${URL}/employees`).query({ q: w.fx.tag });
    expect(mine.status).toBe(200);
    const found = mine.body.data.map((e: { id: string }) => e.id);
    expect(found).toEqual(expect.arrayContaining([w.employees.empA1.id, w.employees.empA1b.id]));
    expect(found).not.toContain(w.employees.empA2.id);
    expect(found).not.toContain(w.employees.empB.id);
    expect((await w.agents.hod.get(`${URL}/employees`)).status).toBe(403);
  });

  it('returns eligibility with matrix flags, due dates and sizes', async () => {
    const res = await w.agents.sectionRep.get(`${URL}/employees/${w.employees.empA1.id}/eligibility`);
    expect(res.status).toBe(200);
    const byId = new Map(res.body.data.items.map((i: { ppeItemId: string }) => [i.ppeItemId, i]));
    expect(byId.get(w.ppe.gloves.id)).toMatchObject({ inMatrix: true, matrixSource: 'section', quantityRequired: 2, isDue: true });
    expect(byId.get(w.ppe.boots.id)).toMatchObject({ inMatrix: true, hasSizeVariants: true, sizes: ['8', '9', '10'] });
    expect(byId.get(w.ppe.helmet.id)).toMatchObject({ inMatrix: false });

    expect((await w.agents.sectionRep.get(`${URL}/employees/${w.employees.empB.id}/eligibility`)).status).toBe(404);
    expect((await w.agents.stores.get(`${URL}/employees/${w.employees.empA1.id}/eligibility`)).status).toBe(403);
  });
});
