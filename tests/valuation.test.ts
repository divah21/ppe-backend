import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { allocate, daysFromNow, pricedItem } from './finance.fixtures';
import { app, createFixtures, signIn } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;

const fx = createFixtures();
let admin: Agent, hod: Agent, rep: Agent, stores: Agent, sheq: Agent;
let mine: Awaited<ReturnType<typeof fx.org>>;
let other: Awaited<ReturnType<typeof fx.org>>;
let gloves: Awaited<ReturnType<typeof pricedItem>>;
let boots: Awaited<ReturnType<typeof pricedItem>>;

const BASE = '/api/v2/valuation';
const from = '2031-01-01';
const to = '2031-12-31';

beforeAll(async () => {
  await prepareV2();
  mine = await fx.org();
  other = await fx.org();
  const eMine = await fx.employee(mine.section.id);
  const eOther = await fx.employee(other.section.id);
  // Forecast rows get their own employees: a later issue of the same item would supersede them
  const dueMine = await fx.employee(mine.section.id);
  const dueMine2 = await fx.employee(mine.section.id);
  const dueOther = await fx.employee(other.section.id);
  // Stock: 100 x 10 = 1000 and 4 x 2.5 = 10 (below its minimum of 5)
  gloves = await pricedItem(fx, { price: 10, quantity: 100 });
  boots = await pricedItem(fx, { price: 2.5, quantity: 4, minLevel: 5 });

  await allocate(fx, { employeeId: eMine.id, ppeItemId: gloves.item.id, quantity: 3, totalCost: 45, issueDate: new Date('2031-02-10T10:00:00Z'), status: 'expired' });
  await allocate(fx, { employeeId: eMine.id, ppeItemId: boots.item.id, quantity: 2, issueDate: new Date('2031-03-10T10:00:00Z'), status: 'expired' });
  await allocate(fx, { employeeId: eOther.id, ppeItemId: gloves.item.id, quantity: 1, totalCost: 7, issueDate: new Date('2031-03-20T10:00:00Z'), status: 'expired' });

  // Forecast (renewal dates): 5 boots due in 10 days and 2 in 100 days for mine; 1 pair of gloves due in 20 days elsewhere
  await allocate(fx, { employeeId: dueMine.id, ppeItemId: boots.item.id, quantity: 5, totalCost: 12.5, issueDate: daysFromNow(-300), nextRenewalDate: daysFromNow(10) });
  await allocate(fx, { employeeId: dueMine2.id, ppeItemId: boots.item.id, quantity: 2, totalCost: 5, issueDate: daysFromNow(-200), nextRenewalDate: daysFromNow(100) });
  await allocate(fx, { employeeId: dueOther.id, ppeItemId: gloves.item.id, quantity: 1, totalCost: 10, issueDate: daysFromNow(-300), nextRenewalDate: daysFromNow(20) });

  const agents = await Promise.all([
    fx.user('admin').then((u) => signIn(u.username)),
    fx.user('hod', { departmentId: mine.department.id }).then((u) => signIn(u.username)),
    fx.user('department-rep', { departmentId: mine.department.id }).then((u) => signIn(u.username)),
    fx.user('stores').then((u) => signIn(u.username)),
    fx.user('sheq').then((u) => signIn(u.username)),
  ]);
  [admin, hod, rep, stores, sheq] = agents as [Agent, Agent, Agent, Agent, Agent];
});
afterAll(() => fx.cleanup());

describe('stock valuation', () => {
  it('totals live stock value with category and account breakdowns', async () => {
    const res = await sheq.get(`${BASE}/stock/summary`).query({ category: fx.tag });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalValue: 1010,
      totalQuantity: 104,
      lineCount: 2,
      itemCount: 2,
      lowStockCount: 1,
      outOfStockCount: 0,
      byCategory: [{ name: fx.tag, value: 1010, quantity: 104, lineCount: 2 }],
      byStockAccount: [{ name: fx.tag, value: 1010 }],
    });
  });

  it('pages stock lines by value', async () => {
    const res = await stores.get(`${BASE}/stock`).query({ stockAccount: fx.tag, pageSize: 1 });
    expect(res.body.meta).toMatchObject({ total: 2, pageCount: 2 });
    expect(res.body.data[0]).toMatchObject({ ppeItemId: gloves.item.id, quantity: 100, unitPrice: 10, value: 1000 });

    const byName = await admin.get(`${BASE}/stock`).query({ category: fx.tag, sort: 'quantity', order: 'asc' });
    expect(byName.body.data.map((r: { ppeItemId: string }) => r.ppeItemId)).toEqual([boots.item.id, gloves.item.id]);
  });

  it('lists low stock with the deficit and reorder value', async () => {
    const res = await admin.get(`${BASE}/low-stock`).query({ category: fx.tag });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ ppeItemId: boots.item.id, deficit: 1, reorderPoint: 5, reorderValue: 2.5 });
  });

  it('offers filter values', async () => {
    const res = await admin.get(`${BASE}/stock/filters`);
    expect(res.body.data.categories).toContain(fx.tag);
    expect(res.body.data.stockAccounts).toContain(fx.tag);
  });

  it('is limited to admin, SHEQ and stores, and validates input', async () => {
    expect((await hod.get(`${BASE}/stock/summary`)).status).toBe(403);
    expect((await rep.get(`${BASE}/stock`)).status).toBe(403);
    expect((await request(app).get(`${BASE}/stock`)).status).toBe(401);
    expect((await admin.get(`${BASE}/stock`).query({ itemType: 'FOOD' })).status).toBe(422);
    expect((await admin.get(`${BASE}/stock`).query({ sort: 'cost' })).status).toBe(422);
  });
});

