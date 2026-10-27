import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { consumableFixtures } from './consumables.fixtures';
import { app, createFixtures, signIn, write } from './helpers';

const fx = createFixtures();
const cx = consumableFixtures(fx.tag);
type Agent = Awaited<ReturnType<typeof signIn>>;
let admin: Agent;
let stores: Agent;
let sectionRep: Agent;
let hod: Agent;

const BASE = '/api/v2/consumables';

beforeAll(async () => {
  await prepareV2();
  const mine = await fx.org();
  admin = await signIn((await fx.user('admin')).username);
  stores = await signIn((await fx.user('stores')).username);
  hod = await signIn((await fx.user('hod', { departmentId: mine.department.id })).username);
  sectionRep = await signIn((await fx.user('section-rep', { sectionId: mine.section.id })).username);
});
afterAll(async () => {
  await cx.cleanup();
  await fx.cleanup();
});

describe('items', () => {
  it('requires a session', async () => {
    expect((await request(app).get(`${BASE}/items`)).status).toBe(401);
    expect((await request(app).get(`${BASE}/stock`)).status).toBe(401);
  });

  it('lets stores create and edit items, and lists them for everyone', async () => {
    const created = await write(stores, 'post', `${BASE}/items`).send({
      productCode: `${fx.tag}-GLV`,
      description: 'Nitrile gloves box',
      category: 'cons',
      unitPriceUSD: 4.25,
      minLevel: 2,
      maxLevel: 10,
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      category: 'CONS',
      unit: 'EA',
      unitPriceUSD: 4.25,
      isActive: true,
      inStock: 0,
      stockAccount: '710019',
    });

    const updated = await write(stores, 'put', `${BASE}/items/${created.body.data.id}`).send({
      description: 'Nitrile gloves (100)',
      category: 'CONS',
      unit: 'BOX',
      isActive: false,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ description: 'Nitrile gloves (100)', unit: 'BOX', isActive: false, productCode: `${fx.tag}-GLV` });

    const listed = await sectionRep.get(`${BASE}/items`).query({ q: fx.tag, status: 'inactive' });
    expect(listed.status).toBe(200);
    expect(listed.body.data.map((i: { id: string }) => i.id)).toEqual([created.body.data.id]);

    const options = await sectionRep.get(`${BASE}/items/options`);
    expect(options.body.data.some((o: { id: string }) => o.id === created.body.data.id)).toBe(false);
  });

  it('refuses duplicate product codes regardless of case', async () => {
    await cx.item('DUP');
    const res = await write(stores, 'post', `${BASE}/items`).send({
      productCode: `${fx.tag}-dup`.toUpperCase(),
      description: 'Another',
      category: 'CONS',
    });
    expect(res.status).toBe(409);
  });

  it('validates input', async () => {
    const res = await write(admin, 'post', `${BASE}/items`).send({ productCode: '', category: 'CONS', minLevel: 5, maxLevel: 1 });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details.fieldErrors)).toEqual(expect.arrayContaining(['productCode', 'description']));
    expect((await sectionRep.get(`${BASE}/items`).query({ sort: 'notes' })).status).toBe(422);
    expect((await stores.get(`${BASE}/items/not-a-uuid`)).status).toBe(422);
  });

  it('forbids non-stores roles from writing', async () => {
    const body = { productCode: `${fx.tag}-X`, description: 'Nope', category: 'CONS' };
    expect((await write(sectionRep, 'post', `${BASE}/items`).send(body)).status).toBe(403);
    expect((await write(hod, 'post', `${BASE}/items/bulk`).send({ items: [body] })).status).toBe(403);
  });

  it('imports a stock sheet all or nothing', async () => {
    const items = [
      { productCode: `${fx.tag}-B1`, description: 'Bulk one', quantity: 12.5, unitPriceUSD: 2 },
      { productCode: `${fx.tag}-B2`, description: 'Bulk two', category: 'gesp' },
    ];
    const first = await write(stores, 'post', `${BASE}/items/bulk`).send({ items });
    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ created: 2, updated: 0, skipped: 0, stockSet: 1 });

    const again = await write(stores, 'post', `${BASE}/items/bulk`).send({ items: [{ ...items[0], quantity: 3 }] });
    expect(again.body.data).toMatchObject({ created: 0, skipped: 1 });

    const update = await write(stores, 'post', `${BASE}/items/bulk`).send({ updateExisting: true, items: [{ ...items[0], quantity: 3 }] });
    expect(update.body.data).toMatchObject({ updated: 1, stockSet: 1 });
    const stock = await stores.get(`${BASE}/stock`).query({ q: `${fx.tag}-B1` });
    expect(stock.body.data[0]).toMatchObject({ quantity: 3, totalValueUSD: 6 });

    // A new price on the sheet reprices the stock on hand, even when the quantity is unchanged
    const repriced = await write(stores, 'post', `${BASE}/items/bulk`).send({
      updateExisting: true,
      items: [{ ...items[0], quantity: 3, unitPriceUSD: 4.25 }],
    });
    expect(repriced.status).toBe(200);
    const after = await stores.get(`${BASE}/stock`).query({ q: `${fx.tag}-B1` });
    expect(after.body.data[0]).toMatchObject({ quantity: 3, unitPriceUSD: 4.25, totalValueUSD: 12.75 });

    const dup = await write(stores, 'post', `${BASE}/items/bulk`).send({ items: [items[1], items[1]] });
    expect(dup.status).toBe(422);
  });
});

