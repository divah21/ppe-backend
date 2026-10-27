import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { allocationFixtures, monthsAgo } from './allocations.fixtures';
import { app, createFixtures, signIn, write } from './helpers';

const fx = createFixtures();
const af = allocationFixtures(fx);
type Agent = Awaited<ReturnType<typeof signIn>>;

let stores: Agent, admin: Agent, hod: Agent, sheq: Agent;
let section: { id: string }, employee: { id: string; worksNumber: string };
let unsized: { id: string; name: string }, sized: { id: string };
let unsizedStock: { id: string }, sizedStock: { id: string };

const stockQty = async (id: string) => Number((await models.Stock.findByPk(id))!.quantity);
const statusOf = async (id: string) => (await models.Allocation.findByPk(id))!.status as string;

beforeAll(async () => {
  await prepareV2();
  const org = await fx.org();
  section = org.section;
  employee = await fx.employee(section.id);
  unsized = await af.item({ replacementFrequency: 12 });
  sized = await af.item({ replacementFrequency: null, hasSizeVariants: true });
  unsizedStock = await af.stock(unsized.id, 10, { unitPriceUSD: 5 });
  sizedStock = await af.stock(sized.id, 1, { size: 'L' });

  const sign = async (role: string, opts = {}) => signIn((await fx.user(role, opts)).username);
  stores = await sign('stores');
  admin = await sign('admin');
  sheq = await sign('sheq');
  hod = await sign('hod', { departmentId: org.department.id });
});
afterAll(() => fx.cleanup());

