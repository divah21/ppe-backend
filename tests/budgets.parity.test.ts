import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { createFixtures, signIn } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;
const fx = createFixtures();
let stores: Agent, hod: Agent, otherHod: Agent;
let dept: { id: string; name: string }, section: { id: string; name: string };
let worker: { id: string; worksNumber: string };

beforeAll(async () => {
  await prepareV2();
  const org = await fx.org();
  const other = await fx.org();
  dept = org.department;
  section = org.section;
  const item = await fx.make('PPEItem', { name: `${fx.tag} Boots`, itemCode: `${fx.tag}-B` });
  await fx.make('Stock', { ppeItemId: item.id, quantity: 5, unitPriceUSD: 40 });
  await fx.make('SectionPPEMatrix', { sectionId: section.id, ppeItemId: item.id, quantityRequired: 2, isActive: true });
  worker = await fx.employee(section.id);
  await fx.employee(section.id);
  await fx.make('Allocation', { employeeId: worker.id, ppeItemId: item.id, quantity: 1, status: 'active', issueDate: new Date(), totalCost: 40 });
  const sign = async (role: string, opts = {}) => signIn((await fx.user(role, opts)).username);
  stores = await sign('stores');
  hod = await sign('hod', { departmentId: dept.id });
  otherHod = await sign('hod', { departmentId: other.department.id });
});
afterAll(() => fx.cleanup());

describe('GET /budgets/suggested/departments/:id', () => {
  it('breaks the suggestion down by section, employee and item', async () => {
    const res = await hod.get(`/api/v2/budgets/suggested/departments/${dept.id}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toMatchObject({ department: { id: dept.id }, total: 160, employeeCount: 2 });
    expect(d.sections).toEqual([expect.objectContaining({ id: section.id, total: 160 })]);
    expect(d.sections[0].employees).toHaveLength(2);
    expect(d.sections[0].employees[0]).toMatchObject({ cost: 80, items: 1 });
    expect(d.items).toEqual([expect.objectContaining({ name: `${fx.tag} Boots`, quantity: 4, cost: 160 })]);
    expect((await otherHod.get(`/api/v2/budgets/suggested/departments/${dept.id}`)).status).toBe(404);
    expect((await stores.get(`/api/v2/budgets/suggested/departments/${dept.id}`)).status).toBe(200);
  });
});

describe('spending grouped by employee and year', () => {
  it('groups actual spend by employee and by year', async () => {
    const byEmployee = await hod.get('/api/v2/valuation/spending').query({ groupBy: 'employee' });
    expect(byEmployee.status).toBe(200);
    expect(byEmployee.body.data).toContainEqual(expect.objectContaining({ key: worker.id, sublabel: worker.worksNumber, spent: 40 }));
    const byYear = await hod.get('/api/v2/valuation/spending').query({ groupBy: 'year' });
    expect(byYear.body.data.at(-1)).toMatchObject({ key: String(new Date().getFullYear()) });
  });
});
