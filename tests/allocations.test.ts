import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { allocationFixtures, monthsAgo } from './allocations.fixtures';
import { app, createFixtures, signIn } from './helpers';

const fx = createFixtures();
const af = allocationFixtures(fx);
type Agent = Awaited<ReturnType<typeof signIn>>;

let admin: Agent, stores: Agent, sheq: Agent, hod: Agent, deptRep: Agent, sectionRep: Agent, orphanRep: Agent;
let a1: { id: string }, a2: { id: string }, a3: { id: string }, a4: { id: string };
let empA1: { id: string }, empA2: { id: string }, empB: { id: string };
let deptA: { id: string }, deptB: { id: string }, secA1: { id: string }, secA2: { id: string };
let item1: { id: string }, item2: { id: string };

const ids = (res: request.Response) => (res.body.data as Array<{ id: string }>).map((r) => r.id).sort();
const sorted = (...rows: Array<{ id: string }>) => rows.map((r) => r.id).sort();

beforeAll(async () => {
  await prepareV2();
  const orgA = await fx.org();
  const orgB = await fx.org();
  deptA = orgA.department;
  deptB = orgB.department;
  secA1 = orgA.section;
  secA2 = await fx.make('Section', { name: `${fx.tag}-section-a2`, departmentId: deptA.id });

  empA1 = await fx.employee(secA1.id);
  empA2 = await fx.employee(secA2.id);
  empB = await fx.employee(orgB.section.id);

  item1 = await af.item({ replacementFrequency: 12 });
  item2 = await af.item({ replacementFrequency: 6, hasSizeVariants: true });

  // Due in about two weeks, overdue by a month, freshly issued, and already returned
  a1 = await af.allocation(empA1.id, item1.id, { issueDate: monthsAgo(11, 16), quantity: 2 });
  a2 = await af.allocation(empA2.id, item2.id, { issueDate: monthsAgo(7), size: 'L' });
  a3 = await af.allocation(empB.id, item1.id, { issueDate: new Date() });
  a4 = await af.allocation(empA1.id, item2.id, { issueDate: monthsAgo(3), status: 'returned' });

  const sign = async (role: string, opts = {}) => signIn((await fx.user(role, opts)).username);
  admin = await sign('admin');
  stores = await sign('stores');
  sheq = await sign('sheq');
  hod = await sign('hod', { departmentId: deptA.id });
  deptRep = await sign('department-rep', { departmentId: deptA.id });
  sectionRep = await sign('section-rep', { sectionId: secA1.id });
  orphanRep = await sign('section-rep');
});
afterAll(() => fx.cleanup());

