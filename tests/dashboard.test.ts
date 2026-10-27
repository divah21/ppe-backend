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
