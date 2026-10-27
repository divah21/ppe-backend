import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { allocate, freeFiscalYear, pricedItem } from './finance.fixtures';
import { app, createFixtures, signIn, write } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;

const fx = createFixtures();
let year: number;
let admin: Agent, hod: Agent, rep: Agent, sectionRep: Agent, stores: Agent, sheq: Agent;
let mine: Awaited<ReturnType<typeof fx.org>>;
let other: Awaited<ReturnType<typeof fx.org>>;
let companyId: string;
let mineBudgetId: string;
let otherBudgetId: string;

const BASE = '/api/v2/budgets';

beforeAll(async () => {
  await prepareV2();
  year = await freeFiscalYear();
  mine = await fx.org();
  other = await fx.org();
  const eMine = await fx.employee(mine.section.id, { isActive: true });
  const eOther = await fx.employee(other.section.id, { isActive: true });
  const { item } = await pricedItem(fx, { price: 10, quantity: 100 });

  // Mine: 45 recorded + 2 x 10 estimated from the stock price = 65; other: 7
  await allocate(fx, { employeeId: eMine.id, ppeItemId: item.id, quantity: 3, totalCost: 45, issueDate: new Date(`${year}-02-10T10:00:00Z`) });
  await allocate(fx, { employeeId: eMine.id, ppeItemId: item.id, quantity: 2, issueDate: new Date(`${year}-05-10T10:00:00Z`) });
  await allocate(fx, { employeeId: eOther.id, ppeItemId: item.id, quantity: 1, totalCost: 7, issueDate: new Date(`${year}-03-01T10:00:00Z`) });
  await allocate(fx, { employeeId: eMine.id, ppeItemId: item.id, quantity: 9, totalCost: 900, issueDate: new Date(`${year + 1}-01-02T10:00:00Z`) });
  await fx.make('SectionPPEMatrix', { sectionId: mine.section.id, ppeItemId: item.id, quantityRequired: 2, isActive: true });

  const agents = await Promise.all([
    fx.user('admin').then((u) => signIn(u.username)),
    fx.user('hod', { departmentId: mine.department.id }).then((u) => signIn(u.username)),
    fx.user('department-rep', { departmentId: mine.department.id }).then((u) => signIn(u.username)),
    fx.user('section-rep', { sectionId: mine.section.id }).then((u) => signIn(u.username)),
    fx.user('stores').then((u) => signIn(u.username)),
    fx.user('sheq').then((u) => signIn(u.username)),
  ]);
  [admin, hod, rep, sectionRep, stores, sheq] = agents as [Agent, Agent, Agent, Agent, Agent, Agent];
});
afterAll(() => fx.cleanup());

describe('company budgets', () => {
  it('lets an admin create one per fiscal year', async () => {
    const res = await write(admin, 'post', `${BASE}/company`).send({ fiscalYear: year, totalBudget: 1000, notes: 'Approved' });
    expect(res.status).toBe(201);
    companyId = fx.track('CompanyBudget', res.body.data.id);
    expect(res.body.data).toMatchObject({
      fiscalYear: year,
      totalBudget: 1000,
      status: 'active',
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      allocatedToDepartments: 0,
      spent: 72,
      utilisationPercent: 7.2,
    });

    const dup = await write(admin, 'post', `${BASE}/company`).send({ fiscalYear: year, totalBudget: 5 });
    expect(dup.status).toBe(409);
  });

  it('validates input', async () => {
    const res = await write(admin, 'post', `${BASE}/company`).send({ fiscalYear: 1999, totalBudget: 0 });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details.fieldErrors)).toEqual(expect.arrayContaining(['fiscalYear', 'totalBudget']));
    expect((await write(admin, 'put', `${BASE}/company/${companyId}`).send({})).status).toBe(422);
  });

  it('is read by whole-mine roles only and written by admins only', async () => {
    expect((await sheq.get(`${BASE}/company/${companyId}`)).status).toBe(200);
    expect((await stores.get(`${BASE}/company`).query({ pageSize: 5 })).status).toBe(200);
    expect((await hod.get(`${BASE}/company/${companyId}`)).status).toBe(403);
    expect((await write(stores, 'post', `${BASE}/company`).send({ fiscalYear: year, totalBudget: 1 })).status).toBe(403);
    expect((await request(app).get(`${BASE}/company`)).status).toBe(401);
  });
});

