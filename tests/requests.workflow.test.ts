import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { write } from './helpers';
import { createRequestWorld, type RequestWorld } from './requests.fixtures';

let w: RequestWorld;
const URL = '/api/v2/requests';
type Agent = RequestWorld['agents'][keyof RequestWorld['agents']];

const act = (agent: Agent, id: string, action: string, body: object = {}) => write(agent, 'post', `${URL}/${id}/${action}`).send(body);
const stockQty = async (row: { id: string }) => Number((await models.Stock.findByPk(row.id))!.quantity);

beforeAll(async () => {
  await prepareV2();
  w = await createRequestWorld();
});
afterAll(() => w.cleanup());

const raise = async (items = [{ ppeItemId: w.ppe.gloves.id, quantity: 2 }, { ppeItemId: w.ppe.boots.id, quantity: 2, size: '9' }]) => {
  const res = await write(w.agents.sectionRep, 'post', URL).send({ employeeId: w.employees.empA1.id, requestType: 'replacement', items });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; items: Array<{ id: string; ppeItem: { id: string }; size: string | null }> };
};

describe('approval chain', () => {
  let id: string;
  beforeAll(async () => {
    id = (await raise()).id;
  });

  it('pending: only the section rep (or admin) approves; others get 403 or 404', async () => {
    for (const agent of [w.agents.hod, w.agents.deptRep, w.agents.stores, w.agents.sheq]) {
      const res = await act(agent, id, 'approve');
      expect(res.status).toBe(403);
    }
    expect((await act(w.agents.sectionRepA2, id, 'approve')).status).toBe(404);
    expect((await act(w.agents.hodB, id, 'approve')).status).toBe(404);
    expect((await models.Request.findByPk(id))!.status).toBe('pending');
  });

  it('pending -> hod-review on section rep approval, recording who, when and the comment', async () => {
    const res = await act(w.agents.sectionRep, id, 'approve', { comment: 'Checked the old pair' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'hod-review', allowedActions: [] });
    const step = res.body.data.timeline.find((s: { key: string }) => s.key === 'sectionRep');
    expect(step).toMatchObject({ state: 'done', comment: 'Checked the old pair', actor: { id: w.users.sectionRep.id } });
    expect(step.at).toBeTruthy();
    const row = await models.Request.findByPk(id);
    expect(row).toMatchObject({ sectionRepApproverId: w.users.sectionRep.id, sectionRepComment: 'Checked the old pair' });
  });

  it('rejects a second approval of a stage the caller no longer owns (403)', async () => {
    const res = await act(w.agents.sectionRep, id, 'approve');
    expect(res.status).toBe(403);
    expect((await models.Request.findByPk(id))!.status).toBe('hod-review');
    const admin = await act(w.agents.admin, id, 'approve', {});
    expect(admin.status).toBe(200);
    expect(admin.body.data.status).toBe('stores-review');
    await models.Request.update({ status: 'hod-review', hodApproverId: null, hodApprovalDate: null }, { where: { id } });
  });

  it('hod-review: the department HOD approves; dept rep, stores and SHEQ cannot; another department cannot see it', async () => {
    expect((await w.agents.hod.get(`${URL}/${id}`)).body.data.allowedActions).toEqual(['approve', 'reject']);
    expect((await w.agents.deptRep.get(`${URL}/${id}`)).body.data.allowedActions).toEqual(['reject']);
    for (const agent of [w.agents.deptRep, w.agents.stores, w.agents.sheq]) expect((await act(agent, id, 'approve')).status).toBe(403);
    expect((await act(w.agents.hodB, id, 'approve')).status).toBe(404);

    const res = await act(w.agents.hod, id, 'approve', { comment: 'OK' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('stores-review');
    expect((await models.Request.findByPk(id))!.hodApproverId).toBe(w.users.hod.id);
  });

  it('stores-review: stores approve to approved; HOD cannot', async () => {
    expect((await act(w.agents.hod, id, 'approve')).status).toBe(403);
    const res = await act(w.agents.stores, id, 'approve');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'approved', allowedActions: ['fulfil'] });
    expect(res.body.data.timeline.map((s: { key: string; state: string }) => `${s.key}:${s.state}`)).toEqual([
      'submitted:done',
      'sectionRep:done',
      'hod:done',
      'stores:done',
      'issue:current',
    ]);
  });

  it('approved: no more approvals or rejections (409)', async () => {
    expect((await act(w.agents.stores, id, 'approve')).status).toBe(409);
    const reject = await act(w.agents.stores, id, 'reject', { reason: 'Too late' });
    expect(reject.status).toBe(409);
    expect(reject.body.error.code).toBe('INVALID_TRANSITION');
  });
});

