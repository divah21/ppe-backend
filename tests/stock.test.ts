import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models, sequelize } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { app, createFixtures, signIn, write } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;

const fx = createFixtures();
let admin: Agent;
let stores: Agent;
let sheq: Agent;
let hod: Agent;
let deptRep: Agent;
let sectionRep: Agent;
let gloves: { id: string; name: string };
let boots: { id: string };
let glovesLine: { id: string };
let bootsLine: { id: string };
let emptyLine: { id: string };

const qty = async (id: string) => Number((await models.Stock.findByPk(id))!.quantity);

beforeAll(async () => {
  await prepareV2();
  const { department, section } = await fx.org();
  const scale = await fx.make('SizeScale', { code: `${fx.tag}-SC`, name: `${fx.tag} scale` });
  await fx.make('Size', { scaleId: scale.id, value: '9', label: '9', sortOrder: 1 });
  await fx.make('Size', { scaleId: scale.id, value: '10', label: '10', sortOrder: 2 });

  gloves = await fx.make('PPEItem', { name: `${fx.tag} Gloves`, itemCode: `${fx.tag}-GL`, category: `${fx.tag}-HANDS` });
  boots = await fx.make('PPEItem', {
    name: `${fx.tag} Boots`,
    itemCode: `${fx.tag}-BT`,
    category: `${fx.tag}-FEET`,
    hasSizeVariants: true,
    sizeScale: `${fx.tag}-SC`,
  });

  glovesLine = await fx.make('Stock', { ppeItemId: gloves.id, quantity: 50, minLevel: 10, unitPriceUSD: 2.5 });
  bootsLine = await fx.make('Stock', { ppeItemId: boots.id, size: '9', quantity: 3, minLevel: 5, unitPriceUSD: 40 });
  emptyLine = await fx.make('Stock', { ppeItemId: boots.id, size: '10', quantity: 0, minLevel: 5, unitPriceUSD: 40 });

  const employee = await fx.employee(section.id);
  await fx.make('Allocation', {
    employeeId: employee.id,
    ppeItemId: gloves.id,
    stockId: glovesLine.id,
    quantity: 2,
    status: 'active',
  });

  admin = await signIn((await fx.user('admin')).username);
  stores = await signIn((await fx.user('stores')).username);
  sheq = await signIn((await fx.user('sheq')).username);
  hod = await signIn((await fx.user('hod', { departmentId: department.id })).username);
  deptRep = await signIn((await fx.user('department-rep', { departmentId: department.id })).username);
  sectionRep = await signIn((await fx.user('section-rep', { departmentId: department.id, sectionId: section.id })).username);
});
afterAll(() => fx.cleanup());

describe('GET /api/v2/stock', () => {
  it('pages and searches by item name or code', async () => {
    const res = await stores.get('/api/v2/stock').query({ q: fx.tag, pageSize: 2, sort: 'quantity', order: 'desc' });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 3, pageCount: 2 });
    expect(res.body.data[0]).toMatchObject({
      id: glovesLine.id,
      quantity: 50,
      totalValueUSD: 125,
      lowStock: false,
      ppeItem: { id: gloves.id, itemCode: `${fx.tag}-GL` },
    });
    const byCode = await stores.get('/api/v2/stock').query({ q: `${fx.tag}-BT` });
    expect(byCode.body.meta.total).toBe(2);
  });

  it('filters by category, item, size and low stock', async () => {
    const get = (query: Record<string, string>) => stores.get('/api/v2/stock').query({ q: fx.tag, ...query });
    expect((await get({ category: `${fx.tag}-FEET` })).body.meta.total).toBe(2);
    expect((await get({ ppeItemId: gloves.id })).body.data.map((s: { id: string }) => s.id)).toEqual([glovesLine.id]);
    expect((await get({ size: '9' })).body.data.map((s: { id: string }) => s.id)).toEqual([bootsLine.id]);
    const low = await get({ lowStock: 'true', sort: 'quantity', order: 'asc' });
    expect(low.body.data.map((s: { id: string }) => s.id)).toEqual([emptyLine.id, bootsLine.id]);
    expect(low.body.data.every((s: { lowStock: boolean }) => s.lowStock)).toBe(true);
    const above = await get({ lowStock: 'false' });
    expect(above.body.data.map((s: { id: string }) => s.id)).toEqual([glovesLine.id]);
  });

  it('sorts by value and item', async () => {
    const byValue = await stores.get('/api/v2/stock').query({ q: fx.tag, sort: 'value', order: 'desc' });
    expect(byValue.body.data.map((s: { id: string }) => s.id)[0]).toBe(glovesLine.id);
    const byItem = await stores.get('/api/v2/stock').query({ q: fx.tag, sort: 'item', order: 'asc' });
    expect(byItem.body.data[0].ppeItem.name).toBe(`${fx.tag} Boots`);
  });

  it('rejects bad query parameters', async () => {
    expect((await stores.get('/api/v2/stock').query({ sort: 'unitCost' })).status).toBe(422);
    expect((await stores.get('/api/v2/stock').query({ ppeItemId: 'nope' })).status).toBe(422);
    expect((await stores.get('/api/v2/stock').query({ lowStock: 'yes' })).status).toBe(422);
  });

  it('lets SHEQ read but not department roles', async () => {
    expect((await sheq.get('/api/v2/stock').query({ q: fx.tag })).status).toBe(200);
    expect((await hod.get('/api/v2/stock')).status).toBe(403);
    expect((await hod.get(`/api/v2/stock/${glovesLine.id}`)).status).toBe(403);
    expect((await hod.get('/api/v2/stock/summary')).status).toBe(403);
  });

  it('requires a session', async () => {
    expect((await request(app).get('/api/v2/stock')).status).toBe(401);
    expect((await request(app).get('/api/v2/stock/summary')).status).toBe(401);
  });
});