describe('department budgets', () => {
  it('creates budgets, links them to the company budget and computes spend', async () => {
    const a = await write(admin, 'post', BASE).send({ departmentId: mine.department.id, fiscalYear: year, allocatedAmount: 300 });
    expect(a.status).toBe(201);
    mineBudgetId = fx.track('Budget', a.body.data.id);
    expect(a.body.data).toMatchObject({
      companyBudgetId: companyId,
      periodLabel: `FY ${year}`,
      allocatedAmount: 300,
      spent: 65,
      remaining: 235,
      utilisationPercent: 21.67,
      allocationCount: 2,
      department: { id: mine.department.id },
    });

    const b = await write(admin, 'post', BASE).send({ departmentId: other.department.id, fiscalYear: year, allocatedAmount: 200 });
    otherBudgetId = fx.track('Budget', b.body.data.id);
    expect(b.body.data.spent).toBe(7);

    const q2 = await write(admin, 'post', BASE).send({
      departmentId: mine.department.id,
      fiscalYear: year,
      period: 'quarterly',
      quarter: 2,
      allocatedAmount: 100,
    });
    expect(q2.status).toBe(201);
    fx.track('Budget', q2.body.data.id);
    expect(q2.body.data).toMatchObject({ periodLabel: `Q2 ${year}`, startDate: `${year}-04-01`, endDate: `${year}-06-30`, spent: 20 });

    const company = await admin.get(`${BASE}/company/${companyId}`);
    expect(company.body.data).toMatchObject({ allocatedToDepartments: 600, unallocated: 400, departmentBudgetCount: 3 });
  });

  it('refuses to allocate more than the company budget has left', async () => {
    const res = await write(admin, 'post', BASE).send({
      departmentId: mine.department.id,
      fiscalYear: year,
      period: 'monthly',
      month: 1,
      allocatedAmount: 400.01,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/Only 400\.00/);
  });

  it('never over-allocates when two admins allocate at once', async () => {
    const send = (quarter: number) =>
      write(admin, 'post', BASE).send({ departmentId: mine.department.id, fiscalYear: year, period: 'quarterly', quarter, allocatedAmount: 300 });
    const results = await Promise.all([send(3), send(4)]);
    const created = results.filter((r) => r.status === 201);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    fx.track('Budget', created[0]!.body.data.id);
    await write(admin, 'delete', `${BASE}/${created[0]!.body.data.id}`);
    const stored = await models.CompanyBudget.findByPk(companyId);
    expect(Number(stored!.allocatedToDepartments)).toBe(600);
  });

  it('rejects duplicates and invalid periods', async () => {
    const dup = await write(admin, 'post', BASE).send({ departmentId: mine.department.id, fiscalYear: year, allocatedAmount: 1 });
    expect(dup.status).toBe(409);

    const noQuarter = await write(admin, 'post', BASE).send({ departmentId: mine.department.id, fiscalYear: year, period: 'quarterly', allocatedAmount: 1 });
    expect(noQuarter.status).toBe(422);
    expect(noQuarter.body.error.details.fieldErrors.quarter).toBeDefined();

    const wrongSection = await write(admin, 'post', BASE).send({
      departmentId: mine.department.id,
      sectionId: other.section.id,
      fiscalYear: year,
      allocatedAmount: 1,
    });
    expect(wrongSection.status).toBe(422);
    expect(wrongSection.body.error.details.fieldErrors.sectionId).toBeDefined();
  });

  it('scopes reads to the HOD and department rep department', async () => {
    for (const agent of [hod, rep]) {
      const list = await agent.get(BASE).query({ fiscalYear: year });
      expect(list.status).toBe(200);
      expect(new Set(list.body.data.map((b: { department: { id: string } }) => b.department.id))).toEqual(new Set([mine.department.id]));
      expect((await agent.get(BASE).query({ fiscalYear: year, departmentId: other.department.id })).body.data).toEqual([]);
      expect((await agent.get(`${BASE}/${otherBudgetId}`)).status).toBe(404);
      expect((await agent.get(`${BASE}/${mineBudgetId}`)).status).toBe(200);
    }
    const all = await stores.get(BASE).query({ fiscalYear: year, sort: 'allocatedAmount', order: 'desc' });
    expect(all.body.meta.total).toBe(3);
    expect(all.body.data[0].allocatedAmount).toBe(300);
  });

  it('keeps section reps out and requires a session', async () => {
    expect((await sectionRep.get(BASE)).status).toBe(403);
    expect((await sectionRep.get(`${BASE}/summary`)).status).toBe(403);
    expect((await request(app).get(BASE)).status).toBe(401);
    expect((await admin.get(BASE).query({ sort: 'spent' })).status).toBe(422);
    expect((await admin.get(`${BASE}/not-a-uuid`)).status).toBe(422);
  });

  it('updates the allocation within what the company budget has left', async () => {
    const tooMuch = await write(admin, 'put', `${BASE}/${mineBudgetId}`).send({ allocatedAmount: 700.01 });
    expect(tooMuch.status).toBe(409);

    const ok = await write(admin, 'put', `${BASE}/${mineBudgetId}`).send({ allocatedAmount: 700, notes: 'Top-up' });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ allocatedAmount: 700, notes: 'Top-up', utilisationPercent: 9.29 });
    expect((await admin.get(`${BASE}/company/${companyId}`)).body.data.unallocated).toBe(0);

    const lower = await write(admin, 'put', `${BASE}/company/${companyId}`).send({ totalBudget: 999 });
    expect(lower.status).toBe(409);

    await write(admin, 'put', `${BASE}/${mineBudgetId}`).send({ allocatedAmount: 300 });
    expect((await write(hod, 'put', `${BASE}/${mineBudgetId}`).send({ status: 'expired' })).status).toBe(403);
    expect((await write(admin, 'put', `${BASE}/${mineBudgetId}`).send({ allocatedAmount: -1 })).status).toBe(422);
  });
});

