import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { createFixtures, signIn } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;
const fx = createFixtures();
const fy = new Date().getFullYear();
const URL = '/api/v2/budgets/departments';
let stores: Agent, hod: Agent;
let funded: { id: string; name: string }, unfunded: { id: string; name: string };

beforeAll(async () => {
  await prepareV2();
  const a = await fx.org();
  const b = await fx.org();
  funded = a.department;
  unfunded = b.department;
  const item = await fx.make('PPEItem', { name: `${fx.tag} Boots`, itemCode: `${fx.tag}-B` });
  const issue = async (org: typeof a, totalCost: number) =>
    fx.make('Allocation', {
      employeeId: (await fx.employee(org.section.id)).id,
      ppeItemId: item.id,
      quantity: 1,
      status: 'active',
      issueDate: new Date(),
      totalCost,
      sectionId: org.section.id,
      departmentId: org.department.id,
    });
  await issue(a, 95);
  await issue(b, 20);
  await fx.make('Budget', { departmentId: funded.id, fiscalYear: fy, allocatedAmount: 100, period: 'annual', status: 'active' });
  const sign = async (role: string, opts = {}) => signIn((await fx.user(role, opts)).username);
  stores = await sign('stores');
  hod = await sign('hod', { departmentId: funded.id });
});
afterAll(() => fx.cleanup());

describe('GET /budgets/departments', () => {
  it('pages each department’s allocation against spend, with search, standing and sort', async () => {
    const res = await stores.get(URL).query({ fiscalYear: fy, q: fx.tag, sort: 'spent', order: 'desc' });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ total: 2, page: 1 });
    expect(res.body.data.map((d: { departmentId: string }) => d.departmentId)).toEqual([funded.id, unfunded.id]);
    expect(res.body.data[0]).toMatchObject({ allocated: 100, spent: 95, remaining: 5, utilisationPercent: 95, standing: 'nearly-spent' });
    expect(res.body.data[1]).toMatchObject({ allocated: 0, spent: 20, standing: 'no-budget' });

    const noBudget = await stores.get(URL).query({ fiscalYear: fy, q: fx.tag, standing: 'no-budget' });
    expect(noBudget.body.data.map((d: { departmentId: string }) => d.departmentId)).toEqual([unfunded.id]);
    const paged = await stores.get(URL).query({ fiscalYear: fy, q: fx.tag, sort: 'department', order: 'asc', pageSize: 1, page: 2 });
    expect(paged.body.meta).toMatchObject({ total: 2, pageCount: 2 });
    expect(paged.body.data).toHaveLength(1);
  });

  it('shows a HOD only their department and rejects an unknown standing', async () => {
    const res = await hod.get(URL).query({ fiscalYear: fy });
    expect(res.body.data.map((d: { departmentId: string }) => d.departmentId)).toEqual([funded.id]);
    expect((await stores.get(URL).query({ standing: 'nope' })).status).toBe(422);
  });
});
