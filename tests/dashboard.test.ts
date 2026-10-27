import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sequelize } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { PASSWORD, app, signIn } from './helpers';
import { createInsightsWorld, type InsightsWorld } from './insights.fixtures';

let w: InsightsWorld;
const URL = '/api/v2/dashboard/summary';

beforeAll(async () => {
  await prepareV2();
  w = await createInsightsWorld();
});
afterAll(() => w?.fx.cleanup());

describe('GET /api/v2/dashboard/summary', () => {
  it('gives a HOD the KPIs and series of their department only', async () => {
    const res = await (await w.agent(w.users.hod)).get(URL);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.scope).toEqual({ kind: 'department', id: w.mine.department.id, name: w.mine.department.name });
    expect(d.kpis).toEqual({
      awaitingMyAction: 1,
      openRequests: 2,
      issuedThisPeriod: 2,
      spendThisPeriod: 40,
      lowStock: null,
      renewalsDue: 1,
    });
    expect(d.requestsPerWeek).toHaveLength(8);
    expect(d.requestsPerWeek.at(-1).count).toBe(2);
    expect(d.spendBreakdown).toEqual({ groupBy: 'section', rows: [{ id: w.mine.section.id, name: w.mine.section.name, amount: 40 }] });
    expect(d.lowStock).toBeNull();
    expect(d.renewalsDue).toHaveLength(1);
    expect(d.renewalsDue[0]).toMatchObject({
      allocationId: w.allocations.dueSoon.id,
      employeeId: w.employees.empA.id,
      itemName: w.items.extra.name,
    });
    expect(d.renewalsDue[0].daysLeft).toBeGreaterThan(0);
    expect(d.renewalsDue[0].daysLeft).toBeLessThanOrEqual(30);
  });

  it('counts the stage each role acts on', async () => {
    const sectionRep = (await (await w.agent(w.users.sectionRep)).get(URL)).body.data;
    expect(sectionRep.kpis.awaitingMyAction).toBe(1);
    expect(sectionRep.spendBreakdown).toEqual({ groupBy: 'category', rows: [{ id: null, name: w.category, amount: 40 }] });

    const deptRep = (await (await w.agent(w.users.deptRep)).get(URL)).body.data;
    expect(deptRep.kpis.awaitingMyAction).toBe(0);
    expect(deptRep.kpis.openRequests).toBe(2);
  });

  it('shows the whole mine and stock levels to stores and admin', async () => {
    const stores = (await (await w.agent(w.users.stores)).get(URL)).body.data;
    expect(stores.scope.kind).toBe('mine');
    expect(stores.kpis.awaitingMyAction).toBeGreaterThanOrEqual(1);
    expect(stores.kpis.lowStock).toBeGreaterThanOrEqual(1);
    expect(stores.lowStock.length).toBeGreaterThan(0);
    expect(stores.lowStock.length).toBeLessThanOrEqual(5);

    const admin = (await (await w.agent(w.users.admin)).get(URL).query({ period: 'year' })).body.data;
    expect(admin.period.key).toBe('year');
    expect(admin.kpis.openRequests).toBeGreaterThanOrEqual(3);
    expect(admin.kpis.spendThisPeriod).toBeGreaterThanOrEqual(90);
    expect(admin.spendBreakdown.groupBy).toBe('department');
    const names = admin.spendBreakdown.rows.map((r: { name: string }) => r.name);
    if (admin.spendBreakdown.rows.length < 8) expect(names).toEqual(expect.arrayContaining([w.mine.department.name, w.other.department.name]));
  });

  it('keeps other sections out of a section rep’s view', async () => {
    const d = (await (await w.agent(w.users.otherSectionRep)).get(URL)).body.data;
    expect(d.kpis).toMatchObject({ awaitingMyAction: 0, openRequests: 1, issuedThisPeriod: 1, spendThisPeriod: 50, renewalsDue: 0 });
    expect(d.renewalsDue).toEqual([]);
  });

  it('shows nothing to a role it does not know', async () => {
    // The model only allows known names, but nothing in the database stops another one
    const [[role]] = (await sequelize.query(
      `INSERT INTO roles (id, name, description, created_at, updated_at) VALUES (gen_random_uuid(), :name, 'Unknown role', NOW(), NOW()) RETURNING id`,
      { replacements: { name: `${w.fx.tag}-viewer` } }
    )) as unknown as [[{ id: string }]];
    w.fx.track('Role', role.id);
    const user = await w.fx.make('User', {
      username: `${w.fx.tag}-viewer`,
      passwordHash: PASSWORD,
      roleId: role.id,
      isActive: true,
      mustChangePassword: false,
    });
    const res = await (await signIn(user.username)).get(URL);
    expect(res.status).toBe(200);
    expect(res.body.data.scope.kind).not.toBe('mine');
    expect(res.body.data.kpis).toMatchObject({ awaitingMyAction: 0, openRequests: 0, issuedThisPeriod: 0, spendThisPeriod: 0, lowStock: null, renewalsDue: 0 });
    expect(res.body.data.spendBreakdown.rows).toEqual([]);
  });

  it('rejects an unknown period', async () => {
    expect((await (await w.agent(w.users.admin)).get(URL).query({ period: 'week' })).status).toBe(422);
  });

  it('requires a session', async () => {
    expect((await request(app).get(URL)).status).toBe(401);
  });
});