describe('POST /api/v2/allocations/:id/return', () => {
  it('returns an item in good condition and puts it back in stock', async () => {
    const a = await af.allocation(employee.id, unsized.id, { quantity: 3, issueDate: monthsAgo(2) });
    const before = await stockQty(unsizedStock.id);

    const res = await write(stores, 'post', `/api/v2/allocations/${a.id}/return`).send({ condition: 'good', reason: 'Left the section' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: a.id, status: 'returned', restocked: 3, allowedActions: [] });
    expect(res.body.data.notes).toMatch(/in good condition: Left the section/);
    expect(await stockQty(unsizedStock.id)).toBe(before + 3);

    const again = await write(stores, 'post', `/api/v2/allocations/${a.id}/return`).send({ condition: 'good' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_TRANSITION');
    expect(await stockQty(unsizedStock.id)).toBe(before + 3);
  });

  it('does not restock damaged items', async () => {
    const a = await af.allocation(employee.id, unsized.id, { quantity: 1, status: 'expired' });
    const before = await stockQty(unsizedStock.id);
    const res = await write(admin, 'post', `/api/v2/allocations/${a.id}/return`).send({ condition: 'damaged' });
    expect(res.body.data).toMatchObject({ status: 'returned', restocked: 0 });
    expect(await stockQty(unsizedStock.id)).toBe(before);
  });

  it('applies a double click only once', async () => {
    const a = await af.allocation(employee.id, unsized.id, { quantity: 1 });
    const before = await stockQty(unsizedStock.id);
    const results = await Promise.all(
      [1, 2].map(() => write(stores, 'post', `/api/v2/allocations/${a.id}/return`).send({ condition: 'fair' }))
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await stockQty(unsizedStock.id)).toBe(before + 1);
  });

  it('only restocks a sized item into stock of the same size', async () => {
    const item = await af.item({ hasSizeVariants: true });
    const other = await af.stock(item.id, 4, { size: 'M' });
    const a = await af.allocation(employee.id, item.id, { size: 'L', quantity: 2 });
    const res = await write(stores, 'post', `/api/v2/allocations/${a.id}/return`).send({ condition: 'good' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'returned', restocked: 0 });
    expect(await stockQty(other.id)).toBe(4);

    const matching = await af.stock(item.id, 1, { size: 'L' });
    const b = await af.allocation(employee.id, item.id, { size: 'L', quantity: 2 });
    const ok = await write(stores, 'post', `/api/v2/allocations/${b.id}/return`).send({ condition: 'fair' });
    expect(ok.body.data.restocked).toBe(2);
    expect(await stockQty(matching.id)).toBe(3);
    expect(await stockQty(other.id)).toBe(4);
  });

  it('validates the body, the role, the id and the session', async () => {
    const a = await af.allocation(employee.id, unsized.id);
    const bad = await write(stores, 'post', `/api/v2/allocations/${a.id}/return`).send({ condition: 'shiny' });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details.fieldErrors.condition).toBeDefined();
    expect((await write(stores, 'post', `/api/v2/allocations/${a.id}/return`).send({ condition: 'good', reason: 'x'.repeat(501) })).status).toBe(422);
    expect((await write(hod, 'post', `/api/v2/allocations/${a.id}/return`).send({ condition: 'good' })).status).toBe(403);
    expect((await write(sheq, 'post', `/api/v2/allocations/${a.id}/return`).send({ condition: 'good' })).status).toBe(403);
    expect((await write(stores, 'post', `/api/v2/allocations/00000000-0000-4000-8000-000000000000/return`).send({ condition: 'good' })).status).toBe(404);
    expect((await request(app).post(`/api/v2/allocations/${a.id}/return`).send({ condition: 'good' })).status).toBe(401);
    expect(await statusOf(a.id)).toBe('active');
  });
});

describe('POST /api/v2/allocations/:id/renew', () => {
  it('issues a replacement from stock and marks the old one replaced', async () => {
    const old = await af.allocation(employee.id, unsized.id, { quantity: 1, issueDate: monthsAgo(12, 2) });
    const before = await stockQty(unsizedStock.id);

    const res = await write(stores, 'post', `/api/v2/allocations/${old.id}/renew`).send({ quantity: 2 });
    expect(res.status).toBe(201);
    fx.track('Allocation', res.body.data.id);
    expect(res.body.data).toMatchObject({
      status: 'active',
      quantity: 2,
      unitCost: 5,
      totalCost: 10,
      employee: { id: employee.id },
      item: { id: unsized.id },
      allowedActions: ['return', 'renew'],
    });
    expect(res.body.data.daysUntilDue).toBeGreaterThan(360);
    expect(await statusOf(old.id)).toBe('replaced');
    expect(await stockQty(unsizedStock.id)).toBe(before - 2);
    const created = await models.Allocation.findByPk(res.body.data.id);
    expect(created!.stockId).toBe(unsizedStock.id);

    expect((await write(stores, 'post', `/api/v2/allocations/${old.id}/renew`).send({})).status).toBe(409);
  });

  it('renews sized items without a replacement frequency for 12 months (v1 produced an invalid date)', async () => {
    const old = await af.allocation(employee.id, sized.id, { size: 'L' });
    const res = await write(stores, 'post', `/api/v2/allocations/${old.id}/renew`).send({});
    expect(res.status).toBe(201);
    fx.track('Allocation', res.body.data.id);
    expect(res.body.data).toMatchObject({ size: 'L', quantity: 1 });
    expect(res.body.data.daysUntilDue).toBeGreaterThan(360);
    expect(await stockQty(sizedStock.id)).toBe(0);
  });

  it('records the stock size when a sized item is renewed without one', async () => {
    const item = await af.item({ hasSizeVariants: true });
    const stockM = await af.stock(item.id, 2, { size: 'M' });
    const old = await af.allocation(employee.id, item.id, { size: null });
    const res = await write(stores, 'post', `/api/v2/allocations/${old.id}/renew`).send({});
    expect(res.status).toBe(201);
    fx.track('Allocation', res.body.data.id);
    expect(res.body.data.size).toBe('M');
    expect(await stockQty(stockM.id)).toBe(1);
  });

  it('refuses when there is not enough stock and changes nothing', async () => {
    const old = await af.allocation(employee.id, sized.id, { size: 'L' });
    const res = await write(stores, 'post', `/api/v2/allocations/${old.id}/renew`).send({ quantity: 5 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'INSUFFICIENT_STOCK', details: { requested: 5 } });
    expect(await statusOf(old.id)).toBe('active');

    const noRow = await write(stores, 'post', `/api/v2/allocations/${old.id}/renew`).send({ size: 'XS' });
    expect(noRow.status).toBe(409);
    expect(noRow.body.error.details).toMatchObject({ available: 0 });
  });

  it('serialises concurrent renewals of the same allocation', async () => {
    const old = await af.allocation(employee.id, unsized.id);
    const before = await stockQty(unsizedStock.id);
    const results = await Promise.all([1, 2].map(() => write(stores, 'post', `/api/v2/allocations/${old.id}/renew`).send({})));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    for (const r of results) if (r.status === 201) fx.track('Allocation', r.body.data.id);
    expect(await stockQty(unsizedStock.id)).toBe(before - 1);
  });

  it('validates the body, the role and the session', async () => {
    const a = await af.allocation(employee.id, unsized.id);
    expect((await write(stores, 'post', `/api/v2/allocations/${a.id}/renew`).send({ quantity: 0 })).status).toBe(422);
    expect((await write(stores, 'post', `/api/v2/allocations/${a.id}/renew`).send({ quantity: 1.5 })).status).toBe(422);
    expect((await write(hod, 'post', `/api/v2/allocations/${a.id}/renew`).send({})).status).toBe(403);
    expect((await request(app).post(`/api/v2/allocations/${a.id}/renew`).send({})).status).toBe(401);
    expect(await statusOf(a.id)).toBe('active');
  });
});

describe('POST /api/v2/allocations/import', () => {
  const body = (dryRun: boolean, extra: Record<string, unknown> = {}) => ({
    dryRun,
    defaultSectionId: section.id,
    allocations: [
      {
        firstName: 'Test',
        lastName: 'Imported',
        worksNumber: employee.worksNumber,
        ppeItems: [
          { itemName: unsized.name.toUpperCase(), issueDate: '2025/12/10', quantity: 2 },
          { itemName: `${fx.tag} unknown thing`, issueDate: '2025-01-01', quantity: 1 },
          { itemName: unsized.name, issueDate: '01/01/2999', quantity: 1 },
        ],
      },
      {
        firstName: 'New',
        lastName: `${fx.tag}`,
        worksNumber: `${fx.tag}-new`,
        ppeItems: [{ itemName: `${fx.tag}-I1`, issueDate: '10/02/2026', quantity: 1 }],
      },
    ],
    ...extra,
  });

  const trackImported = async () => {
    const created = await models.Employee.findOne({ where: { worksNumber: `${fx.tag}-new` } });
    const owners = [employee.id, created?.id].filter(Boolean);
    const rows = await models.Allocation.findAll({ where: { employeeId: owners, notes: 'Historical allocation (bulk import)' } });
    for (const r of rows) fx.track('Allocation', r.id);
    if (created) fx.track('Employee', created.id);
  };

  it('validates a dry run without writing anything', async () => {
    const res = await write(stores, 'post', '/api/v2/allocations/import').send(body(true));
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toEqual({ people: 2, allocationsCreated: 2, employeesCreated: 1, skipped: 0, errors: 2 });
    expect(res.body.data.errors.map((e: { message: string }) => e.message)).toEqual([
      'No PPE item with this name in the catalogue',
      'Issue date 01/01/2999 is in the future',
    ]);
    expect(await models.Employee.count({ where: { worksNumber: `${fx.tag}-new` } })).toBe(0);
    expect(await models.Allocation.count({ where: { employeeId: employee.id, notes: 'Historical allocation (bulk import)' } })).toBe(0);
  });

  it('imports for real and skips rows already recorded', async () => {
    const res = await write(stores, 'post', '/api/v2/allocations/import').send(body(false));
    await trackImported();
    expect(res.status).toBe(201);
    expect(res.body.data.created).toEqual([
      expect.objectContaining({ row: 1, quantity: 2, issueDate: '2025-12-10', status: 'active' }),
      expect.objectContaining({ row: 2, issueDate: '2026-02-10', status: 'active' }),
    ]);

    const again = await write(stores, 'post', '/api/v2/allocations/import').send(body(false));
    await trackImported();
    expect(again.body.data.summary).toMatchObject({ allocationsCreated: 0, employeesCreated: 0, skipped: 2 });
  });

  it('asks for a works number when a name matches more than one employee', async () => {
    const lastName = `${fx.tag}twin`;
    await fx.employee(section.id, { firstName: 'Twin', lastName });
    await fx.employee(section.id, { firstName: 'Twin', lastName });
    const res = await write(stores, 'post', '/api/v2/allocations/import').send({
      dryRun: true,
      allocations: [{ firstName: 'twin', lastName, ppeItems: [{ itemName: unsized.name, issueDate: '2025-01-01', quantity: 1 }] }],
    });
    expect(res.body.data.errors[0].message).toMatch(/More than one employee/);
  });

  it('generates works numbers when the works number cell is blank', async () => {
    const res = await write(stores, 'post', '/api/v2/allocations/import').send({
      dryRun: true,
      defaultSectionId: section.id,
      allocations: ['One', 'Two'].map((firstName) => ({
        firstName,
        lastName: `${fx.tag}blank`,
        worksNumber: '  ',
        jobType: '',
        ppeItems: [{ itemName: unsized.name, issueDate: '2025-01-01', quantity: 1 }],
      })),
    });
    expect(res.status).toBe(200);
    expect(res.body.data.errors).toEqual([]);
    const numbers = res.body.data.employeesCreated.map((e: { worksNumber: string }) => e.worksNumber);
    expect(numbers).toHaveLength(2);
    for (const n of numbers) expect(n).toMatch(/^EMP\d+$/);
  });

  it('validates the body, the role and the session', async () => {
    expect((await write(stores, 'post', '/api/v2/allocations/import').send({ allocations: [] })).status).toBe(422);
    const missing = await write(stores, 'post', '/api/v2/allocations/import').send({ allocations: [{ firstName: 'A', ppeItems: [] }] });
    expect(missing.status).toBe(422);
    const badSection = await write(stores, 'post', '/api/v2/allocations/import').send(
      body(true, { defaultSectionId: '00000000-0000-4000-8000-000000000000' })
    );
    expect(badSection.status).toBe(400);
    expect((await write(hod, 'post', '/api/v2/allocations/import').send(body(true))).status).toBe(403);
    expect((await request(app).post('/api/v2/allocations/import').send(body(true))).status).toBe(401);
  });
});
