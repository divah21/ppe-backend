import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models, sequelize } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { createFixtures, signIn, write } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;

const fx = createFixtures();
let stores: Agent, sheq: Agent, hod: Agent;
let gloves: { id: string; name: string; itemCode: string };
let boots: { id: string; name: string };
let glovesLine: { id: string };
let issuedLine: { id: string };
const URL = '/api/v2/stock';

beforeAll(async () => {
  await prepareV2();
  const { section } = await fx.org();
  gloves = await fx.make('PPEItem', { name: `${fx.tag} Gloves`, itemCode: `${fx.tag}-GL` });
  const scale = await fx.make('SizeScale', { code: `${fx.tag}-BS`, name: `${fx.tag} boot sizes` });
  for (const [i, value] of ['9', '10', '11'].entries()) await fx.make('Size', { scaleId: scale.id, value, sortOrder: i + 1 });
  boots = await fx.make('PPEItem', { name: `${fx.tag} Boots`, itemCode: `${fx.tag}-BT`, hasSizeVariants: true, sizeScale: `${fx.tag}-BS` });
  glovesLine = await fx.make('Stock', { ppeItemId: gloves.id, quantity: 10, unitPriceUSD: 2, location: 'Main Store' });
  issuedLine = await fx.make('Stock', { ppeItemId: boots.id, size: '9', quantity: 1, unitPriceUSD: 40, location: 'Main Store' });

  const employee = await fx.employee(section.id);
  await fx.make('Allocation', { employeeId: employee.id, ppeItemId: boots.id, stockId: issuedLine.id, quantity: 1, status: 'active', issueDate: new Date() });
  // An approved request for 5 boots in size 10, none in stock
  const raiser = await fx.user('section-rep', { sectionId: section.id });
  const r = await fx.make('Request', { employeeId: employee.id, requestedById: raiser.id, status: 'approved', requestType: 'new', sectionId: section.id });
  await fx.make('RequestItem', { requestId: r.id, ppeItemId: boots.id, quantity: 5, size: '10' });

  const sign = async (role: string, opts = {}) => signIn((await fx.user(role, opts)).username);
  stores = await sign('stores');
  sheq = await sign('sheq');
  hod = await sign('hod');
});
afterAll(async () => {
  await sequelize.query(`DELETE FROM stocks WHERE ppe_item_id IN (:ids)`, { replacements: { ids: [gloves.id, boots.id] } });
  await fx.cleanup();
});