describe('GET /api/v2/allocations', () => {
  it('lists the whole mine for stores, admin and SHEQ', async () => {
    for (const agent of [admin, stores, sheq]) {
      const res = await agent.get('/api/v2/allocations').query({ q: fx.tag });
      expect(res.status).toBe(200);
      expect(ids(res)).toEqual(sorted(a1, a2, a3, a4));
      expect(res.body.meta).toMatchObject({ page: 1, pageSize: 25, total: 4, pageCount: 1 });
    }
  });

  it('returns a complete DTO with server-side actions and a computed due date', async () => {
    const res = await stores.get('/api/v2/allocations').query({ q: fx.tag, employeeId: empA1.id, status: 'active' });
    const [row] = res.body.data;
    expect(row).toMatchObject({
      id: a1.id,
      status: 'active',
      quantity: 2,
      employee: { id: empA1.id, section: { id: secA1.id }, department: { id: deptA.id } },
      item: { id: item1.id },
      allowedActions: ['return', 'renew'],
    });
    expect(row.daysUntilDue).toBeGreaterThan(10);
    expect(row.daysUntilDue).toBeLessThan(20);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);

    const asHod = await hod.get('/api/v2/allocations').query({ employeeId: empA1.id, status: 'active' });
    expect(asHod.body.data[0].allowedActions).toEqual([]);
  });

  it('limits HODs and department reps to their department', async () => {
    for (const agent of [hod, deptRep]) {
      const res = await agent.get('/api/v2/allocations').query({ q: fx.tag });
      expect(ids(res)).toEqual(sorted(a1, a2, a4));
      expect((await agent.get(`/api/v2/allocations/${a3.id}`)).status).toBe(404);
    }
  });

  it('limits section reps to their section, and a rep with no section to nothing', async () => {
    expect(ids(await sectionRep.get('/api/v2/allocations').query({ q: fx.tag }))).toEqual(sorted(a1, a4));
    expect((await sectionRep.get(`/api/v2/allocations/${a2.id}`)).status).toBe(404);
    expect((await orphanRep.get('/api/v2/allocations').query({ q: fx.tag })).body.meta.total).toBe(0);
  });

  it('never widens scope through filters', async () => {
    const res = await hod.get('/api/v2/allocations').query({ departmentId: deptB.id });
    expect(res.body.meta.total).toBe(0);
    const bySection = await sectionRep.get('/api/v2/allocations').query({ sectionId: secA2.id });
    expect(bySection.body.meta.total).toBe(0);
  });

  it('filters by status, item, department, section and issue date', async () => {
    const q = (extra: Record<string, string>) => admin.get('/api/v2/allocations').query({ q: fx.tag, ...extra });
    expect(ids(await q({ status: 'returned' }))).toEqual(sorted(a4));
    expect(ids(await q({ ppeItemId: item2.id }))).toEqual(sorted(a2, a4));
    expect(ids(await q({ departmentId: deptB.id }))).toEqual(sorted(a3));
    expect(ids(await q({ sectionId: secA2.id }))).toEqual(sorted(a2));
    // The API reads dates as local calendar days; a UTC date is yesterday shortly after midnight in Harare
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(ids(await q({ from: monthsAgo(4).toISOString().slice(0, 10), to: today }))).toEqual(sorted(a3, a4));
  });

  it('searches by employee name and item code, and sorts and pages', async () => {
    const byItem = await admin.get('/api/v2/allocations').query({ q: `${fx.tag}-I2` });
    expect(ids(byItem)).toEqual(sorted(a2, a4));

    const due = await admin.get('/api/v2/allocations').query({ q: fx.tag, sort: 'dueDate', order: 'asc', pageSize: 2 });
    expect(due.body.data.map((r: { id: string }) => r.id)).toEqual([a2.id, a1.id]);
    expect(due.body.meta).toMatchObject({ total: 4, pageCount: 2 });

    for (const sort of ['issueDate', 'status', 'quantity', 'employee', 'item']) {
      expect((await admin.get('/api/v2/allocations').query({ q: fx.tag, sort })).status).toBe(200);
    }
  });

  it('rejects invalid filters with 422', async () => {
    for (const query of [
      { status: 'lost' },
      { sort: 'password' },
      { employeeId: 'nope' },
      { from: '2025-13-40' },
      { to: '2025-02-31' },
      { from: '2025-06-01', to: '2025-01-01' },
      { pageSize: 5000 },
    ]) {
      expect((await admin.get('/api/v2/allocations').query(query)).status).toBe(422);
    }
    expect((await admin.get('/api/v2/allocations/not-a-uuid')).status).toBe(422);
  });

  it('requires a session', async () => {
    expect((await request(app).get('/api/v2/allocations')).status).toBe(401);
    expect((await request(app).get(`/api/v2/allocations/${a1.id}`)).status).toBe(401);
  });
});