describe('actual spending', () => {
  it('groups spend by department with estimated costs from stock prices', async () => {
    const res = await admin.get(`${BASE}/spending`).query({ from, to, groupBy: 'department', departmentId: mine.department.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({ key: mine.department.id, label: mine.department.name, spent: 50, allocationCount: 2, employeeCount: 1, quantity: 5 }),
    ]);
    const totals = await admin.get(`${BASE}/spending/totals`).query({ from, to, departmentId: mine.department.id });
    expect(totals.body.data).toMatchObject({ spent: 50, allocationCount: 2, estimatedCount: 1, avgPerAllocation: 25 });
  });

  it('groups by item and by month', async () => {
    const items = await stores.get(`${BASE}/spending`).query({ from, to, groupBy: 'item', departmentId: mine.department.id });
    expect(items.body.data.map((r: { key: string; spent: number }) => [r.key, r.spent])).toEqual([
      [gloves.item.id, 45],
      [boots.item.id, 5],
    ]);
    const months = await stores.get(`${BASE}/spending`).query({ from, to, groupBy: 'month', departmentId: mine.department.id });
    expect(months.body.data.map((r: { key: string }) => r.key)).toEqual(['2031-02', '2031-03']);
  });

  it('keeps a HOD to their own department', async () => {
    const res = await hod.get(`${BASE}/spending/totals`).query({ from, to });
    expect(res.body.data.spent).toBe(50);
    const widened = await hod.get(`${BASE}/spending/totals`).query({ from, to, departmentId: other.department.id });
    expect(widened.body.data.spent).toBe(0);
    const list = await hod.get(`${BASE}/spending`).query({ from, to, groupBy: 'section', sectionId: other.section.id });
    expect(list.body.data).toEqual([]);
  });

  it('enforces roles and validates ranges', async () => {
    expect((await sheq.get(`${BASE}/spending`)).status).toBe(403);
    expect((await rep.get(`${BASE}/spending/totals`)).status).toBe(403);
    const bad = await admin.get(`${BASE}/spending`).query({ from: to, to: from });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details.fieldErrors.to).toBeDefined();
    expect((await admin.get(`${BASE}/spending`).query({ groupBy: 'colour' })).status).toBe(422);
  });
});

describe('forecast', () => {
  it('forecasts replacements due against stock on hand', async () => {
    const res = await admin.get(`${BASE}/forecast`).query({ departmentId: mine.department.id, q: fx.tag });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        ppeItemId: boots.item.id,
        required: 5,
        dueIn30: 5,
        currentStock: 4,
        shortage: 1,
        avgMonthly: 2,
        shortageValue: 2.5,
      }),
    ]);
    const longer = await admin.get(`${BASE}/forecast`).query({ departmentId: mine.department.id, q: fx.tag, days: 120 });
    expect(longer.body.data[0]).toMatchObject({ required: 7, dueIn91To180: 2, shortage: 3 });
  });

  it('summarises the forecast with buckets for the chosen horizon', async () => {
    const res = await hod.get(`${BASE}/forecast/summary`).query({ days: 60 });
    expect(res.body.data).toMatchObject({ days: 60, totalRequired: 5, totalShortage: 1, itemsWithShortage: 1 });
    expect(res.body.data.buckets.map((b: { label: string }) => b.label)).toEqual(['0–30 days', '31–60 days']);
  });

  it('keeps a HOD to their own department', async () => {
    const res = await hod.get(`${BASE}/forecast`).query({ q: fx.tag });
    expect(res.body.data.map((r: { ppeItemId: string }) => r.ppeItemId)).toEqual([boots.item.id]);
    const widened = await hod.get(`${BASE}/forecast`).query({ q: fx.tag, departmentId: other.department.id });
    expect(widened.body.data).toEqual([]);
  });

  it('enforces roles and validates the horizon', async () => {
    expect((await sheq.get(`${BASE}/forecast`)).status).toBe(403);
    expect((await admin.get(`${BASE}/forecast`).query({ days: 400 })).status).toBe(422);
    expect((await request(app).get(`${BASE}/forecast`)).status).toBe(401);
  });
});

describe('demand analytics', () => {
  it('predicts monthly demand and a recommended stock level', async () => {
    const res = await stores.get(`${BASE}/demand`).query({ months: 12, q: fx.tag, sort: 'issued', order: 'desc' });
    expect(res.status).toBe(200);
    const bootsRow = res.body.data.find((r: { ppeItemId: string }) => r.ppeItemId === boots.item.id);
    expect(bootsRow).toMatchObject({ quantityIssued: 9, allocationCount: 3, currentStock: 4, stockStatus: 'adequate' });
  });

  it('is for stores and admin only', async () => {
    expect((await hod.get(`${BASE}/demand`)).status).toBe(403);
    expect((await admin.get(`${BASE}/demand`).query({ months: 0 })).status).toBe(422);
  });
});
