import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { allocationFixtures, monthsAgo } from './allocations.fixtures';
import { createFixtures, signIn } from './helpers';

const fx = createFixtures();
const af = allocationFixtures(fx);
type Agent = Awaited<ReturnType<typeof signIn>>;

let stores: Agent, hod: Agent, sectionRep: Agent;
let empA1: { id: string }, empA2: { id: string }, empB: { id: string };
let secA1: { id: string };
let item1: { id: string; name: string }, item2: { id: string; name: string };

beforeAll(async () => {
  await prepareV2();
  const orgA = await fx.org();
  const orgB = await fx.org();
  secA1 = orgA.section;
  const secA2 = await fx.make('Section', { name: `${fx.tag}-section-a2`, departmentId: orgA.department.id });

  empA1 = await fx.employee(secA1.id);
  empA2 = await fx.employee(secA2.id);
  empB = await fx.employee(orgB.section.id);

  item1 = await af.item({ replacementFrequency: 12 });
  item2 = await af.item({ replacementFrequency: 6 });
  await fx.make('SectionPPEMatrix', { sectionId: secA1.id, ppeItemId: item1.id, quantityRequired: 1, isActive: true });
  await fx.make('SectionPPEMatrix', { sectionId: secA1.id, ppeItemId: item2.id, quantityRequired: 1, isActive: true });
  await fx.make('SectionPPEMatrix', { sectionId: secA2.id, ppeItemId: item2.id, quantityRequired: 1, isActive: true });

  // empA1: item1 due in about two weeks, item2 returned (so missing); empA2: item2 overdue; empB: no matrix
  await af.allocation(empA1.id, item1.id, { issueDate: monthsAgo(11, 16), quantity: 2, totalCost: 20 });
  await af.allocation(empA1.id, item2.id, { issueDate: monthsAgo(3), status: 'returned' });
  await af.allocation(empA2.id, item2.id, { issueDate: monthsAgo(7), totalCost: 5 });
  await af.allocation(empB.id, item1.id, { issueDate: new Date(), totalCost: 10 });

  const sign = async (role: string, opts = {}) => signIn((await fx.user(role, opts)).username);
  stores = await sign('stores');
  hod = await sign('hod', { departmentId: orgA.department.id });
  sectionRep = await sign('section-rep', { sectionId: secA1.id });
});
afterAll(() => fx.cleanup());

describe('GET /allocations/summary', () => {
  it('sums the filtered list: people, active, due soon, overdue and cost', async () => {
    const res = await stores.get('/api/v2/allocations/summary').query({ q: fx.tag });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ employees: 3, active: 3, expiring: 1, overdue: 1, expiringDays: 30, totalCost: 35 });
    const hodView = await hod.get('/api/v2/allocations/summary').query({ q: fx.tag });
    expect(hodView.body.data).toMatchObject({ employees: 2, totalCost: 25 });
  });
});

describe('GET /allocations/employees', () => {
  it('lists people in scope with what they hold and their next renewal', async () => {
    const res = await hod.get('/api/v2/allocations/employees').query({ q: fx.tag, sort: 'employee', order: 'asc' });
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
    const a1 = res.body.data.find((r: { employee: { id: string } }) => r.employee.id === empA1.id);
    expect(a1).toMatchObject({ active: 1, issued: 3 });
    expect(a1.daysUntilDue).toBeGreaterThan(0);
    expect(a1.daysUntilDue).toBeLessThanOrEqual(30);
    const rep = await sectionRep.get('/api/v2/allocations/employees').query({ q: fx.tag });
    expect(rep.body.data.map((r: { employee: { id: string } }) => r.employee.id)).toEqual([empA1.id]);
  });
});

describe('GET /allocations/compliance', () => {
  it('rates each person against their matrix, worst first, with a summary', async () => {
    const res = await stores.get('/api/v2/allocations/compliance').query({ q: fx.tag });
    expect(res.status).toBe(200);
    const by = new Map(res.body.data.map((r: { employee: { id: string } }) => [r.employee.id, r]));
    expect(by.get(empA1.id)).toMatchObject({ required: 2, current: 1, missing: 1, expired: 0, rate: 50, level: 'partial' });
    expect(by.get(empA2.id)).toMatchObject({ required: 1, current: 0, missing: 0, expired: 1, rate: 0, level: 'none' });
    expect(by.get(empB.id)).toMatchObject({ required: 0, rate: null, level: 'no-matrix' });
    expect(res.body.data[0].employee.id).toBe(empA2.id);
    expect(res.body.meta.summary).toMatchObject({ averageRate: 25, full: 0, partial: 1, none: 1, noMatrix: 1 });
  });

  it('filters by level and stays in scope', async () => {
    const partial = await stores.get('/api/v2/allocations/compliance').query({ q: fx.tag, level: 'partial' });
    expect(partial.body.data.map((r: { employee: { id: string } }) => r.employee.id)).toEqual([empA1.id]);
    expect(partial.body.meta.total).toBe(1);
    const rep = await sectionRep.get('/api/v2/allocations/compliance').query({ q: fx.tag });
    expect(rep.body.meta.total).toBe(1);
    expect((await stores.get('/api/v2/allocations/compliance').query({ level: 'great' })).status).toBe(422);
  });
});

describe('compliance with category-mapped job titles', () => {
  it('counts items from the job title’s PPE category, as the PPE cards report does', async () => {
    const category = await fx.make('JobTitle', { name: `${fx.tag} category`, sectionId: secA1.id });
    const title = await fx.make('JobTitle', { name: `${fx.tag} fitter`, sectionId: secA1.id, ppeCategoryId: category.id });
    const item3 = await af.item({ replacementFrequency: 12 });
    await fx.make('JobTitlePPEMatrix', { jobTitleId: category.id, ppeItemId: item3.id, quantityRequired: 1, isActive: true });
    const person = await fx.employee(secA1.id, { jobTitleId: title.id });
    const res = await stores.get('/api/v2/allocations/compliance').query({ q: fx.tag, sectionId: secA1.id });
    const row = res.body.data.find((r: { employee: { id: string } }) => r.employee.id === person.id);
    expect(row).toMatchObject({ required: 3, missing: 3, level: 'none' });
    const empty = await stores.get('/api/v2/allocations/compliance').query({ q: fx.tag, level: 'full' });
    expect(empty.body.data).toEqual([]);
    expect(empty.body.meta.total).toBe(0);
    expect(empty.body.meta.summary.none).toBeGreaterThan(0);
  });
});

describe('GET /allocations/import/template', () => {
  it('gives stores the chosen employees and the items in their matrices', async () => {
    const res = await stores.get('/api/v2/allocations/import/template').query({ sectionId: secA1.id });
    expect(res.status).toBe(200);
    expect(res.body.data.employees.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items.map((i: { name: string }) => i.name)).toEqual(expect.arrayContaining([item1.name, item2.name]));
    expect((await hod.get('/api/v2/allocations/import/template')).status).toBe(403);
  });
});

describe('reports for section reps', () => {
  it('lets a section rep export their allocations, requests and PPE cards', async () => {
    const list = await sectionRep.get('/api/v2/reports');
    expect(list.body.data.map((r: { key: string }) => r.key).sort()).toEqual(['allocations', 'ppe-cards', 'requests']);
    const file = await sectionRep.get('/api/v2/reports/allocations');
    expect(file.status).toBe(200);
  });
});