describe('legacy SHEQ and department rep stages', () => {
  it('sheq-review -> hod-review by SHEQ only', async () => {
    const r = await w.insertRequest('sheq-review', w.employees.empA1, [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }], {
      sectionRepApprovalDate: new Date(),
    });
    expect((await act(w.agents.hod, r.id, 'approve')).status).toBe(403);
    const res = await act(w.agents.sheq, r.id, 'approve', { comment: 'Failure verified' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('hod-review');
    expect(res.body.data.timeline.find((s: { key: string }) => s.key === 'sheq')).toMatchObject({
      state: 'done',
      comment: 'Failure verified',
      actor: { id: w.users.sheq.id },
    });
  });

  it('dept-rep-review -> hod-review by the department rep only', async () => {
    const r = await w.insertRequest('dept-rep-review', w.employees.empA1, [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }]);
    expect((await act(w.agents.hod, r.id, 'approve')).status).toBe(403);
    expect((await act(w.agents.sheq, r.id, 'reject', { reason: 'Not mine' })).status).toBe(403);
    const res = await act(w.agents.deptRep, r.id, 'approve');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('hod-review');
    expect((await models.Request.findByPk(r.id))!.deptRepApproverId).toBe(w.users.deptRep.id);
  });

  it('SHEQ can reject at sheq-review', async () => {
    const r = await w.insertRequest('sheq-review', w.employees.empA1, [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }]);
    const res = await act(w.agents.sheq, r.id, 'reject', { reason: 'Not a failure' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
  });
});

describe("legacy rows that stored the creator's section", () => {
  it("are scoped by the employee's section, not the stored one", async () => {
    // v1 stored the creator's own section, e.g. an admin's, rather than the employee's
    const r = await w.insertRequest('hod-review', w.employees.empA1, [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }], {
      sectionId: w.b.section.id,
      departmentId: w.b.department.id,
    });
    expect((await w.agents.hodB.get(`${URL}/${r.id}`)).status).toBe(404);
    expect((await act(w.agents.hodB, r.id, 'approve')).status).toBe(404);
    const list = await w.agents.hodB.get(URL).query({ view: 'all', pageSize: 100 });
    expect(list.body.data.map((x: { id: string }) => x.id)).not.toContain(r.id);

    const mine = await w.agents.hod.get(`${URL}/${r.id}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data).toMatchObject({ section: { id: w.a.section.id }, department: { id: w.a.department.id } });
    expect((await act(w.agents.hod, r.id, 'approve')).status).toBe(200);
  });
});

describe('reject', () => {
  it('requires a reason (422)', async () => {
    const { id } = await raise();
    expect((await act(w.agents.sectionRep, id, 'reject', {})).status).toBe(422);
    const blank = await act(w.agents.sectionRep, id, 'reject', { reason: '  ' });
    expect(blank.status).toBe(422);
    expect(blank.body.error.details.fieldErrors.reason).toBeDefined();
  });

  it('follows v1 rejectors by stage', async () => {
    const pending = await raise();
    expect((await act(w.agents.hod, pending.id, 'reject', { reason: 'No' })).status).toBe(403);
    expect((await act(w.agents.stores, pending.id, 'reject', { reason: 'No' })).status).toBe(403);
    expect((await act(w.agents.sectionRepA2, pending.id, 'reject', { reason: 'No' })).status).toBe(404);

    const res = await act(w.agents.sectionRepPeer, pending.id, 'reject', { reason: 'Duplicate of last week' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'rejected',
      allowedActions: [],
      rejection: { reason: 'Duplicate of last week', by: { id: w.users.sectionRepPeer.id } },
    });
    const states = res.body.data.timeline.map((s: { key: string; state: string }) => `${s.key}:${s.state}`);
    expect(states).toEqual(['submitted:done', 'sectionRep:skipped', 'hod:skipped', 'stores:skipped', 'issue:skipped', 'rejected:rejected']);
    expect((await act(w.agents.sectionRep, pending.id, 'reject', { reason: 'Again' })).status).toBe(409);
  });

  it('lets the department rep reject at hod-review and stores at stores-review', async () => {
    const atHod = await w.insertRequest('hod-review', w.employees.empA1, [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }]);
    expect((await act(w.agents.deptRep, atHod.id, 'reject', { reason: 'Over budget' })).status).toBe(200);

    const atStores = await w.insertRequest('stores-review', w.employees.empA1, [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }]);
    expect((await act(w.agents.hod, atStores.id, 'reject', { reason: 'Changed my mind' })).status).toBe(403);
    expect((await act(w.agents.stores, atStores.id, 'reject', { reason: 'Discontinued' })).status).toBe(200);
    expect((await models.Request.findByPk(atStores.id))!).toMatchObject({ rejectedById: w.users.stores.id, rejectionReason: 'Discontinued' });
  });
});

describe('cancel', () => {
  it('lets the requester cancel their own pending request', async () => {
    const { id } = await raise();
    expect((await act(w.agents.sectionRepPeer, id, 'cancel')).status).toBe(403);
    expect((await act(w.agents.sectionRepA2, id, 'cancel')).status).toBe(404);
    expect((await act(w.agents.hod, id, 'cancel')).status).toBe(403);
    expect((await w.agents.sectionRepPeer.get(`${URL}/${id}`)).body.data.allowedActions).toEqual(['approve', 'reject']);

    const res = await act(w.agents.sectionRep, id, 'cancel', { reason: 'Raised by mistake' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'cancelled', rejection: { reason: 'Raised by mistake' } });
    expect((await act(w.agents.sectionRep, id, 'cancel')).status).toBe(409);
  });

  it('only cancels pending requests', async () => {
    const r = await w.insertRequest('hod-review', w.employees.empA1, [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }]);
    expect((await act(w.agents.sectionRep, r.id, 'cancel')).status).toBe(409);
    expect((await act(w.agents.admin, r.id, 'cancel')).status).toBe(409);
  });
});

describe('fulfil', () => {
  const approved = async (items: Array<{ ppeItemId: string; quantity: number; size?: string }>) => {
    const r = await w.insertRequest('approved', w.employees.empA1, items, { storesApprovalDate: new Date() });
    const rows = await models.RequestItem.findAll({ where: { requestId: r.id } });
    const item = (ppeItemId: string, size?: string) => rows.find((i) => i.ppeItemId === ppeItemId && (size ? i.size === size : true))!.id as string;
    return { id: r.id as string, item };
  };

  it('is for stores only and only on approved requests', async () => {
    const pending = await raise();
    const line = { requestItemId: pending.items[0]!.id, stockId: w.stock.gloves.id, quantity: 1 };
    expect((await act(w.agents.stores, pending.id, 'fulfil', { items: [line] })).status).toBe(409);
    expect((await act(w.agents.hod, pending.id, 'fulfil', { items: [line] })).status).toBe(403);
    expect((await act(w.agents.sectionRep, pending.id, 'fulfil', { items: [line] })).status).toBe(403);
  });

  it('validates lines (422)', async () => {
    const r = await approved([{ ppeItemId: w.ppe.gloves.id, quantity: 1 }]);
    expect((await act(w.agents.stores, r.id, 'fulfil', { items: [] })).status).toBe(422);
    const wrongStock = await act(w.agents.stores, r.id, 'fulfil', {
      items: [{ requestItemId: r.item(w.ppe.gloves.id), stockId: w.stock.boots8.id, quantity: 1 }],
    });
    expect(wrongStock.status).toBe(422);
    const notOnRequest = await act(w.agents.stores, r.id, 'fulfil', {
      items: [{ requestItemId: w.stock.gloves.id, stockId: w.stock.gloves.id, quantity: 1 }],
    });
    expect(notOnRequest.status).toBe(422);
    expect((await models.Request.findByPk(r.id))!.status).toBe('approved');
  });

  it('issues partly, then the rest, capping at what is outstanding', async () => {
    const r = await approved([
      { ppeItemId: w.ppe.gloves.id, quantity: 2 },
      { ppeItemId: w.ppe.boots.id, quantity: 2, size: '9' },
    ]);
    const gloves = r.item(w.ppe.gloves.id);
    const boots = r.item(w.ppe.boots.id);
    const before = { gloves: await stockQty(w.stock.gloves), boots9: await stockQty(w.stock.boots9), boots8: await stockQty(w.stock.boots8) };
    const budgetBefore = Number((await models.Budget.findByPk(w.budget.id))!.totalSpent);

    const first = await act(w.agents.stores, r.id, 'fulfil', {
      items: [
        { requestItemId: gloves, stockId: w.stock.gloves.id, quantity: 5 },
        { requestItemId: boots, stockId: w.stock.boots9.id, quantity: 1 },
      ],
      note: 'Size 9 short',
    });
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('partially-fulfilled');
    expect(first.body.data.allowedActions).toEqual(['fulfil']);
    const items = new Map(first.body.data.items.map((i: { id: string }) => [i.id, i]));
    expect(items.get(gloves)).toMatchObject({ quantity: 2, issuedQuantity: 2, outstanding: 0 });
    expect(items.get(boots)).toMatchObject({ quantity: 2, issuedQuantity: 1, outstanding: 1 });
    expect(await stockQty(w.stock.gloves)).toBe(before.gloves - 2);
    expect(await stockQty(w.stock.boots9)).toBe(before.boots9 - 1);

    const allocs = await models.Allocation.findAll({ where: { requestId: r.id }, order: [['totalCost', 'ASC']] });
    expect(allocs).toHaveLength(2);
    const glovesAlloc = allocs.find((a) => a.requestItemId === gloves)!;
    expect(glovesAlloc).toMatchObject({
      employeeId: w.employees.empA1.id,
      ppeItemId: w.ppe.gloves.id,
      stockId: w.stock.gloves.id,
      issuedById: w.users.stores.id,
      quantity: 2,
      status: 'active',
    });
    expect(Number(glovesAlloc.totalCost)).toBe(5);
    const months = (glovesAlloc.nextRenewalDate.getFullYear() - glovesAlloc.issueDate.getFullYear()) * 12 + glovesAlloc.nextRenewalDate.getMonth() - glovesAlloc.issueDate.getMonth();
    expect(months).toBe(6);
    expect(allocs.find((a) => a.requestItemId === boots)).toMatchObject({ size: '9', quantity: 1 });
    expect(Number((await models.Budget.findByPk(w.budget.id))!.totalSpent)).toBe(budgetBefore + 45);
    expect((await models.Request.findByPk(r.id))!).toMatchObject({ storesComment: 'Size 9 short', fulfilledByUserId: w.users.stores.id });

    const second = await act(w.agents.stores, r.id, 'fulfil', {
      items: [
        { requestItemId: gloves, stockId: w.stock.gloves.id, quantity: 1 },
        { requestItemId: boots, stockId: w.stock.boots8.id, quantity: 5 },
      ],
    });
    expect(second.status).toBe(200);
    expect(second.body.data.status).toBe('fulfilled');
    expect(second.body.data.allowedActions).toEqual([]);
    expect(await stockQty(w.stock.gloves)).toBe(before.gloves - 2);
    expect(await stockQty(w.stock.boots8)).toBe(before.boots8 - 1);
    const override = await models.Allocation.findOne({ where: { requestId: r.id, stockId: w.stock.boots8.id } });
    expect(override!.notes).toMatch(/size override: 9 → 8/);
    expect(second.body.data.allocations).toHaveLength(3);
    expect(second.body.data.timeline.at(-1)).toMatchObject({ key: 'issue', state: 'done', actor: { id: w.users.stores.id } });

    const again = await act(w.agents.stores, r.id, 'fulfil', {
      items: [{ requestItemId: gloves, stockId: w.stock.gloves.id, quantity: 1 }],
    });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_TRANSITION');
    expect(await models.Allocation.count({ where: { requestId: r.id } })).toBe(3);
  });

  it('answers 409 when nothing is left to issue on the lines given', async () => {
    const r = await approved([
      { ppeItemId: w.ppe.gloves.id, quantity: 1 },
      { ppeItemId: w.ppe.boots.id, quantity: 1, size: '8' },
    ]);
    const gloves = r.item(w.ppe.gloves.id);
    expect((await act(w.agents.stores, r.id, 'fulfil', { items: [{ requestItemId: gloves, stockId: w.stock.gloves.id, quantity: 1 }] })).status).toBe(200);
    const res = await act(w.agents.stores, r.id, 'fulfil', { items: [{ requestItemId: gloves, stockId: w.stock.gloves.id, quantity: 1 }] });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rolls back the whole issue when a stock line is short (409)', async () => {
    const r = await approved([
      { ppeItemId: w.ppe.gloves.id, quantity: 1 },
      { ppeItemId: w.ppe.helmet.id, quantity: 1 },
    ]);
    const glovesBefore = await stockQty(w.stock.gloves);
    const res = await act(w.agents.stores, r.id, 'fulfil', {
      items: [
        { requestItemId: r.item(w.ppe.gloves.id), stockId: w.stock.gloves.id, quantity: 1 },
        { requestItemId: r.item(w.ppe.helmet.id), stockId: w.stock.helmet.id, quantity: 1 },
      ],
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'INSUFFICIENT_STOCK', details: { stockId: w.stock.helmet.id, available: 0 } });
    expect(await stockQty(w.stock.gloves)).toBe(glovesBefore);
    expect(await models.Allocation.count({ where: { requestId: r.id } })).toBe(0);
    expect((await models.Request.findByPk(r.id))!.status).toBe('approved');
  });

  it('issues once when two fulfils race', async () => {
    const r = await approved([{ ppeItemId: w.ppe.gloves.id, quantity: 3 }]);
    const before = await stockQty(w.stock.gloves);
    const body = { items: [{ requestItemId: r.item(w.ppe.gloves.id), stockId: w.stock.gloves.id, quantity: 3 }] };
    const results = await Promise.all([act(w.agents.stores, r.id, 'fulfil', body), act(w.agents.admin, r.id, 'fulfil', body)]);
    expect(results.map((x) => x.status).sort()).toEqual([200, 409]);
    expect(await stockQty(w.stock.gloves)).toBe(before - 3);
    expect(await models.Allocation.count({ where: { requestId: r.id } })).toBe(1);
  });

  it('still issues, and records the spend, when the department is over budget', async () => {
    const r = await approved([{ ppeItemId: w.ppe.gloves.id, quantity: 2 }]);
    const original = await models.Budget.findByPk(w.budget.id);
    await models.Budget.update({ allocatedAmount: 1, totalSpent: 500 }, { where: { id: w.budget.id }, validate: false, hooks: false });
    try {
      const res = await act(w.agents.stores, r.id, 'fulfil', {
        items: [{ requestItemId: r.item(w.ppe.gloves.id), stockId: w.stock.gloves.id, quantity: 2 }],
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('fulfilled');
      const budget = (await models.Budget.findByPk(w.budget.id))!;
      expect(Number(budget.totalSpent)).toBe(505);
      expect(Number(budget.remainingBudget)).toBe(0);
    } finally {
      await models.Budget.update(
        { allocatedAmount: original!.allocatedAmount, totalSpent: original!.totalSpent },
        { where: { id: w.budget.id }, validate: false, hooks: false }
      );
    }
  });

  it("charges the employee's department budget even when the stored section is another department's", async () => {
    const r = await w.insertRequest('approved', w.employees.empA1, [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }], {
      sectionId: w.b.section.id,
      departmentId: w.b.department.id,
    });
    const item = (await models.RequestItem.findOne({ where: { requestId: r.id } }))!;
    const before = Number((await models.Budget.findByPk(w.budget.id))!.totalSpent);
    const res = await act(w.agents.stores, r.id, 'fulfil', { items: [{ requestItemId: item.id, stockId: w.stock.gloves.id, quantity: 1 }] });
    expect(res.status).toBe(200);
    expect(Number((await models.Budget.findByPk(w.budget.id))!.totalSpent)).toBe(before + 2.5);
  });

  it('refuses a stale issue when someone else issued on the item meanwhile (409)', async () => {
    const r = await approved([{ ppeItemId: w.ppe.gloves.id, quantity: 3 }]);
    const line = { requestItemId: r.item(w.ppe.gloves.id), stockId: w.stock.gloves.id, quantity: 1 };
    const options = await w.agents.stores.get(`${URL}/${r.id}/stock-options`);
    expect(options.body.data[0]).toMatchObject({ issued: 0, outstanding: 3 });

    expect((await act(w.agents.stores, r.id, 'fulfil', { items: [{ ...line, issued: 0 }] })).status).toBe(200);
    const before = await stockQty(w.stock.gloves);
    const stale = await act(w.agents.admin, r.id, 'fulfil', { items: [{ ...line, issued: 0 }] });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('CONFLICT');
    expect(await stockQty(w.stock.gloves)).toBe(before);
    expect(await models.Allocation.count({ where: { requestId: r.id } })).toBe(1);

    expect((await act(w.agents.admin, r.id, 'fulfil', { items: [{ ...line, issued: 1 }] })).status).toBe(200);
  });

  it('replaces the earlier allocation on an annual issue and records the allocation type', async () => {
    const yearAgo = new Date(Date.now() - 366 * 86_400_000);
    const prior = await w.fx.make('Allocation', {
      employeeId: w.employees.empA1b.id,
      ppeItemId: w.ppe.gloves.id,
      quantity: 1,
      issueDate: yearAgo,
      status: 'active',
      notes: 'Old pair',
    });
    const other = await w.fx.make('Allocation', {
      employeeId: w.employees.empA1b.id,
      ppeItemId: w.ppe.boots.id,
      quantity: 1,
      issueDate: yearAgo,
      status: 'active',
    });
    const r = await w.insertRequest('approved', w.employees.empA1b, [{ ppeItemId: w.ppe.gloves.id, quantity: 2 }], { requestType: 'annual' });
    const item = (await models.RequestItem.findOne({ where: { requestId: r.id } }))!;
    const res = await act(w.agents.stores, r.id, 'fulfil', {
      items: [
        { requestItemId: item.id, stockId: w.stock.gloves.id, quantity: 1 },
        { requestItemId: item.id, stockId: w.stock.gloves.id, quantity: 1 },
      ],
    });
    expect(res.status).toBe(200);

    await prior.reload();
    expect(prior.status).toBe('replaced');
    expect(prior.notes).toBe(`Old pair; Replaced by request #${res.body.data.number}`);
    expect((await models.Allocation.findByPk(other.id))!.status).toBe('active');
    const created = await models.Allocation.findAll({ where: { requestId: r.id } });
    expect(created).toHaveLength(2);
    expect(created.every((a) => a.status === 'active' && a.allocationType === 'annual')).toBe(true);

    const fresh = await w.insertRequest('approved', w.employees.empA1b, [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }], { requestType: 'new' });
    const freshItem = (await models.RequestItem.findOne({ where: { requestId: fresh.id } }))!;
    expect((await act(w.agents.stores, fresh.id, 'fulfil', { items: [{ requestItemId: freshItem.id, stockId: w.stock.gloves.id, quantity: 1 }] })).status).toBe(200);
    expect((await models.Allocation.findOne({ where: { requestId: fresh.id } }))!.allocationType).toBe('new-employee');
    expect(await models.Allocation.count({ where: { requestId: r.id, status: 'active' } })).toBe(2);
  });

  it("offers stock in the employee's gender first and never ranks the other gender as a match", async () => {
    const male = await w.fx.make('Stock', { ppeItemId: w.ppe.boots.id, quantity: 50, size: '10', gender: 'male', unitPriceUSD: 40 });
    const female = await w.fx.make('Stock', { ppeItemId: w.ppe.boots.id, quantity: 5, size: '10', gender: 'female', unitPriceUSD: 40 });
    await models.Employee.update({ gender: 'FEMALE' }, { where: { id: w.employees.empA1b.id } });
    try {
      const r = await w.insertRequest('approved', w.employees.empA1b, [{ ppeItemId: w.ppe.boots.id, quantity: 1, size: '10' }]);
      const res = await w.agents.stores.get(`${URL}/${r.id}/stock-options`);
      expect(res.status).toBe(200);
      const lines = res.body.data[0].stock as Array<{ stockId: string; gender: string | null; matchesSize: boolean; matchesGender: boolean }>;
      expect(lines[0]).toMatchObject({ stockId: female.id, gender: 'female', matchesSize: true, matchesGender: true });
      expect(lines.find((l) => l.stockId === male.id)).toMatchObject({ gender: 'male', matchesSize: true, matchesGender: false });
    } finally {
      await models.Employee.update({ gender: null }, { where: { id: w.employees.empA1b.id } });
      await models.Stock.update({ quantity: 0 }, { where: { id: [male.id, female.id] } });
    }
  });

  it('serves stock options to stores, matching sizes first', async () => {
    const r = await approved([{ ppeItemId: w.ppe.boots.id, quantity: 1, size: '9' }]);
    const res = await w.agents.stores.get(`${URL}/${r.id}/stock-options`);
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ requestItemId: r.item(w.ppe.boots.id), size: '9', outstanding: 1 });
    const lines = res.body.data[0].stock;
    expect(lines.every((l: { stockId: string }) => [w.stock.boots8.id, w.stock.boots9.id].includes(l.stockId))).toBe(true);
    if (lines.length > 1) expect(lines[0].matchesSize).toBe(true);
    expect((await w.agents.hod.get(`${URL}/${r.id}/stock-options`)).status).toBe(403);
  });
});