describe('stock', () => {
  it('receives into one record per item with exact decimal totals', async () => {
    const item = await cx.item('KG', { unit: 'KG', unitPriceUSD: 3 });
    const first = await write(stores, 'post', `${BASE}/stock`).send({ consumableItemId: item.id, quantity: 0.1, batchNumber: 'B-1' });
    expect(first.status).toBe(201);
    const second = await write(stores, 'post', `${BASE}/stock`).send({ consumableItemId: item.id, quantity: 0.2 });
    expect(second.body.data).toMatchObject({ id: first.body.data.id, quantity: 0.3, totalValueUSD: 0.9, batchNumber: 'B-1' });
    expect(second.body.data.lastRestocked).toBeTruthy();

    const bad = await write(stores, 'post', `${BASE}/stock`).send({ consumableItemId: item.id, quantity: 0.001 });
    expect(bad.status).toBe(422);
    const missing = await write(stores, 'post', `${BASE}/stock`).send({ consumableItemId: randomUUID(), quantity: 1 });
    expect(missing.status).toBe(422);
    expect(missing.body.error.details.fieldErrors.consumableItemId).toBeDefined();
  });

  it('adjusts with a reason and never goes below zero', async () => {
    const item = await cx.item('ADJ');
    const stock = await cx.stock(item.id, 10);

    const noReason = await write(stores, 'post', `${BASE}/stock/${stock.id}/adjust`).send({ type: 'remove', quantity: 1 });
    expect(noReason.status).toBe(422);

    const tooMuch = await write(stores, 'post', `${BASE}/stock/${stock.id}/adjust`).send({ type: 'remove', quantity: 11, reason: 'Damaged' });
    expect(tooMuch.status).toBe(409);
    expect(tooMuch.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(await cx.quantityOf(stock.id)).toBe(10);

    const set = await write(stores, 'post', `${BASE}/stock/${stock.id}/adjust`).send({ type: 'set', quantity: 4, reason: 'Stock take' });
    expect(set.status).toBe(200);
    expect(set.body.data).toMatchObject({ quantity: 4, totalValueUSD: 10, isLow: true });
    expect(set.body.data.lastStockTake).toBeTruthy();
    expect(set.body.data.notes).toMatch(/set 4.00: Stock take/);

    expect((await write(hod, 'post', `${BASE}/stock/${stock.id}/adjust`).send({ type: 'add', quantity: 1, reason: 'x y z' })).status).toBe(403);
  });

  it('does not oversell under concurrent removals', async () => {
    const item = await cx.item('RACE');
    const stock = await cx.stock(item.id, 10);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        write(stores, 'post', `${BASE}/stock/${stock.id}/adjust`).send({ type: 'remove', quantity: 3, reason: 'Issued' })
      )
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await cx.quantityOf(stock.id)).toBe(1);
  });

  it('filters low stock and summarises', async () => {
    const low = await cx.item('LOW', { minLevel: 5 });
    const high = await cx.item('HIGH', { minLevel: 5 });
    await cx.stock(low.id, 2);
    await cx.stock(high.id, 50);

    const res = await sectionRep.get(`${BASE}/stock`).query({ q: fx.tag, lowStock: 'true', pageSize: 100 });
    expect(res.status).toBe(200);
    const codes = res.body.data.map((s: { productCode: string }) => s.productCode);
    expect(codes).toContain(`${fx.tag}-LOW`);
    expect(codes).not.toContain(`${fx.tag}-HIGH`);

    for (const sort of ['productCode', 'quantity', 'totalValueUSD', 'lastRestocked']) {
      expect((await sectionRep.get(`${BASE}/stock`).query({ q: fx.tag, sort, order: 'asc' })).status).toBe(200);
    }
    const byQty = await sectionRep.get(`${BASE}/stock`).query({ q: fx.tag, sort: 'quantity', order: 'desc', lowStock: 'false' });
    expect(byQty.body.data[0].productCode).toBe(`${fx.tag}-HIGH`);

    const summary = await sectionRep.get(`${BASE}/stock/summary`);
    expect(summary.body.data).toMatchObject({ totalItems: expect.any(Number), lowStockCount: expect.any(Number) });
    expect(summary.body.data.lowStockCount).toBeGreaterThanOrEqual(1);
  });
});
