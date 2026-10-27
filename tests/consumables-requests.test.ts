import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Row } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { consumableFixtures } from './consumables.fixtures';
import { app, createFixtures, signIn, write } from './helpers';

const fx = createFixtures();
const cx = consumableFixtures(fx.tag);
type Agent = Awaited<ReturnType<typeof signIn>>;
type Org = Awaited<ReturnType<typeof fx.org>>;

let mine: Org;
let other: Org;
let otherSectionSameDept: Row;
let admin: Agent;
let stores: Agent;
let sheq: Agent;
let hod: Agent;
let hodOther: Agent;
let deptRep: Agent;
let sectionRep: Agent;
let sectionRepSibling: Agent;
let gloves: Row;
let acid: Row;
let glovesStock: Row;
let acidStock: Row;

const BASE = '/api/v2/consumables';
const R = `${BASE}/requests`;

interface Line {
  id: string;
  consumableItemId: string;
}

const raise = async (agent: Agent, items: Array<{ consumableItemId: string; quantity: number }>, extra = {}) => {
  const res = await write(agent, 'post', R).send({ items, purpose: 'Weekly lab use', ...extra });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; items: Line[]; requestNumber: string };
};

const lineFor = (req: { items: Line[] }, itemId: string) => req.items.find((l) => l.consumableItemId === itemId)!;

beforeAll(async () => {
  await prepareV2();
  mine = await fx.org();
  other = await fx.org();
  otherSectionSameDept = await fx.make('Section', { name: `${fx.tag}-section-sibling`, departmentId: mine.department.id });

  admin = await signIn((await fx.user('admin')).username);
  stores = await signIn((await fx.user('stores')).username);
  sheq = await signIn((await fx.user('sheq')).username);
  hod = await signIn((await fx.user('hod', { departmentId: mine.department.id })).username);
  hodOther = await signIn((await fx.user('hod', { departmentId: other.department.id })).username);
  deptRep = await signIn((await fx.user('department-rep', { departmentId: mine.department.id })).username);
  sectionRep = await signIn((await fx.user('section-rep', { sectionId: mine.section.id })).username);
  sectionRepSibling = await signIn((await fx.user('section-rep', { sectionId: otherSectionSameDept.id })).username);

  gloves = await cx.item('GLOVES', { unitPriceUSD: 1.5 });
  acid = await cx.item('ACID', { unit: 'L', unitPriceUSD: 10 });
  glovesStock = await cx.stock(gloves.id, 100, { unitPriceUSD: 1.5 });
  acidStock = await cx.stock(acid.id, 2, { unitPriceUSD: 10 });
});
afterAll(async () => {
  await cx.cleanup();
  await fx.cleanup();
});