describe('GET /api/v2/allocations/renewals-due', () => {
  it('groups due and overdue items by employee with a summary', async () => {
    const res = await stores.get('/api/v2/allocations/renewals-due').query({ q: fx.tag, days: 30 });
    expect(res.status).toBe(200);
    const rows = res.body.data as Array<{ employee: { id: string }; items: Array<{ id: string }>; overdueCount: number; daysUntilDue: number }>;
    expect(rows.map((r) => r.employee.id)).toEqual([empA2.id, empA1.id]);
    expect(rows[0]).toMatchObject({ itemCount: 1, overdueCount: 1 });
    expect(rows[0]!.daysUntilDue).toBeLessThan(0);
    expect(rows[1]!.items.map((i) => i.id)).toEqual([a1.id]);
    expect(res.body.meta).toMatchObject({ page: 1, total: 2, summary: { days: 30, employees: 2, items: 2, overdue: 1 } });
  });

  it('can leave out overdue items and narrow the window', async () => {
    const upcoming = await stores.get('/api/v2/allocations/renewals-due').query({ q: fx.tag, includeOverdue: 'false' });
    expect(upcoming.body.data.map((r: { employee: { id: string } }) => r.employee.id)).toEqual([empA1.id]);
    const week = await stores.get('/api/v2/allocations/renewals-due').query({ q: fx.tag, days: 7, includeOverdue: 'false' });
    expect(week.body.meta.total).toBe(0);
  });

  it('pages and sorts by employee', async () => {
    const res = await stores
      .get('/api/v2/allocations/renewals-due')
      .query({ q: fx.tag, pageSize: 1, page: 2, sort: 'items', order: 'desc' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 2, total: 2, pageCount: 2 });
    expect((await stores.get('/api/v2/allocations/renewals-due').query({ sort: 'employee' })).status).toBe(200);
  });

  it('is scoped to the user', async () => {
    const rep = await sectionRep.get('/api/v2/allocations/renewals-due').query({ q: fx.tag });
    expect(rep.body.data.map((r: { employee: { id: string } }) => r.employee.id)).toEqual([empA1.id]);
    const other = await hod.get('/api/v2/allocations/renewals-due').query({ departmentId: deptB.id });
    expect(other.body.meta.total).toBe(0);
  });

  it('validates the window and requires a session', async () => {
    expect((await stores.get('/api/v2/allocations/renewals-due').query({ days: 0 })).status).toBe(422);
    expect((await stores.get('/api/v2/allocations/renewals-due').query({ days: 1000 })).status).toBe(422);
    expect((await stores.get('/api/v2/allocations/renewals-due').query({ includeOverdue: 'maybe' })).status).toBe(422);
    expect((await request(app).get('/api/v2/allocations/renewals-due')).status).toBe(401);
  });
});

describe('GET /api/v2/allocations/employee/:employeeId', () => {
  it('returns the history with the employee and a status summary', async () => {
    const res = await hod.get(`/api/v2/allocations/employee/${empA1.id}`).query({ sort: 'issueDate', order: 'desc' });
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual(sorted(a1, a4));
    expect(res.body.meta).toMatchObject({
      total: 2,
      employee: { id: empA1.id, department: { id: deptA.id } },
      summary: { active: 1, returned: 1, total: 2 },
    });
    const returned = await hod.get(`/api/v2/allocations/employee/${empA1.id}`).query({ status: 'returned' });
    expect(ids(returned)).toEqual(sorted(a4));
  });

  it('hides employees outside the user scope', async () => {
    expect((await hod.get(`/api/v2/allocations/employee/${empB.id}`)).status).toBe(404);
    expect((await sectionRep.get(`/api/v2/allocations/employee/${empA2.id}`)).status).toBe(404);
  });

  it('validates the id and requires a session', async () => {
    expect((await hod.get('/api/v2/allocations/employee/123')).status).toBe(422);
    expect((await request(app).get(`/api/v2/allocations/employee/${empA1.id}`)).status).toBe(401);
  });
});

describe('GET /api/v2/allocations/filter-options', () => {
  it('lists only the sections and departments in scope', async () => {
    const res = await hod.get('/api/v2/allocations/filter-options');
    expect(res.status).toBe(200);
    expect(res.body.data.departments).toEqual([{ id: deptA.id, name: expect.any(String) }]);
    expect(res.body.data.sections.map((s: { id: string }) => s.id).sort()).toEqual(sorted(secA1, secA2));
    expect(res.body.data.items.map((i: { id: string }) => i.id)).toEqual(expect.arrayContaining([item1.id, item2.id]));
  });
});