describe('dashboard consistency', () => {
  it('counts a request for its employee’s department, not the department stored by its creator', async () => {
    const otherHod = await w.agent(await w.fx.user('hod', { departmentId: w.other.department.id }));
    const before = (await otherHod.get(URL)).body.data.kpis;
    await w.fx.make('Request', {
      employeeId: w.employees.empB.id,
      requestedById: w.users.sectionRep.id,
      departmentId: w.mine.department.id,
      sectionId: w.mine.section.id,
      status: 'hod-review',
      requestType: 'replacement',
    });

    const mine = (await (await w.agent(w.users.hod)).get(URL)).body.data;
    expect(mine.kpis).toMatchObject({ awaitingMyAction: 1, openRequests: 2 });
    expect(mine.requestsPerWeek.at(-1).count).toBe(2);

    const theirs = (await otherHod.get(URL)).body.data;
    expect(theirs.kpis.awaitingMyAction).toBe(before.awaitingMyAction + 1);
    expect(theirs.kpis.openRequests).toBe(before.openRequests + 1);
  });

  it('counts low stock per line, as the Stock page does', async () => {
    const item = await w.fx.make('PPEItem', { name: `${w.fx.tag}-sized`, itemCode: `${w.fx.tag}-SZ`, category: w.category });
    // One size out while another is well stocked: low, though the item total is not
    const out = await w.fx.make('Stock', { ppeItemId: item.id, size: 'S', quantity: 0, minLevel: 1_000_000, location: `${w.fx.tag}-store` });
    await w.fx.make('Stock', { ppeItemId: item.id, size: 'L', quantity: 2_000_000, minLevel: 5, location: `${w.fx.tag}-store` });

    const stores = await w.agent(w.users.stores);
    const [d, summary] = await Promise.all([stores.get(URL), stores.get('/api/v2/stock/summary')]);
    expect(d.body.data.kpis.lowStock).toBe(summary.body.data.lowStockCount);
    expect(d.body.data.lowStock[0]).toMatchObject({ stockId: out.id, ppeItemId: item.id, size: 'S', quantity: 0, minLevel: 1_000_000 });
  });

  it('prices unpriced issues at the average stock price, as the budget pages do', async () => {
    const org = await w.fx.org();
    const emp = await w.fx.employee(org.section.id);
    const item = await w.fx.make('PPEItem', { name: `${w.fx.tag}-unpriced`, itemCode: `${w.fx.tag}-UP`, category: w.category });
    await w.fx.make('Stock', { ppeItemId: item.id, quantity: 50, minLevel: 0, location: `${w.fx.tag}-store`, unitPriceUSD: 7 });
    await w.fx.make('Allocation', {
      employeeId: emp.id,
      ppeItemId: item.id,
      issuedById: w.users.stores.id,
      quantity: 3,
      issueDate: new Date(),
      unitCost: 0,
      totalCost: 0,
      status: 'active',
    });
    const rep = await w.agent(await w.fx.user('section-rep', { sectionId: org.section.id }));
    const d = (await rep.get(URL)).body.data;
    expect(d.kpis.spendThisPeriod).toBe(21);
    expect(d.spendBreakdown.rows).toEqual([{ id: null, name: w.category, amount: 21 }]);
  });
});