describe('raising a request', () => {
  it('lets a section rep raise one for their own section', async () => {
    const res = await write(sectionRep, 'post', R).send({
      priority: 'high',
      requiredByDate: '2030-01-31',
      items: [
        { consumableItemId: gloves.id, quantity: 4 },
        { consumableItemId: acid.id, quantity: 0.5, remarks: 'Titration' },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      status: 'pending-hod-approval',
      priority: 'high',
      section: { id: mine.section.id },
      department: { id: mine.department.id },
      totalValueUSD: 11,
      itemCount: 2,
      allowedActions: ['cancel'],
    });
    expect(res.body.data.requestNumber).toMatch(/^CR-\d{4}-\d{4,}$/);
    expect(lineFor(res.body.data, acid.id)).toMatchObject({ quantityRequested: 0.5, unitPriceUSD: 10, totalValueUSD: 5, status: 'pending' });
  });

  it('gives each request its own number', async () => {
    const [a, b] = await Promise.all([
      raise(sectionRep, [{ consumableItemId: gloves.id, quantity: 1 }]),
      raise(sectionRep, [{ consumableItemId: gloves.id, quantity: 1 }]),
    ]);
    expect(a.requestNumber).not.toBe(b.requestNumber);
  });

  it('keeps requesters inside their own section or department', async () => {
    const items = [{ consumableItemId: gloves.id, quantity: 1 }];
    expect((await write(sectionRep, 'post', R).send({ sectionId: other.section.id, items })).status).toBe(403);
    expect((await write(hod, 'post', R).send({ sectionId: other.section.id, items })).status).toBe(403);
    expect((await write(hod, 'post', R).send({ sectionId: otherSectionSameDept.id, items })).status).toBe(201);
    expect((await write(stores, 'post', R).send({ sectionId: mine.section.id, items })).status).toBe(403);
    expect((await write(sheq, 'post', R).send({ sectionId: mine.section.id, items })).status).toBe(403);
    expect((await write(deptRep, 'post', R).send({ sectionId: mine.section.id, items })).status).toBe(403);
  });

  it('validates the request', async () => {
    const empty = await write(sectionRep, 'post', R).send({ items: [] });
    expect(empty.status).toBe(422);
    const dup = await write(sectionRep, 'post', R).send({
      items: [
        { consumableItemId: gloves.id, quantity: 1 },
        { consumableItemId: gloves.id, quantity: 2 },
      ],
    });
    expect(dup.status).toBe(422);
    const zero = await write(sectionRep, 'post', R).send({ items: [{ consumableItemId: gloves.id, quantity: 0 }] });
    expect(zero.status).toBe(422);

    const retired = await cx.item('RETIRED', { isActive: false });
    const inactive = await write(sectionRep, 'post', R).send({ items: [{ consumableItemId: retired.id, quantity: 1 }] });
    expect(inactive.status).toBe(422);
    expect(inactive.body.error.details.fieldErrors.items).toBeDefined();

    const noSection = await write(admin, 'post', R).send({ items: [{ consumableItemId: gloves.id, quantity: 1 }] });
    expect(noSection.status).toBe(422);
    expect(noSection.body.error.details.fieldErrors.sectionId).toBeDefined();
  });

  it('lists the sections each user may request for', async () => {
    const rep = await sectionRep.get(`${R}/sections`);
    expect(rep.body.data.map((s: { id: string }) => s.id)).toEqual([mine.section.id]);
    const head = await hod.get(`${R}/sections`);
    expect(head.body.data.map((s: { id: string }) => s.id).sort()).toEqual([mine.section.id, otherSectionSameDept.id].sort());
    expect((await stores.get(`${R}/sections`)).body.data).toEqual([]);
  });
});

describe('scoping', () => {
  let id: string;
  beforeAll(async () => {
    id = (await raise(sectionRep, [{ consumableItemId: gloves.id, quantity: 2 }])).id;
  });

  it('requires a session', async () => {
    expect((await request(app).get(R)).status).toBe(401);
    expect((await request(app).get(`${R}/${id}`)).status).toBe(401);
  });

  it('shows a request to its section, department and the whole-mine roles only', async () => {
    for (const agent of [sectionRep, hod, deptRep, stores, sheq, admin]) {
      expect((await agent.get(`${R}/${id}`)).status).toBe(200);
    }
    for (const agent of [sectionRepSibling, hodOther]) {
      expect((await agent.get(`${R}/${id}`)).status).toBe(404);
      const list = await agent.get(R).query({ pageSize: 100 });
      expect(list.body.data.map((r: { id: string }) => r.id)).not.toContain(id);
    }
  });

  it('ignores filters that would widen scope', async () => {
    const list = await hodOther.get(R).query({ departmentId: mine.department.id });
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([]);
  });

  it('pages and validates list queries', async () => {
    const list = await hod.get(R).query({ status: 'pending-hod-approval', pageSize: 1 });
    expect(list.status).toBe(200);
    expect(list.body.meta).toMatchObject({ page: 1, pageSize: 1 });
    expect(list.body.data[0].allowedActions).toEqual(['approve', 'reject']);
    for (const sort of ['requestNumber', 'requestDate', 'status', 'priority', 'totalValueUSD']) {
      expect((await hod.get(R).query({ sort, order: 'asc', q: 'CR-' })).status).toBe(200);
    }
    const today = new Date().toISOString().slice(0, 10);
    const dated = await sectionRep.get(R).query({ from: today, to: today });
    expect(dated.body.data.map((r: { id: string }) => r.id)).toContain(id);
    expect((await hod.get(R).query({ status: 'done' })).status).toBe(422);
    expect((await hod.get(R).query({ from: '31/01/2026' })).status).toBe(422);
  });
});

describe('HOD approval', () => {
  it('approves with reduced quantities and recalculates the value', async () => {
    const req = await raise(sectionRep, [
      { consumableItemId: gloves.id, quantity: 4 },
      { consumableItemId: acid.id, quantity: 1 },
    ]);
    const res = await write(hod, 'post', `${R}/${req.id}/approve`).send({
      comments: 'Acid is not needed',
      items: [
        { id: lineFor(req, gloves.id).id, quantity: 3 },
        { id: lineFor(req, acid.id).id, quantity: 0 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'stores-review', hodComments: 'Acid is not needed', totalValueUSD: 4.5 });
    expect(res.body.data.hodApprover).toBeTruthy();
    expect(lineFor(res.body.data, gloves.id)).toMatchObject({ quantityApproved: 3, status: 'approved', outstanding: 3 });
    expect(lineFor(res.body.data, acid.id)).toMatchObject({ quantityApproved: 0, status: 'rejected', totalValueUSD: 0 });

    const again = await write(hod, 'post', `${R}/${req.id}/approve`).send({});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('rejects approvals beyond what was asked for, or of nothing', async () => {
    const req = await raise(sectionRep, [{ consumableItemId: gloves.id, quantity: 2 }]);
    const line = req.items[0]!.id;
    expect((await write(hod, 'post', `${R}/${req.id}/approve`).send({ items: [{ id: line, quantity: 3 }] })).status).toBe(422);
    expect((await write(hod, 'post', `${R}/${req.id}/approve`).send({ items: [{ id: line, quantity: 0 }] })).status).toBe(422);
    const stranger = await write(hod, 'post', `${R}/${req.id}/approve`).send({ items: [{ id: acidStock.id, quantity: 1 }] });
    expect(stranger.status).toBe(422);
  });

  it('only lets the HOD of that department (or an admin) decide', async () => {
    const req = await raise(sectionRep, [{ consumableItemId: gloves.id, quantity: 1 }]);
    expect((await write(deptRep, 'post', `${R}/${req.id}/approve`).send({})).status).toBe(403);
    expect((await write(stores, 'post', `${R}/${req.id}/approve`).send({})).status).toBe(403);
    expect((await write(sectionRep, 'post', `${R}/${req.id}/reject`).send({ comments: 'nope' })).status).toBe(403);
    expect((await write(hodOther, 'post', `${R}/${req.id}/approve`).send({})).status).toBe(404);
    expect((await write(admin, 'post', `${R}/${req.id}/approve`).send({})).status).toBe(200);
  });

  it('rejects with a reason, after which nothing can be issued', async () => {
    const req = await raise(sectionRep, [{ consumableItemId: gloves.id, quantity: 1 }]);
    expect((await write(hod, 'post', `${R}/${req.id}/reject`).send({})).status).toBe(422);
    const res = await write(hod, 'post', `${R}/${req.id}/reject`).send({ comments: 'Over budget this month' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'hod-rejected', hodComments: 'Over budget this month', allowedActions: [] });
    expect((await write(stores, 'post', `${R}/${req.id}/fulfil`).send({})).status).toBe(409);
  });
});

describe('cancelling', () => {
  it('lets the requester cancel while it waits for the HOD', async () => {
    const req = await raise(sectionRep, [{ consumableItemId: gloves.id, quantity: 1 }]);
    expect((await write(hod, 'post', `${R}/${req.id}/cancel`).send({})).status).toBe(403);
    const res = await write(sectionRep, 'post', `${R}/${req.id}/cancel`).send({ comments: 'Raised twice' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'cancelled', notes: 'Cancelled: Raised twice' });
    expect((await write(sectionRep, 'post', `${R}/${req.id}/cancel`).send({})).status).toBe(409);
  });
});

describe('issuing', () => {
  const approved = async (items: Array<{ consumableItemId: string; quantity: number }>) => {
    const req = await raise(sectionRep, items);
    expect((await write(hod, 'post', `${R}/${req.id}/approve`).send({})).status).toBe(200);
    return req;
  };

  it('issues everything, deducts stock and records the issue', async () => {
    const before = await cx.quantityOf(glovesStock.id);
    const req = await approved([{ consumableItemId: gloves.id, quantity: 5 }]);
    expect((await hod.get(`${R}/${req.id}`)).body.data.allowedActions).toEqual([]);
    expect((await write(hod, 'post', `${R}/${req.id}/fulfil`).send({})).status).toBe(403);

    const res = await write(stores, 'post', `${R}/${req.id}/fulfil`).send({ comments: 'Collected by J. Moyo' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'fulfilled', storesComments: 'Collected by J. Moyo', shortages: [] });
    expect(res.body.data.fulfilledDate).toBeTruthy();
    expect(res.body.data.items[0]).toMatchObject({ quantityFulfilled: 5, outstanding: 0, status: 'fulfilled' });
    expect(res.body.data.issues).toHaveLength(1);
    expect(res.body.data.issues[0]).toMatchObject({ quantity: 5, totalValueUSD: 7.5, section: { id: mine.section.id } });
    expect(await cx.quantityOf(glovesStock.id)).toBe(before - 5);

    const issues = await deptRep.get(`${BASE}/allocations`).query({ consumableRequestId: req.id });
    expect(issues.body.data).toHaveLength(1);
    const searched = await stores.get(`${BASE}/allocations`).query({ q: `${fx.tag}-GLOVES`, sort: 'quantity' });
    expect(searched.status).toBe(200);
    expect(searched.body.data.length).toBeGreaterThanOrEqual(1);
    const hidden = await hodOther.get(`${BASE}/allocations`).query({ consumableRequestId: req.id });
    expect(hidden.body.data).toEqual([]);
  });

  it('issues what it can, reports shortages, and completes later', async () => {
    const req = await approved([
      { consumableItemId: gloves.id, quantity: 1 },
      { consumableItemId: acid.id, quantity: 3 },
    ]);
    const first = await write(stores, 'post', `${R}/${req.id}/fulfil`).send({});
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('partially-fulfilled');
    expect(first.body.data.shortages).toEqual([
      expect.objectContaining({ lineId: lineFor(req, acid.id).id, wanted: 3, inStock: 2 }),
    ]);
    expect(first.body.data.allowedActions).toEqual(['fulfil']);
    expect(await cx.quantityOf(acidStock.id)).toBe(2);

    // Issue the 2 on hand now, the last 1 after a delivery
    const part = await write(stores, 'post', `${R}/${req.id}/fulfil`).send({ items: [{ id: lineFor(req, acid.id).id, quantity: 2 }] });
    expect(part.body.data.status).toBe('partially-fulfilled');
    expect(lineFor(part.body.data, acid.id)).toMatchObject({ quantityFulfilled: 2, outstanding: 1, status: 'partial' });

    const over = await write(stores, 'post', `${R}/${req.id}/fulfil`).send({ items: [{ id: lineFor(req, acid.id).id, quantity: 2 }] });
    expect(over.status).toBe(422);

    const none = await write(stores, 'post', `${R}/${req.id}/fulfil`).send({});
    expect(none.status).toBe(409);
    expect(none.body.error.code).toBe('INSUFFICIENT_STOCK');

    await write(stores, 'post', `${BASE}/stock`).send({ consumableItemId: acid.id, quantity: 5 });
    const done = await write(stores, 'post', `${R}/${req.id}/fulfil`).send({});
    expect(done.body.data.status).toBe('fulfilled');
    expect(done.body.data.issues).toHaveLength(3);
    expect(await cx.quantityOf(acidStock.id)).toBe(4);
  });

  it('applies a double-clicked issue once', async () => {
    const before = await cx.quantityOf(glovesStock.id);
    const req = await approved([{ consumableItemId: gloves.id, quantity: 2 }]);
    const results = await Promise.all([
      write(stores, 'post', `${R}/${req.id}/fulfil`).send({}),
      write(stores, 'post', `${R}/${req.id}/fulfil`).send({}),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await cx.quantityOf(glovesStock.id)).toBe(before - 2);
  });

  it('lets stores turn a request down before issuing', async () => {
    const req = await approved([{ consumableItemId: gloves.id, quantity: 1 }]);
    expect((await write(stores, 'post', `${R}/${req.id}/stores-reject`).send({ comments: '' })).status).toBe(422);
    const res = await write(stores, 'post', `${R}/${req.id}/stores-reject`).send({ comments: 'Item discontinued' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'stores-rejected', storesComments: 'Item discontinued' });
  });
});
