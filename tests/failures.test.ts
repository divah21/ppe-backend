import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Row } from '../src/core/db';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { failureFixtures } from './failures.fixtures';
import { app, createFixtures, signIn, write } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;

const fx = createFixtures();
const ff = failureFixtures(fx);
const URL = '/api/v2/failures';

let admin: Agent, sheq: Agent, stores: Agent, hod: Agent, sectionRep: Agent;
let a1: Row, a2: Row, b: Row, deptB: string;
let item: Row, otherItem: Row, stock: Row, otherStock: Row, allocation: Row;

const report = async (agent: Agent, employee: Row, extra: Record<string, unknown> = {}) => {
  const res = await write(agent, 'post', URL).send({
    employeeId: employee.id,
    ppeItemId: item.id,
    description: 'Sole split along the seam',
    failureType: 'damage',
    severity: 'high',
    ...extra,
  });
  if (res.status === 201) fx.track('FailureReport', res.body.data.id);
  return res;
};

const approved = async (employee: Row = a1, extra: Record<string, unknown> = {}) => {
  const res = await report(admin, employee, extra);
  await write(sheq, 'post', `${URL}/${res.body.data.id}/review`).send({ decision: 'approve', comment: 'Genuine defect' });
  return res.body.data.id as string;
};

const ids = (res: request.Response) => res.body.data.map((r: { id: string }) => r.id);

beforeAll(async () => {
  await prepareV2();
  const orgA = await fx.org();
  const orgB = await fx.org();
  deptB = orgB.department.id;
  const sectionA2 = await fx.make('Section', { name: `${fx.tag}-section-a2`, departmentId: orgA.department.id });
  a1 = await fx.employee(orgA.section.id);
  a2 = await fx.employee(sectionA2.id);
  b = await fx.employee(orgB.section.id);

  item = await ff.ppeItem();
  otherItem = await ff.ppeItem();
  stock = await ff.stock(item.id, 5);
  otherStock = await ff.stock(otherItem.id, 5);
  allocation = await ff.allocation(a1, item.id, stock.id);

  admin = await signIn((await fx.user('admin')).username);
  sheq = await signIn((await fx.user('sheq')).username);
  stores = await signIn((await fx.user('stores')).username);
  hod = await signIn((await fx.user('hod', { departmentId: orgA.department.id })).username);
  sectionRep = await signIn((await fx.user('section-rep', { sectionId: orgA.section.id })).username);
});
afterAll(() => fx.cleanup());

describe('POST /failures', () => {
  it('lets a section rep report a failure for an employee in their section', async () => {
    const res = await report(sectionRep, a1, { allocationId: allocation.id, failureDate: '2026-01-15', observedAt: 'Pit 3' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      status: 'pending-sheq-review',
      severity: 'high',
      failureType: 'damage',
      observedAt: 'Pit 3',
      employee: { id: a1.id },
      ppeItem: { id: item.id },
      allocation: { id: allocation.id },
      stock: { id: stock.id },
      sheqDecision: null,
      allowedActions: [],
    });
    expect(res.body.data.failureDate.slice(0, 10)).toBe('2026-01-15');
  });

  it('validates the body', async () => {
    const res = await write(sectionRep, 'post', URL).send({ employeeId: a1.id, ppeItemId: item.id, description: 'x', failureType: 'burnt' });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details.fieldErrors)).toEqual(expect.arrayContaining(['description', 'failureType']));

    const future = await report(sectionRep, a1, { failureDate: '2999-01-01' });
    expect(future.status).toBe(422);
    expect(future.body.error.details.fieldErrors.failureDate).toBeDefined();
  });

  it('rejects an allocation that is for another item or another employee', async () => {
    const wrongItem = await report(sectionRep, a1, { ppeItemId: otherItem.id, allocationId: allocation.id });
    expect(wrongItem.status).toBe(422);
    expect(wrongItem.body.error.details.fieldErrors.allocationId[0]).toMatch(/different PPE item/);

    const wrongEmployee = await report(hod, a2, { allocationId: allocation.id });
    expect(wrongEmployee.status).toBe(422);
  });

  it('rejects an unknown PPE item', async () => {
    const res = await report(admin, a1, { ppeItemId: '11111111-1111-4111-8111-111111111111' });
    expect(res.status).toBe(422);
    expect(res.body.error.details.fieldErrors.ppeItemId).toBeDefined();
  });

  it('only allows reports for employees in scope', async () => {
    expect((await report(sectionRep, a2)).status).toBe(404);
    expect((await report(hod, b)).status).toBe(404);
    expect((await report(hod, a2)).status).toBe(201);
  });

  it('requires a session', async () => {
    expect((await write(request.agent(app), 'post', URL).send({})).status).toBe(401);
  });
});

