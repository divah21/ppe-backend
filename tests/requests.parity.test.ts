import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models, sequelize } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { write } from './helpers';
import { createRequestWorld, type RequestWorld } from './requests.fixtures';

let w: RequestWorld;
const URL = '/api/v2/requests';

beforeAll(async () => {
  await prepareV2();
  w = await createRequestWorld();
});
afterAll(() => w.cleanup());

const approved = async (items: Array<{ ppeItemId: string; quantity: number; size?: string }>) => {
  const r = await w.insertRequest('approved', w.employees.empA1, items, { storesApprovalDate: new Date() });
  const rows = await models.RequestItem.findAll({ where: { requestId: r.id } });
  return { id: r.id as string, itemId: rows[0]!.id as string };
};

describe('list and detail', () => {
  it('filters by employee and prices requests at the average stock price', async () => {
    const r = await w.insertRequest('pending', w.employees.empA1b, [{ ppeItemId: w.ppe.gloves.id, quantity: 4 }]);
    const res = await w.agents.stores.get(URL).query({ view: 'all', employeeId: w.employees.empA1b.id });
    expect(res.status).toBe(200);
    expect(res.body.data.map((x: { id: string }) => x.id)).toEqual([r.id]);
    expect(res.body.data[0].estimatedCost).toBe(10);
    expect(res.body.data[0].visitor).toBeNull();
    expect((await w.agents.stores.get(URL).query({ employeeId: 'nope' })).status).toBe(422);
  });

  it('summarises the filtered requests for the cards above the list', async () => {
    const old = await w.insertRequest('hod-review', w.employees.empA1b, [{ ppeItemId: w.ppe.gloves.id, quantity: 2 }]);
    await models.Request.update({ createdAt: new Date(Date.now() - 10 * 86_400_000) }, { where: { id: old.id }, silent: true });
    const res = await w.agents.hod.get(`${URL}/summary`).query({ employeeId: w.employees.empA1b.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ mine: 1, staleDays: 7, stale: 1 });
    expect(res.body.data.openValue).toBeGreaterThanOrEqual(5);
    expect((await w.agents.hodB.get(`${URL}/summary`).query({ employeeId: w.employees.empA1b.id })).body.data).toMatchObject({ mine: 0, stale: 0, openValue: 0 });
  });

  it('says who issued each line and what the issue cost', async () => {
    const r = await approved([{ ppeItemId: w.ppe.gloves.id, quantity: 2 }]);
    const res = await write(w.agents.stores, 'post', `${URL}/${r.id}/fulfil`).send({
      items: [{ requestItemId: r.itemId, stockId: w.stock.gloves.id, quantity: 2 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.allocations[0]).toMatchObject({ issuedBy: { id: w.users.stores.id }, substituted: false, quantity: 2 });
    expect(res.body.data.issuedCost).toBe(5);
  });
});

describe('visitor requests', () => {
  it('lets a section rep raise an emergency request for a visitor, owned by their section', async () => {
    const res = await write(w.agents.sectionRep, 'post', URL).send({
      visitor: { name: 'Tendai Visitor', company: 'Acme Drilling' },
      requestType: 'replacement',
      items: [{ ppeItemId: w.ppe.helmet.id, quantity: 1 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      employee: null,
      visitor: { name: 'Tendai Visitor', company: 'Acme Drilling' },
      requestType: 'emergency',
      isEmergencyVisitor: true,
      section: { id: w.a.section.id },
      status: 'pending',
    });
    // Scoped like any request of the section, and searchable by the visitor's name
    const found = await w.agents.hod.get(URL).query({ view: 'all', q: 'Tendai' });
    expect(found.body.data.map((x: { id: string }) => x.id)).toContain(res.body.data.id);
    expect((await w.agents.hodB.get(`${URL}/${res.body.data.id}`)).status).toBe(404);
  });

  it('offers the active catalogue, without a matrix, to whoever raises visitor requests', async () => {
    const res = await w.agents.sectionRep.get(`${URL}/catalogue`);
    expect(res.status).toBe(200);
    const boots = res.body.data.items.find((i: { ppeItemId: string }) => i.ppeItemId === w.ppe.boots.id);
    expect(boots).toMatchObject({ inMatrix: false, hasSizeVariants: true, isDue: true });
    expect((await w.agents.hod.get(`${URL}/catalogue`)).status).toBe(403);
  });

  it('needs an employee or a visitor, not both, and an admin must name the section', async () => {
    const items = [{ ppeItemId: w.ppe.helmet.id, quantity: 1 }];
    expect((await write(w.agents.sectionRep, 'post', URL).send({ items })).status).toBe(422);
    const both = await write(w.agents.sectionRep, 'post', URL).send({ employeeId: w.employees.empA1.id, visitor: { name: 'X' }, items });
    expect(both.status).toBe(422);
    const adminNoSection = await write(w.agents.admin, 'post', URL).send({ visitor: { name: 'X' }, items });
    expect(adminNoSection.status).toBe(422);
    expect(adminNoSection.body.error.details.fieldErrors['visitor.sectionId']).toBeDefined();
    const admin = await write(w.agents.admin, 'post', URL).send({ visitor: { name: 'X', sectionId: w.b.section.id }, items });
    expect(admin.status).toBe(201);
    expect(admin.body.data.section.id).toBe(w.b.section.id);
  });

  it('issues to a visitor and books the spend to the raising section', async () => {
    const created = await write(w.agents.sectionRep, 'post', URL).send({
      visitor: { name: 'Rudo Contractor' },
      items: [{ ppeItemId: w.ppe.gloves.id, quantity: 1 }],
    });
    const id = created.body.data.id as string;
    await models.Request.update({ status: 'approved' }, { where: { id } });
    const res = await write(w.agents.stores, 'post', `${URL}/${id}/fulfil`).send({
      items: [{ requestItemId: created.body.data.items[0].id, stockId: w.stock.gloves.id, quantity: 1 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('fulfilled');
    const [row] = (await sequelize.query(`SELECT employee_id, section_id, department_id FROM allocations WHERE request_id = :id`, {
      replacements: { id },
    })) as unknown as [Array<{ employee_id: string | null; section_id: string; department_id: string }>];
    expect(row[0]).toEqual({ employee_id: null, section_id: w.a.section.id, department_id: w.a.department.id });
  });
});

describe('substitution', () => {
  it('needs the substitute flag to issue a different item', async () => {
    const r = await approved([{ ppeItemId: w.ppe.helmet.id, quantity: 1 }]);
    const line = { requestItemId: r.itemId, stockId: w.stock.gloves.id, quantity: 1 };
    expect((await write(w.agents.stores, 'post', `${URL}/${r.id}/fulfil`).send({ items: [line] })).status).toBe(422);

    const res = await write(w.agents.stores, 'post', `${URL}/${r.id}/fulfil`).send({ items: [{ ...line, substitute: true }] });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('fulfilled');
    expect(res.body.data.items[0]).toMatchObject({ issuedQuantity: 1, outstanding: 0 });
    expect(res.body.data.allocations[0]).toMatchObject({ ppeItemName: w.ppe.gloves.name, substituted: true });
    const alloc = await models.Allocation.findOne({ where: { requestId: r.id } });
    expect(alloc!.ppeItemId).toBe(w.ppe.gloves.id);
    expect(alloc!.notes).toMatch(/in place of/);
  });

  it('lists in-stock substitutes to stores only', async () => {
    const r = await approved([{ ppeItemId: w.ppe.helmet.id, quantity: 1 }]);
    const res = await w.agents.stores.get(`${URL}/${r.id}/substitutes`).query({ q: w.fx.tag });
    expect(res.status).toBe(200);
    const names = res.body.data.map((s: { ppeItemName: string }) => s.ppeItemName);
    expect(names).toContain(w.ppe.gloves.name);
    expect(names).not.toContain(w.ppe.helmet.name);
    expect((await w.agents.hod.get(`${URL}/${r.id}/substitutes`).query({ q: w.fx.tag })).status).toBe(403);
    expect((await w.agents.stores.get(`${URL}/${r.id}/substitutes`).query({ q: 'a' })).status).toBe(422);
  });
});