describe('summary and suggestions', () => {
  it('summarises the year for the whole mine', async () => {
    const res = await admin.get(`${BASE}/summary`).query({ fiscalYear: year });
    expect(res.status).toBe(200);
    expect(res.body.data.company).toMatchObject({ id: companyId, spent: 72 });
    const mineRow = res.body.data.departments.find((d: { departmentId: string }) => d.departmentId === mine.department.id);
    expect(mineRow).toMatchObject({ allocated: 400, spent: 65, budgetCount: 2 });
  });

  it('shows a HOD only their department and no company figures', async () => {
    const res = await hod.get(`${BASE}/summary`).query({ fiscalYear: year });
    expect(res.body.data.company).toBeNull();
    expect(res.body.data.departments.map((d: { departmentId: string }) => d.departmentId)).toEqual([mine.department.id]);
    expect(res.body.data.totals).toMatchObject({ allocated: 400, spent: 65 });
  });

  it('suggests a budget from the PPE matrix', async () => {
    const res = await hod.get(`${BASE}/suggested`).query({ fiscalYear: year });
    expect(res.status).toBe(200);
    expect(res.body.data.departments).toHaveLength(1);
    expect(res.body.data.departments[0]).toMatchObject({
      departmentId: mine.department.id,
      employeeCount: 1,
      employeesWithMatrix: 1,
      suggestedBudget: 20,
      allocated: 400,
    });
    expect((await admin.get(`${BASE}/suggested`).query({ fiscalYear: 'next' })).status).toBe(422);
  });
});

describe('deletes', () => {
  it('returns a deleted allocation to the company budget', async () => {
    expect((await write(hod, 'delete', `${BASE}/${otherBudgetId}`)).status).toBe(403);
    expect((await write(admin, 'delete', `${BASE}/${otherBudgetId}`)).status).toBe(204);
    expect((await admin.get(`${BASE}/company/${companyId}`)).body.data.allocatedToDepartments).toBe(400);
    expect((await admin.get(`${BASE}/${otherBudgetId}`)).status).toBe(404);
  });

  it('keeps a company budget that already has spend', async () => {
    const res = await write(admin, 'delete', `${BASE}/company/${companyId}`);
    expect(res.status).toBe(409);
  });

  it('deletes an unused company budget with its department budgets', async () => {
    const empty = await write(admin, 'post', `${BASE}/company`).send({ fiscalYear: year - 1, totalBudget: 50 });
    if (empty.status !== 201) return; // the neighbouring year is taken by real data
    fx.track('CompanyBudget', empty.body.data.id);
    const dept = await write(admin, 'post', BASE).send({ departmentId: other.department.id, fiscalYear: empty.body.data.fiscalYear, allocatedAmount: 50 });
    fx.track('Budget', dept.body.data.id);
    expect((await write(admin, 'delete', `${BASE}/company/${empty.body.data.id}`)).status).toBe(204);
    expect(await models.Budget.count({ where: { id: dept.body.data.id } })).toBe(0);
  });
});
