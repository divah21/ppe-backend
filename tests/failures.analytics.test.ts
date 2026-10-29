import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { createFixtures, signIn } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;
const fx = createFixtures();
let sheq: Agent, hod: Agent, otherHod: Agent, sectionRep: Agent;
let gloves: { id: string; name: string };

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

beforeAll(async () => {
  await prepareV2();
  const org = await fx.org();
  const other = await fx.org();
  const emp = await fx.employee(org.section.id);
  const away = await fx.employee(other.section.id);
  gloves = await fx.make('PPEItem', { name: `${fx.tag} Gloves`, itemCode: `${fx.tag}-G`, replacementFrequency: 6 });
  const early = await fx.make('Allocation', { employeeId: emp.id, ppeItemId: gloves.id, quantity: 2, status: 'active', issueDate: daysAgo(30) });
  const report = (employeeId: string, extra: Record<string, unknown>) =>
    fx.make('FailureReport', {
      employeeId,
      ppeItemId: gloves.id,
      description: `${fx.tag} torn`,
      failureType: 'damage',
      severity: 'medium',
      status: 'pending-sheq-review',
      reportedDate: daysAgo(5),
      ...extra,
    });
  await report(emp.id, { allocationId: early.id, failureDate: daysAgo(6), severity: 'critical', observedAt: 'Underground', brand: 'Acme' });
  await report(emp.id, { status: 'resolved', failureType: 'wear', observedAt: 'Plant' });
  await report(away.id, { severity: 'low' });

  const sign = async (role: string, opts = {}) => signIn((await fx.user(role, opts)).username);
  sheq = await sign('sheq');
  hod = await sign('hod', { departmentId: org.department.id });
  otherHod = await sign('hod', { departmentId: other.department.id });
  sectionRep = await sign('section-rep', { sectionId: org.section.id });
});
afterAll(() => fx.cleanup());

describe('GET /failures/analytics', () => {
  it('summarises failures in scope by severity, type, item, environment and month, with a projection', async () => {
    const res = await hod.get('/api/v2/failures/analytics');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totals).toMatchObject({ total: 2, open: 1, closed: 1, criticalOpen: 1, premature: 1, linkedToIssue: 1 });
    expect(d.bySeverity).toEqual({ critical: 1, medium: 1 });
    expect(d.byType).toEqual({ damage: 1, wear: 1 });
    expect(d.topItems[0]).toMatchObject({ ppeItemId: gloves.id, failures: 2, premature: 1, issued: 2, rate: 100 });
    expect(d.byEnvironment.map((e: { name: string }) => e.name).sort()).toEqual(['Plant', 'Underground']);
    expect(d.trend).toHaveLength(12);
    expect(d.trend.at(-1)).toEqual({ month: new Date().toISOString().slice(0, 7), count: 2 });
    expect(d.forecast).toHaveLength(6);
    expect((await otherHod.get('/api/v2/failures/analytics')).body.data.totals.total).toBe(1);
    expect((await sheq.get('/api/v2/failures/analytics').query({ months: 2 })).status).toBe(422);
  });
});

describe('failure list filters and report', () => {
  it('filters by environment and brand', async () => {
    const res = await sheq.get('/api/v2/failures').query({ q: fx.tag, observedAt: 'underground', brand: 'acm' });
    expect(res.body.meta.total).toBe(1);
  });

  it('exports failure reports for the caller’s scope', async () => {
    const res = await sectionRep.get('/api/v2/reports/failures').query({ severity: 'critical' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
  });
});