describe('GET /api/v2/stock/summary and /lookups', () => {
  it('totals lines, units, value and low stock', async () => {
    const res = await sheq.get('/api/v2/stock/summary');
    expect(res.status).toBe(200);
    const s = res.body.data;
    expect(s.totalLines).toBeGreaterThanOrEqual(3);
    expect(s.totalUnits).toBeGreaterThanOrEqual(53);
    expect(s.totalValueUSD).toBeGreaterThanOrEqual(245);
    expect(s.lowStockCount).toBeGreaterThanOrEqual(2);
    expect(s.outOfStockCount).toBeGreaterThanOrEqual(1);
  });

  it('lists active items with their sizes and the categories', async () => {
    const res = await stores.get('/api/v2/stock/lookups');
    expect(res.status).toBe(200);
    const item = res.body.data.items.find((i: { id: string }) => i.id === boots.id);
    expect(item).toMatchObject({ hasSizeVariants: true, sizes: ['9', '10'] });
    expect(res.body.data.categories).toContain(`${fx.tag}-HANDS`);
  });
});

describe('GET /api/v2/stock/:id', () => {
  it('returns the line with recent issues', async () => {
    const res = await sheq.get(`/api/v2/stock/${glovesLine.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: glovesLine.id, issuedCount: 1, issuedUnits: 2 });
    expect(res.body.data.recentIssues[0]).toMatchObject({ quantity: 2, status: 'active', employee: { name: expect.any(String) } });
  });

  it('404s an unknown line and 422s a bad id', async () => {
    expect((await stores.get('/api/v2/stock/00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await stores.get('/api/v2/stock/not-a-uuid')).status).toBe(422);
  });
});

describe('POST /api/v2/stock', () => {
  it('creates a new line, then merges a second receipt of the same variant', async () => {
    const body = { ppeItemId: boots.id, size: '10', gender: 'male', quantity: 4, minLevel: 2, unitPriceUSD: 42 };
    const created = await write(stores, 'post', '/api/v2/stock').send(body);
    expect(created.status).toBe(201);
    fx.track('Stock', created.body.data.stock.id);
    expect(created.body.data).toMatchObject({ merged: false, stock: { quantity: 4, size: '10', gender: 'male', location: 'Main Store' } });

    const merged = await write(stores, 'post', '/api/v2/stock').send({ ...body, quantity: 6, minLevel: 0, unitPriceUSD: 45 });
    expect(merged.status).toBe(200);
    expect(merged.body.data).toMatchObject({
      merged: true,
      stock: { id: created.body.data.stock.id, quantity: 10, minLevel: 0, unitPriceUSD: 45 },
    });

    const logs = await models.AuditLog.count({ where: { entityId: created.body.data.stock.id, action: ['STOCK_CREATE', 'STOCK_TOPUP'] } });
    expect(logs).toBe(2);
  });

  it('validates the size against the item and required fields', async () => {
    const badSize = await write(stores, 'post', '/api/v2/stock').send({ ppeItemId: boots.id, size: '99', quantity: 1, unitPriceUSD: 1 });
    expect(badSize.status).toBe(422);
    expect(badSize.body.error.details.fieldErrors.size).toBeDefined();

    const noSize = await write(stores, 'post', '/api/v2/stock').send({ ppeItemId: boots.id, quantity: 1, unitPriceUSD: 1 });
    expect(noSize.status).toBe(422);

    const unknown = await write(stores, 'post', '/api/v2/stock').send({
      ppeItemId: '00000000-0000-4000-8000-000000000000',
      quantity: 1,
      unitPriceUSD: 1,
    });
    expect(unknown.status).toBe(422);
    expect(unknown.body.error.details.fieldErrors.ppeItemId).toBeDefined();

    const bad = await write(stores, 'post', '/api/v2/stock').send({ ppeItemId: gloves.id, quantity: -1, minLevel: 5, maxLevel: 2 });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.details.fieldErrors)).toEqual(expect.arrayContaining(['quantity', 'unitPriceUSD']));
  });

  it('forbids read-only roles', async () => {
    const body = { ppeItemId: gloves.id, quantity: 1, unitPriceUSD: 1 };
    expect((await write(sheq, 'post', '/api/v2/stock').send(body)).status).toBe(403);
    expect((await write(hod, 'post', '/api/v2/stock').send(body)).status).toBe(403);
    expect((await request(app).post('/api/v2/stock').send(body)).status).toBe(401);
  });
});

describe('POST /api/v2/stock/:id/adjust', () => {
  it('adds and removes stock and audits the reason', async () => {
    const up = await write(stores, 'post', `/api/v2/stock/${glovesLine.id}/adjust`).send({ delta: 5, reason: 'Found in bin' });
    expect(up.status).toBe(200);
    expect(up.body.data).toMatchObject({ previousQuantity: 50, quantity: 55, stock: { quantity: 55 } });

    const down = await write(admin, 'post', `/api/v2/stock/${glovesLine.id}/adjust`).send({ delta: -15, reason: 'Damaged' });
    expect(down.body.data).toMatchObject({ previousQuantity: 55, quantity: 40 });

    const log = await models.AuditLog.findOne({ where: { entityId: glovesLine.id, action: 'STOCK_ADJUST' }, order: [['createdAt', 'DESC']] });
    expect(log?.meta).toMatchObject({ delta: -15, reason: 'Damaged', previousQuantity: 55, newQuantity: 40 });
  });

  it('refuses to go below zero', async () => {
    const res = await write(stores, 'post', `/api/v2/stock/${bootsLine.id}/adjust`).send({ delta: -4, reason: 'Count' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'INSUFFICIENT_STOCK', details: { available: 3 } });
    expect(await qty(bootsLine.id)).toBe(3);
  });

  it('never oversells under concurrent removals', async () => {
    const send = () => write(stores, 'post', `/api/v2/stock/${bootsLine.id}/adjust`).send({ delta: -2, reason: 'Race' });
    const results = await Promise.all([send(), send()]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await qty(bootsLine.id)).toBe(1);
  });

  it('validates the change and reason', async () => {
    const zero = await write(stores, 'post', `/api/v2/stock/${glovesLine.id}/adjust`).send({ delta: 0, reason: 'nothing' });
    expect(zero.status).toBe(422);
    const noReason = await write(stores, 'post', `/api/v2/stock/${glovesLine.id}/adjust`).send({ delta: 1 });
    expect(noReason.body.error.details.fieldErrors.reason).toBeDefined();
    const fraction = await write(stores, 'post', `/api/v2/stock/${glovesLine.id}/adjust`).send({ delta: 1.5, reason: 'x y z' });
    expect(fraction.status).toBe(422);
  });

  it('404s an unknown line and forbids read-only roles', async () => {
    const body = { delta: 1, reason: 'Count' };
    expect((await write(stores, 'post', '/api/v2/stock/00000000-0000-4000-8000-000000000000/adjust').send(body)).status).toBe(404);
    expect((await write(sheq, 'post', `/api/v2/stock/${glovesLine.id}/adjust`).send(body)).status).toBe(403);
    expect((await request(app).post(`/api/v2/stock/${glovesLine.id}/adjust`).send(body)).status).toBe(401);
  });
});

describe('POST /api/v2/stock/bulk-topup', () => {
  it('tops up several lines in one go', async () => {
    const before = [await qty(glovesLine.id), await qty(emptyLine.id)];
    const res = await write(stores, 'post', '/api/v2/stock/bulk-topup').send({
      items: [
        { stockId: glovesLine.id, quantity: 10 },
        { stockId: emptyLine.id, quantity: 7 },
      ],
      reason: 'Delivery 42',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.updated).toHaveLength(2);
    expect([await qty(glovesLine.id), await qty(emptyLine.id)]).toEqual([before[0]! + 10, before[1]! + 7]);
    expect((await models.Stock.findByPk(emptyLine.id))!.lastRestocked).not.toBeNull();
    expect(await models.AuditLog.count({ where: { entityId: emptyLine.id, action: 'STOCK_TOPUP' } })).toBe(1);
  });

  it('changes nothing when any line is missing', async () => {
    const before = await qty(glovesLine.id);
    const res = await write(stores, 'post', '/api/v2/stock/bulk-topup').send({
      items: [
        { stockId: glovesLine.id, quantity: 10 },
        { stockId: '00000000-0000-4000-8000-000000000000', quantity: 1 },
      ],
    });
    expect(res.status).toBe(404);
    expect(await qty(glovesLine.id)).toBe(before);
  });

  it('validates the batch', async () => {
    const post = (body: unknown) => write(stores, 'post', '/api/v2/stock/bulk-topup').send(body as object);
    expect((await post({ items: [] })).status).toBe(422);
    expect((await post({ items: [{ stockId: glovesLine.id, quantity: 0 }] })).status).toBe(422);
    expect(
      (await post({ items: [{ stockId: glovesLine.id, quantity: 1 }, { stockId: glovesLine.id, quantity: 2 }] })).status
    ).toBe(422);
  });

  it('forbids read-only roles', async () => {
    const body = { items: [{ stockId: glovesLine.id, quantity: 1 }] };
    expect((await write(sheq, 'post', '/api/v2/stock/bulk-topup').send(body)).status).toBe(403);
    expect((await request(app).post('/api/v2/stock/bulk-topup').send(body)).status).toBe(401);
  });
});

describe('stock review fixes', () => {
  it('matches the search against the category too', async () => {
    const res = await stores.get('/api/v2/stock').query({ q: `${fx.tag}-HANDS` });
    expect(res.body.data.map((s: { id: string }) => s.id)).toEqual([glovesLine.id]);
  });

  it('keeps department and section roles out of every route', async () => {
    for (const agent of [deptRep, sectionRep]) {
      expect((await agent.get('/api/v2/stock')).status).toBe(403);
      expect((await agent.get('/api/v2/stock/summary')).status).toBe(403);
      expect((await agent.get('/api/v2/stock/lookups')).status).toBe(403);
      expect((await agent.get(`/api/v2/stock/${glovesLine.id}`)).status).toBe(403);
      const before = await qty(glovesLine.id);
      expect((await write(agent, 'post', `/api/v2/stock/${glovesLine.id}/adjust`).send({ delta: 1, reason: 'Count' })).status).toBe(403);
      expect(
        (await write(agent, 'post', '/api/v2/stock/bulk-topup').send({ items: [{ stockId: glovesLine.id, quantity: 1 }] })).status
      ).toBe(403);
      expect((await write(agent, 'post', '/api/v2/stock').send({ ppeItemId: gloves.id, quantity: 1, unitPriceUSD: 1 })).status).toBe(403);
      expect(await qty(glovesLine.id)).toBe(before);
    }
  });

  it('applies an adjustment once when the client sends the quantity it saw', async () => {
    const current = await qty(glovesLine.id);
    const body = { delta: -1, reason: 'Stock take', expectedQuantity: current };
    const first = await write(stores, 'post', `/api/v2/stock/${glovesLine.id}/adjust`).send(body);
    expect(first.status).toBe(200);
    const retry = await write(stores, 'post', `/api/v2/stock/${glovesLine.id}/adjust`).send(body);
    expect(retry.status).toBe(409);
    expect(retry.body.error).toMatchObject({ code: 'CONFLICT', details: { quantity: current - 1 } });
    expect(await qty(glovesLine.id)).toBe(current - 1);
  });

  it('receives a resubmitted receipt only once when the client sends the quantity it saw', async () => {
    const body = { ppeItemId: gloves.id, color: 'zz-white', quantity: 4, unitPriceUSD: 1, expectedQuantity: 0 };
    const first = await write(stores, 'post', '/api/v2/stock').send(body);
    expect(first.status).toBe(201);
    fx.track('Stock', first.body.data.stock.id);
    const retry = await write(stores, 'post', '/api/v2/stock').send(body);
    expect(retry.status).toBe(409);
    expect(retry.body.error).toMatchObject({ code: 'CONFLICT', details: { quantity: 4 } });

    const topup = await write(stores, 'post', '/api/v2/stock').send({ ...body, expectedQuantity: 4 });
    expect(topup.status).toBe(200);
    expect((await write(stores, 'post', '/api/v2/stock').send({ ...body, expectedQuantity: 4 })).status).toBe(409);
    expect(await qty(first.body.data.stock.id)).toBe(8);
  });

  it('applies a bulk top-up once when the client sends the quantities it saw', async () => {
    const before = [await qty(glovesLine.id), await qty(bootsLine.id)];
    const body = {
      items: [
        { stockId: glovesLine.id, quantity: 2, expectedQuantity: before[0] },
        { stockId: bootsLine.id, quantity: 3, expectedQuantity: before[1] },
      ],
    };
    expect((await write(stores, 'post', '/api/v2/stock/bulk-topup').send(body)).status).toBe(200);
    const retry = await write(stores, 'post', '/api/v2/stock/bulk-topup').send(body);
    expect(retry.status).toBe(409);
    expect(retry.body.error).toMatchObject({
      code: 'CONFLICT',
      details: { quantities: { [glovesLine.id]: before[0]! + 2, [bootsLine.id]: before[1]! + 3 } },
    });
    expect([await qty(glovesLine.id), await qty(bootsLine.id)]).toEqual([before[0]! + 2, before[1]! + 3]);
  });

  it('keeps the existing levels when a receipt leaves them blank', async () => {
    const line = await fx.make('Stock', { ppeItemId: gloves.id, color: 'zz-red', quantity: 1, minLevel: 30, reorderPoint: 40, unitPriceUSD: 1 });
    const res = await write(stores, 'post', '/api/v2/stock').send({ ppeItemId: gloves.id, color: 'zz-red', quantity: 2, unitPriceUSD: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.stock).toMatchObject({ id: line.id, quantity: 3, minLevel: 30, reorderPoint: 40 });
  });

  it('tops up the line that already holds the received batch', async () => {
    const a = await fx.make('Stock', { ppeItemId: gloves.id, color: 'zz-blue', batchNumber: 'zz-A', quantity: 1, unitPriceUSD: 1 });
    const b = await fx.make('Stock', { ppeItemId: gloves.id, color: 'zz-blue', batchNumber: 'zz-B', quantity: 1, unitPriceUSD: 1 });
    const res = await write(stores, 'post', '/api/v2/stock').send({
      ppeItemId: gloves.id,
      color: 'zz-blue',
      batchNumber: 'zz-B',
      quantity: 5,
      unitPriceUSD: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.stock).toMatchObject({ id: b.id, quantity: 6, batchNumber: 'zz-B' });
    expect(await qty(a.id)).toBe(1);
  });

  it('does not block on transactions that reference the PPE item', async () => {
    const t = await sequelize.transaction();
    // What a concurrent allocation insert's foreign key check holds on the item
    await sequelize.query('SELECT id FROM ppe_items WHERE id = :id FOR KEY SHARE', { replacements: { id: gloves.id }, transaction: t });
    const receipt = write(stores, 'post', '/api/v2/stock')
      .send({ ppeItemId: gloves.id, color: 'zz-green', quantity: 1, unitPriceUSD: 1 })
      .then((r) => r);
    const outcome = await Promise.race([receipt, new Promise<'blocked'>((r) => setTimeout(() => r('blocked'), 3000))]);
    await t.commit();
    const res = await receipt;
    if (res.body.data?.stock?.id) fx.track('Stock', res.body.data.stock.id);
    expect(outcome).not.toBe('blocked');
    expect(res.status).toBe(201);
  });
});
