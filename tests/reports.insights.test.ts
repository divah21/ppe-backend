import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { createFixtures, signIn } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;
const fx = createFixtures();
let hod: Agent, otherHod: Agent, sheq: Agent, sectionRep: Agent;
let sectionName: string;

const URL = '/api/v2/reports/insights';
const thisMonth = () => new Date().toISOString().slice(0, 7);

beforeAll(async () => {
  await prepareV2();
  const org = await fx.org();
  const other = await fx.org();
  sectionName = org.section.name;
  const emp = await fx.employee(org.section.id);
  const away = await fx.employee(other.section.id);
  const gloves = await fx.make('PPEItem', { name: `${fx.tag} Gloves`, itemCode: `${fx.tag}-G`, replacementFrequency: 1 });
  const stores = await fx.user('stores');
  const issue = (employeeId: string, section: { id: string; departmentId: string }, quantity: number) =>
    fx.make('Allocation', {
      employeeId,
      ppeItemId: gloves.id,
      issuedById: stores.id,
      quantity,
      unitCost: 10,
      totalCost: quantity * 10,
      issueDate: new Date(),
      status: 'active',
      sectionId: section.id,
      departmentId: section.departmentId,
    });
  await issue(emp.id, { id: org.section.id, departmentId: org.department.id }, 3);
  await issue(away.id, { id: other.section.id, departmentId: other.department.id }, 5);
  await fx.make('Request', { employeeId: emp.id, requestedById: stores.id, status: 'hod-review', requestType: 'new', sectionId: org.section.id, departmentId: org.department.id });
  await fx.make('FailureReport', {
    employeeId: emp.id,
    ppeItemId: gloves.id,
    description: `${fx.tag} torn`,
    failureType: 'damage',
    severity: 'high',
    status: 'pending-sheq-review',
    reportedDate: new Date(),
  });

  const sign = async (role: string, opts = {}) => signIn((await fx.user(role, opts)).username);
  hod = await sign('hod', { departmentId: org.department.id });
  otherHod = await sign('hod', { departmentId: other.department.id });
  sheq = await sign('sheq');
  sectionRep = await sign('section-rep', { sectionId: org.section.id });
});
afterAll(() => fx.cleanup());

describe('GET /reports/insights', () => {
  it('charts the scope month by month, with spend, top items, request stages, severities and renewals', async () => {
    const res = await hod.get(URL);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.monthly).toHaveLength(12);
    expect(d.monthly.at(-1)).toEqual({ month: thisMonth(), issued: 3, spend: 30, requestsRaised: 1, requestsFulfilled: 0, failures: 1 });
    expect(d.spendBy).toEqual({ groupBy: 'section', rows: [{ name: sectionName, value: 30 }] });
    expect(d.topItems).toEqual([{ name: `${fx.tag} Gloves`, value: 3 }]);
    expect(d.requestStatus).toEqual({ 'hod-review': 1 });
    expect(d.failureSeverity).toEqual({ high: 1 });
    expect(d.renewals.ahead).toHaveLength(6);
    expect(d.renewals.ahead[1]).toEqual({ month: expect.any(String), due: 1 });
    expect(d.stock).toBeNull();

    expect((await otherHod.get(URL)).body.data.monthly.at(-1)).toMatchObject({ issued: 5, failures: 0, requestsRaised: 0 });
  });

  it('hides spend from roles that do not see it and stock from roles that do not manage it', async () => {
    const rep = (await sectionRep.get(URL)).body.data;
    expect(rep.monthly.at(-1)).toMatchObject({ issued: 3, spend: null });
    expect(rep.spendBy).toBeNull();
    const s = (await sheq.get(URL).query({ months: 6 })).body.data;
    expect(s.monthly).toHaveLength(6);
    expect(s.stock).toEqual({ healthy: expect.any(Number), low: expect.any(Number), out: expect.any(Number) });
  });

  it('rejects an unsupported window', async () => {
    expect((await sheq.get(URL).query({ months: 7 })).status).toBe(422);
  });
});