describe('GET /failures', () => {
  let inB: string;

  beforeAll(async () => {
    inB = (await report(admin, b)).body.data.id;
  });

  it('scopes the list by role', async () => {
    const all = await admin.get(URL).query({ q: fx.tag, pageSize: 100 });
    expect(all.status).toBe(200);
    expect(all.body.data.map((r: { employee: { id: string } }) => r.employee.id)).toEqual(
      expect.arrayContaining([a1.id, a2.id, b.id])
    );

    const rep = await sectionRep.get(URL).query({ q: fx.tag, pageSize: 100 });
    expect(new Set(rep.body.data.map((r: { employee: { id: string } }) => r.employee.id))).toEqual(new Set([a1.id]));

    const dept = await hod.get(URL).query({ q: fx.tag, pageSize: 100 });
    expect(new Set(dept.body.data.map((r: { employee: { id: string } }) => r.employee.id))).toEqual(new Set([a1.id, a2.id]));
  });

  it('never widens scope through filters', async () => {
    const res = await hod.get(URL).query({ q: fx.tag, departmentId: deptB, employeeId: b.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('pages, filters and searches', async () => {
    const res = await admin.get(URL).query({ q: fx.tag, pageSize: 1, status: 'pending-sheq-review' });
    expect(res.body.meta.pageSize).toBe(1);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
    expect(res.body.data[0]).toHaveProperty('allowedActions');

    const byEmployee = await admin.get(URL).query({ employeeId: b.id });
    expect(ids(byEmployee)).toEqual([inB]);
  });

  it('rejects bad query parameters', async () => {
    expect((await admin.get(URL).query({ sort: 'password' })).status).toBe(422);
    expect((await admin.get(URL).query({ status: 'investigating' })).status).toBe(422);
    expect((await admin.get(URL).query({ pageSize: 1000 })).status).toBe(422);
  });

  it('hides out-of-scope reports on detail', async () => {
    expect((await hod.get(`${URL}/${inB}`)).status).toBe(404);
    expect((await sectionRep.get(`${URL}/${inB}`)).status).toBe(404);
    expect((await admin.get(`${URL}/${inB}`)).status).toBe(200);
    expect((await admin.get(`${URL}/not-a-uuid`)).status).toBe(422);
  });

  it('counts by status within scope', async () => {
    const res = await sectionRep.get(`${URL}/stats`);
    expect(res.status).toBe(200);
    expect(res.body.data['pending-sheq-review']).toBeGreaterThanOrEqual(1);
  });

  it('requires a session', async () => {
    expect((await request(app).get(URL)).status).toBe(401);
    expect((await request(app).get(`${URL}/${inB}`)).status).toBe(401);
  });
});

describe('SHEQ review', () => {
  it('approves with a comment', async () => {
    const id = (await report(sectionRep, a1)).body.data.id;
    expect((await sheq.get(`${URL}/${id}`)).body.data.allowedActions).toEqual(['review']);

    const res = await write(sheq, 'post', `${URL}/${id}/review`).send({ decision: 'approve', comment: 'Manufacturing defect' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'sheq-approved', sheqDecision: 'approved', sheqComment: 'Manufacturing defect' });
    expect(res.body.data.sheqReviewDate).not.toBeNull();

    const again = await write(sheq, 'post', `${URL}/${id}/review`).send({ decision: 'reject', comment: 'Changed my mind' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('rejects with a comment and closes the report', async () => {
    const id = (await report(sectionRep, a1)).body.data.id;
    const res = await write(sheq, 'post', `${URL}/${id}/review`).send({ decision: 'reject', comment: 'Misuse, not a failure' });
    expect(res.body.data).toMatchObject({ status: 'resolved', sheqDecision: 'rejected', allowedActions: [] });

    const replace = await write(stores, 'post', `${URL}/${id}/replace`).send({ stockId: stock.id });
    expect(replace.status).toBe(409);
  });

  it('requires a decision and a comment', async () => {
    const id = (await report(sectionRep, a1)).body.data.id;
    const res = await write(sheq, 'post', `${URL}/${id}/review`).send({ decision: 'maybe' });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details.fieldErrors)).toEqual(expect.arrayContaining(['decision', 'comment']));
  });

  it('is limited to SHEQ and admin', async () => {
    const id = (await report(sectionRep, a1)).body.data.id;
    for (const agent of [sectionRep, hod, stores]) {
      expect((await write(agent, 'post', `${URL}/${id}/review`).send({ decision: 'approve', comment: 'ok fine' })).status).toBe(403);
    }
    expect((await write(admin, 'post', `${URL}/${id}/review`).send({ decision: 'approve', comment: 'ok fine' })).status).toBe(200);
  });
});

describe('replacement', () => {
  const stockQty = async (id: string) => (await models.Stock.findByPk(id))!.quantity as number;

  it('needs SHEQ approval first', async () => {
    const id = (await report(sectionRep, a1)).body.data.id;
    const res = await write(stores, 'post', `${URL}/${id}/replace`).send({ stockId: stock.id });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/SHEQ must approve/);
  });

  it('issues a replacement, deducts stock and closes the old issue', async () => {
    const issued = await ff.allocation(a1, item.id, stock.id);
    const id = await approved(a1, { allocationId: issued.id });
    expect((await stores.get(`${URL}/${id}`)).body.data.allowedActions).toEqual(['process', 'replace', 'resolve']);

    const options = await stores.get(`${URL}/${id}/stock-options`);
    expect(options.status).toBe(200);
    expect(options.body.data.map((s: { id: string }) => s.id)).toEqual([stock.id]);

    const before = await stockQty(stock.id);
    const res = await write(stores, 'post', `${URL}/${id}/replace`).send({ stockId: stock.id, quantity: 1, notes: 'Swapped at the store' });
    expect(res.status).toBe(200);
    fx.track('Allocation', res.body.data.allocationId);
    expect(res.body.data.stockRemaining).toBe(before - 1);
    expect(res.body.data.report).toMatchObject({
      status: 'replaced',
      replacementStock: { id: stock.id },
      replacementAllocation: { id: res.body.data.allocationId, quantity: 1, size: 'L' },
      allowedActions: [],
    });
    expect(await stockQty(stock.id)).toBe(before - 1);

    const created = await models.Allocation.findByPk(res.body.data.allocationId);
    expect(created).toMatchObject({ allocationType: 'replacement', status: 'active', employeeId: a1.id, ppeItemId: item.id });
    // Priced in USD (unitPriceUSD), not the local-currency unitCost.
    expect(Number(created!.unitCost)).toBe(4.25);
    expect(Number(created!.totalCost)).toBe(4.25);
    expect(created!.notes).toMatch(/Swapped at the store/);
    expect((await models.Allocation.findByPk(issued.id))!.status).toBe('replaced');

    const again = await write(stores, 'post', `${URL}/${id}/replace`).send({ stockId: stock.id });
    expect(again.status).toBe(409);
    expect(await stockQty(stock.id)).toBe(before - 1);

    const reportAgain = await report(sectionRep, a1, { allocationId: issued.id });
    expect(reportAgain.status).toBe(422);
    expect(reportAgain.body.error.details.fieldErrors.allocationId[0]).toMatch(/already replaced/);
  });

  it('refuses a second open report for the same issue', async () => {
    const issued = await ff.allocation(a1, item.id, stock.id);
    const first = await report(sectionRep, a1, { allocationId: issued.id });
    expect(first.status).toBe(201);
    const second = await report(admin, a1, { allocationId: issued.id });
    expect(second.status).toBe(409);
    expect(second.body.error.message).toMatch(new RegExp(`#${first.body.data.reference}`));

    await write(sheq, 'post', `${URL}/${first.body.data.id}/review`).send({ decision: 'reject', comment: 'Normal wear' });
    expect((await report(sectionRep, a1, { allocationId: issued.id })).status).toBe(201);
  });

  it('uses the stock size, and the typed size only when the stock has none', async () => {
    const sized = await approved();
    const r1 = await write(stores, 'post', `${URL}/${sized}/replace`).send({ stockId: stock.id, size: 'XS' });
    expect(r1.status).toBe(200);
    fx.track('Allocation', r1.body.data.allocationId);
    expect((await models.Allocation.findByPk(r1.body.data.allocationId))!.size).toBe('L');

    const unsized = await ff.stock(item.id, 2, { size: null, unitPriceUSD: null });
    const plain = await approved();
    const r2 = await write(stores, 'post', `${URL}/${plain}/replace`).send({ stockId: unsized.id, size: '42' });
    expect(r2.status).toBe(200);
    fx.track('Allocation', r2.body.data.allocationId);
    const unpriced = (await models.Allocation.findByPk(r2.body.data.allocationId))!;
    expect(unpriced.size).toBe('42');
    // No USD price: leave cost null so spend falls back to the average price instead of $0.
    expect(unpriced.unitCost).toBeNull();
    expect(unpriced.totalCost).toBeNull();
  });

  it('applies once when two replacements race', async () => {
    const id = await approved();
    const before = await stockQty(stock.id);
    const results = await Promise.all([
      write(stores, 'post', `${URL}/${id}/replace`).send({ stockId: stock.id }),
      write(stores, 'post', `${URL}/${id}/replace`).send({ stockId: stock.id }),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
    for (const r of results) if (r.status === 200) fx.track('Allocation', r.body.data.allocationId);
    expect(await stockQty(stock.id)).toBe(before - 1);
  });

  it('refuses stock of another item and too large a quantity', async () => {
    const id = await approved();
    const wrong = await write(stores, 'post', `${URL}/${id}/replace`).send({ stockId: otherStock.id });
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.details.fieldErrors.stockId).toBeDefined();

    const before = await stockQty(stock.id);
    const tooMany = await write(stores, 'post', `${URL}/${id}/replace`).send({ stockId: stock.id, quantity: before + 1 });
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(await stockQty(stock.id)).toBe(before);
    expect((await stores.get(`${URL}/${id}`)).body.data.status).toBe('sheq-approved');

    expect((await write(stores, 'post', `${URL}/${id}/replace`).send({ stockId: stock.id, quantity: 0 })).status).toBe(422);
    expect((await write(stores, 'post', `${URL}/${id}/replace`).send({})).status).toBe(422);
  });

  it('is limited to stores and admin', async () => {
    const id = await approved();
    for (const agent of [sheq, hod, sectionRep]) {
      expect((await write(agent, 'post', `${URL}/${id}/replace`).send({ stockId: stock.id })).status).toBe(403);
    }
    expect((await sectionRep.get(`${URL}/${id}/stock-options`)).status).toBe(403);
    expect((await write(request.agent(app), 'post', `${URL}/${id}/replace`).send({ stockId: stock.id })).status).toBe(401);
  });
});

describe('processing and closing without replacement', () => {
  it('moves an approved report through processing to resolved', async () => {
    const id = await approved();
    const started = await write(stores, 'post', `${URL}/${id}/process`);
    expect(started.status).toBe(200);
    expect(started.body.data).toMatchObject({ status: 'stores-processing', allowedActions: ['replace', 'resolve'] });
    expect((await write(stores, 'post', `${URL}/${id}/process`)).status).toBe(409);

    expect((await write(stores, 'post', `${URL}/${id}/resolve`).send({})).status).toBe(422);
    const resolved = await write(stores, 'post', `${URL}/${id}/resolve`).send({ actionTaken: 'Repaired on site' });
    expect(resolved.body.data).toMatchObject({ status: 'resolved', actionTaken: 'Repaired on site', sheqDecision: 'approved' });
  });

  it('does not let stores process a report SHEQ has not approved', async () => {
    const id = (await report(sectionRep, a1)).body.data.id;
    expect((await write(stores, 'post', `${URL}/${id}/process`)).status).toBe(409);
    expect((await write(stores, 'post', `${URL}/${id}/resolve`).send({ actionTaken: 'Closed' })).status).toBe(409);
    expect((await write(sheq, 'post', `${URL}/${id}/resolve`).send({ actionTaken: 'Closed' })).status).toBe(403);
  });
});

describe('form lookups', () => {
  it('lists employees in scope only', async () => {
    const rep = await sectionRep.get(`${URL}/options/employees`).query({ q: fx.tag });
    expect(ids(rep)).toEqual([a1.id]);
    const dept = await hod.get(`${URL}/options/employees`).query({ q: fx.tag });
    expect(new Set(ids(dept))).toEqual(new Set([a1.id, a2.id]));
  });

  it("lists an employee's active issues, scoped", async () => {
    const res = await hod.get(`${URL}/options/allocations`).query({ employeeId: a2.id });
    expect(res.status).toBe(200);
    expect((await hod.get(`${URL}/options/allocations`).query({ employeeId: b.id })).status).toBe(404);
    expect((await hod.get(`${URL}/options/allocations`)).status).toBe(422);
  });

  it('searches PPE items', async () => {
    const res = await sectionRep.get(`${URL}/options/ppe-items`).query({ q: item.itemCode });
    expect(ids(res)).toEqual([item.id]);
  });
});