describe('POST /stock/import', () => {
  const rows = () => [
    { itemCode: gloves.itemCode, quantity: 5, unitPriceUSD: 3 },
    { itemName: boots.name, size: '11', gender: 'MALE', quantity: 4, unitPriceUSD: 40 },
  ];

  it('checks without saving, then adds to existing lines and creates new ones', async () => {
    const check = await write(stores, 'post', `${URL}/import`).send({ rows: rows() });
    expect(check.status).toBe(200);
    expect(check.body.data).toMatchObject({ dryRun: true, created: 1, added: 1, updated: 0, units: 9, errors: [] });
    expect(Number((await models.Stock.findByPk(glovesLine.id))!.quantity)).toBe(10);

    const run = await write(stores, 'post', `${URL}/import`).send({ dryRun: false, rows: rows() });
    expect(run.status).toBe(201);
    expect(Number((await models.Stock.findByPk(glovesLine.id))!.quantity)).toBe(15);
    expect(await models.Stock.count({ where: { ppeItemId: boots.id, size: '11', gender: 'male' } })).toBe(1);
  });

  it('replaces quantity and price when asked to update existing lines', async () => {
    const run = await write(stores, 'post', `${URL}/import`).send({ dryRun: false, updateExisting: true, rows: [{ itemCode: gloves.itemCode, quantity: 7, unitPriceUSD: 4 }] });
    expect(run.body.data).toMatchObject({ updated: 1, created: 0 });
    const line = (await models.Stock.findByPk(glovesLine.id))!;
    expect(Number(line.quantity)).toBe(7);
    expect(Number(line.unitPriceUSD)).toBe(4);
  });

  it('saves nothing when any row is wrong, and says which', async () => {
    const res = await write(stores, 'post', `${URL}/import`).send({
      dryRun: false,
      rows: [
        { itemCode: gloves.itemCode, quantity: 1 },
        { itemCode: `${fx.tag}-NOPE`, quantity: 1 },
        { itemName: boots.name, quantity: 1 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.errors.map((e: { row: number }) => e.row)).toEqual([2, 3]);
    expect(Number((await models.Stock.findByPk(glovesLine.id))!.quantity)).toBe(7);
    const bad = await write(stores, 'post', `${URL}/import`).send({
      rows: [{ itemCode: gloves.itemCode, quantity: 1, gender: 'X' }, { itemCode: gloves.itemCode, quantity: '' }, { itemCode: gloves.itemCode, quantity: 1, expiryDate: '31/02/2026' }],
    });
    expect(bad.body.data.errors.map((e: { row: number; message: string }) => [e.row, e.message])).toEqual([
      [1, 'Gender is MALE, FEMALE or UNISEX'],
      [2, 'Quantity must be a whole number of 0 or more'],
      [3, 'Expiry date: use YYYY-MM-DD or DD/MM/YYYY'],
    ]);
    const dayFirst = await write(stores, 'post', `${URL}/import`).send({ rows: [{ itemCode: gloves.itemCode, quantity: 1, expiryDate: '03/04/2026' }] });
    expect(dayFirst.body.data.errors).toEqual([]);
    expect((await write(hod, 'post', `${URL}/import`).send({ rows: rows() })).status).toBe(403);
  });
});

describe('edit, delete and history', () => {
  it('edits a line’s details but not its quantity', async () => {
    const res = await write(stores, 'put', `${URL}/${glovesLine.id}`).send({ unitPriceUSD: 5, binLocation: 'B-4', minLevel: 2, quantity: 999 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ unitPriceUSD: 5, binLocation: 'B-4', minLevel: 2, quantity: 7 });
    expect((await write(sheq, 'put', `${URL}/${glovesLine.id}`).send({ unitPriceUSD: 1 })).status).toBe(403);
  });

  it('keeps a line that was issued from and deletes one that was not', async () => {
    expect((await write(stores, 'delete', `${URL}/${issuedLine.id}`)).status).toBe(409);
    const spare = await fx.make('Stock', { ppeItemId: gloves.id, quantity: 0, location: `${fx.tag} shelf` });
    expect((await write(stores, 'delete', `${URL}/${spare.id}`)).status).toBe(204);
    expect(await models.Stock.findByPk(spare.id)).toBeNull();
  });

  it('shows an import in the movements of each line it changed', async () => {
    await write(stores, 'post', `${URL}/import`).send({ dryRun: false, rows: [{ itemCode: gloves.itemCode, quantity: 2 }] });
    const moves = (await stores.get(`${URL}/${glovesLine.id}/movements`)).body.data;
    expect(moves[0]).toMatchObject({ kind: 'STOCK_IMPORT', change: 2, note: 'Spreadsheet import' });
  });

  it('refuses an edit that would duplicate another line, or a size the item does not come in', async () => {
    const twin = await fx.make('Stock', { ppeItemId: gloves.id, quantity: 1, location: `${fx.tag} twin` });
    const clash = await write(stores, 'put', `${URL}/${twin.id}`).send({ unitPriceUSD: 1, location: 'Main Store' });
    expect(clash.status).toBe(409);
    expect((await write(stores, 'put', `${URL}/${issuedLine.id}`).send({ unitPriceUSD: 1, size: 'XXXL' })).status).toBe(422);
  });

  it('records the reason code on adjustments and lists the line’s movements', async () => {
    const adj = await write(stores, 'post', `${URL}/${glovesLine.id}/adjust`).send({ delta: -2, reason: 'Two torn pairs', reasonCode: 'damage' });
    expect(adj.status).toBe(200);
    const res = await sheq.get(`${URL}/${glovesLine.id}/movements`);
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ kind: 'STOCK_ADJUST', change: -2, note: 'Two torn pairs' });
    expect(res.body.data.some((m: { kind: string }) => m.kind === 'STOCK_UPDATE')).toBe(true);
    const issued = await sheq.get(`${URL}/${issuedLine.id}/movements`);
    expect(issued.body.data).toContainEqual(expect.objectContaining({ kind: 'ISSUE', change: -1 }));
    expect((await write(stores, 'post', `${URL}/${glovesLine.id}/adjust`).send({ delta: 1, reason: 'Found', reasonCode: 'magic' })).status).toBe(422);
  });
});

describe('GET /stock/shortfalls', () => {
  it('lists what approved requests need beyond stock on hand, per size', async () => {
    const res = await sheq.get(`${URL}/shortfalls`).query({ q: fx.tag });
    expect(res.status).toBe(200);
    expect(res.body.data.rows).toEqual([expect.objectContaining({ ppeItemId: boots.id, size: '10', needed: 5, inStock: 0, shortBy: 5, requests: 1 })]);
    expect(res.body.data.blockedRequests).toBe(1);
    expect((await hod.get(`${URL}/shortfalls`)).status).toBe(403);
  });
});

describe('bulk top-up', () => {
  it('checks a file’s lines without saving', async () => {
    const res = await write(stores, 'post', `${URL}/bulk-topup`).send({
      dryRun: true,
      items: [{ stockId: glovesLine.id, quantity: 1 }, { stockId: '00000000-0000-0000-0000-000000000001', quantity: 1 }],
    });
    expect(res.body.data).toEqual({ missing: ['00000000-0000-0000-0000-000000000001'] });
  });

  it('records each line’s own reason', async () => {
    const res = await write(stores, 'post', `${URL}/bulk-topup`).send({ items: [{ stockId: glovesLine.id, quantity: 3, reason: 'Delivery 42' }] });
    expect(res.status).toBe(200);
    const moves = (await stores.get(`${URL}/${glovesLine.id}/movements`)).body.data;
    expect(moves[0]).toMatchObject({ kind: 'STOCK_TOPUP', change: 3, note: 'Delivery 42' });
  });
});
