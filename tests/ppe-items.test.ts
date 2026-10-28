import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { catalogueFixtures } from './catalogue.fixtures';
import { app, createFixtures, signIn, write } from './helpers';

const fx = createFixtures();
const cat = catalogueFixtures(fx);
type Agent = Awaited<ReturnType<typeof signIn>>;
let admin: Agent;
let stores: Agent;
let sheq: Agent;
let hod: Agent;
let sectionRep: Agent;
let scale: { id: string; code: string };
let boots: { id: string };
let glasses: { id: string };
let retired: { id: string };

const URL = '/api/v2/ppe-items';
const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id);

const body = (suffix: string, extra: Record<string, unknown> = {}) => ({
  name: `${fx.tag} ${suffix}`,
  itemCode: cat.code(suffix),
  category: 'FEET',
  replacementFrequency: 12,
  isMandatory: true,
  ...extra,
});

beforeAll(async () => {
  await prepareV2();
  const mine = await fx.org();
  const other = await fx.org();
  admin = await signIn((await fx.user('admin')).username);
  stores = await signIn((await fx.user('stores')).username);
  sheq = await signIn((await fx.user('sheq')).username);
  hod = await signIn((await fx.user('hod', { departmentId: mine.department.id })).username);
  sectionRep = await signIn(
    (await fx.user('section-rep', { departmentId: mine.department.id, sectionId: mine.section.id })).username
  );

  scale = await cat.scale('BOOT', ['6', '7', '8', '9', '10', '11']);
  await cat.scale('RETIRED', ['1'], { isActive: false });
  boots = await cat.item('boots', { category: 'FEET', hasSizeVariants: true, sizeScale: scale.code, availableSizes: ['7', '8', '9'] });
  glasses = await cat.item('glasses', { category: 'EYES/FACE', replacementFrequency: 6, itemType: 'PPE' });
  retired = await cat.item('retired', { category: 'FEET', isActive: false });
  await cat.item('mop', { category: 'CONS', itemType: 'CONSUMABLE' });

  await cat.stock(boots.id, '9', 4, { unitPriceUSD: 20, minLevel: 5 });
  await cat.stock(boots.id, '7', 10, { unitPriceUSD: 25, minLevel: 2 });
  // Held for another department: invisible to this department's users
  await cat.stock(boots.id, '8', 3, { unitPriceUSD: 25, minLevel: 0, eligibleDepartments: [other.department.id], location: `${fx.tag}-other` });
  // Held for a different section of this department
  await cat.stock(boots.id, '7', 1, { minLevel: 0, eligibleSections: [other.section.id], location: `${fx.tag}-sec` });
});
afterAll(() => cat.cleanup());

describe('GET /ppe-items', () => {
  it('pages and searches by name or code', async () => {
    const res = await admin.get(URL).query({ q: fx.tag, pageSize: 2, sort: 'name', order: 'asc' });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 4, pageCount: 2 });
    const byCode = await admin.get(URL).query({ q: cat.code('glasses').toLowerCase() });
    expect(ids(byCode.body.data)).toEqual([glasses.id]);
  });

  it('filters by category, type and status', async () => {
    const feet = await admin.get(URL).query({ q: fx.tag, category: 'FEET' });
    expect(ids(feet.body.data).sort()).toEqual([boots.id, retired.id].sort());
    const consumables = await admin.get(URL).query({ q: fx.tag, itemType: 'CONSUMABLE' });
    expect(consumables.body.data).toHaveLength(1);
    const inactive = await admin.get(URL).query({ q: fx.tag, status: 'inactive' });
    expect(ids(inactive.body.data)).toEqual([retired.id]);
  });

  it('shows stock on hand and sorts by it', async () => {
    const res = await admin.get(URL).query({ q: fx.tag, sort: 'stockOnHand', order: 'desc' });
    expect(res.body.data[0]).toMatchObject({ id: boots.id, stockOnHand: 18, sizeScaleName: `${fx.tag} BOOT` });
  });

  it('counts only stock a department may draw from for department roles', async () => {
    const res = await hod.get(URL).query({ q: cat.code('boots') });
    expect(res.body.data[0].stockOnHand).toBe(15);
    const rep = await sectionRep.get(URL).query({ q: cat.code('boots') });
    expect(rep.body.data[0].stockOnHand).toBe(14);
  });

  it('hides inactive items from department roles, even when asked for', async () => {
    const res = await hod.get(URL).query({ q: fx.tag, status: 'inactive' });
    expect(res.body.data).toEqual([]);
    expect((await hod.get(URL).query({ q: fx.tag })).body.meta.total).toBe(3);
  });

  it('validates filters and paging', async () => {
    expect((await admin.get(URL).query({ itemType: 'WEAPON' })).status).toBe(422);
    expect((await admin.get(URL).query({ pageSize: 1000 })).status).toBe(422);
    expect((await admin.get(URL).query({ sort: 'supplier' })).status).toBe(422);
  });

  it('requires a session', async () => {
    expect((await request(app).get(URL)).status).toBe(401);
    expect((await request(app).get(`${URL}/${boots.id}`)).status).toBe(401);
  });
});

describe('lookups', () => {
  it('lists active items as options', async () => {
    const res = await hod.get(`${URL}/options`).query({ q: fx.tag });
    expect(res.status).toBe(200);
    expect(ids(res.body.data)).not.toContain(retired.id);
    expect(res.body.data.find((o: { id: string }) => o.id === boots.id)).toMatchObject({
      name: `${fx.tag} boots`,
      hasSizeVariants: true,
      sizeScale: scale.code,
    });
  });

  it('lists categories with counts', async () => {
    const res = await admin.get(`${URL}/categories`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'EYES/FACE' })]));
  });

  it('gives the sizes an item comes in, in scale order', async () => {
    const res = await hod.get(`${URL}/${boots.id}/sizes`);
    expect(res.body.data.scale).toMatchObject({ code: scale.code });
    expect(res.body.data.sizes.map((s: { value: string }) => s.value)).toEqual(['7', '8', '9']);
    const std = await hod.get(`${URL}/${glasses.id}/sizes`);
    expect(std.body.data).toEqual({ scale: null, sizes: [{ value: 'Std', label: 'Std' }] });
  });
});

describe('GET /ppe-items/:id', () => {
  it('totals stock per size in scale order with values for stores', async () => {
    const res = await stores.get(`${URL}/${boots.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.stock).toEqual({
      onHand: 18,
      valueUSD: 405,
      bySize: [
        { size: '7', quantity: 11, valueUSD: 250, belowMinimum: false },
        { size: '8', quantity: 3, valueUSD: 75, belowMinimum: false },
        { size: '9', quantity: 4, valueUSD: 80, belowMinimum: true },
      ],
    });
    expect(res.body.data.sizeScaleRef).toMatchObject({ id: scale.id, code: scale.code });
  });

  it('limits a department user to eligible stock and leaves out values', async () => {
    const res = await hod.get(`${URL}/${boots.id}`);
    expect(res.body.data.stock.onHand).toBe(15);
    expect(res.body.data.stock.valueUSD).toBeNull();
    expect(res.body.data.stock.bySize.map((r: { size: string }) => r.size)).toEqual(['7', '9']);
  });

  it('is a 404 for inactive items outside the catalogue roles', async () => {
    expect((await hod.get(`${URL}/${retired.id}`)).status).toBe(404);
    expect((await sheq.get(`${URL}/${retired.id}`)).status).toBe(200);
    expect((await admin.get(`${URL}/00000000-0000-4000-8000-000000000000`)).status).toBe(404);
  });
});

describe('creating and updating items', () => {
  it('lets stores create an item with a size scale', async () => {
    const res = await write(stores, 'post', URL).send(
      body('new', {
        hasSizeVariants: true,
        sizeScale: scale.code.toLowerCase(),
        availableSizes: ['8', '9'],
        heavyUseFrequency: 6,
        description: '  ',
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      itemCode: cat.code('new'),
      sizeScale: scale.code,
      availableSizes: ['8', '9'],
      heavyUseFrequency: 6,
      description: null,
      unit: 'EA',
      itemType: 'PPE',
      isActive: true,
      stockOnHand: 0,
    });
  });

  it('drops scale and sizes when the item has no size variants', async () => {
    const res = await write(admin, 'post', URL).send(body('nosize', { sizeScale: scale.code, availableSizes: ['8'] }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ sizeScale: null, availableSizes: [] });
  });

  it('rejects incomplete and inconsistent items with 422', async () => {
    const empty = await write(admin, 'post', URL).send({});
    expect(empty.status).toBe(422);
    expect(Object.keys(empty.body.error.details.fieldErrors)).toEqual(
      expect.arrayContaining(['name', 'itemCode', 'category', 'replacementFrequency'])
    );

    const cases: Array<[Record<string, unknown>, string]> = [
      [{ replacementFrequency: 0 }, 'replacementFrequency'],
      [{ heavyUseFrequency: 24 }, 'heavyUseFrequency'],
      [{ hasSizeVariants: true }, 'sizeScale'],
      [{ hasSizeVariants: true, sizeScale: 'NO-SUCH-SCALE' }, 'sizeScale'],
      [{ hasSizeVariants: true, sizeScale: cat.code('RETIRED') }, 'sizeScale'],
      [{ hasSizeVariants: true, sizeScale: scale.code, availableSizes: ['8', '42'] }, 'availableSizes'],
      [{ itemType: 'WEAPON' }, 'itemType'],
    ];
    for (const [extra, field] of cases) {
      const res = await write(admin, 'post', URL).send(body('bad', extra));
      expect(res.status, JSON.stringify(extra)).toBe(422);
      expect(res.body.error.details.fieldErrors[field], JSON.stringify(extra)).toBeDefined();
    }
  });

  it('reports a used item code as 409, regardless of case', async () => {
    const res = await write(admin, 'post', URL).send(body('dupe', { itemCode: cat.code('glasses').toLowerCase() }));
    expect(res.status).toBe(409);
    expect(res.body.error.details.fieldErrors.itemCode).toBeDefined();
  });

  it('lets only one of two concurrent saves of the same code in different case through', async () => {
    const code = cat.code('race');
    const results = await Promise.all([
      write(admin, 'post', URL).send(body('race', { itemCode: code })),
      write(stores, 'post', URL).send(body('race', { itemCode: code.toLowerCase() })),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('refuses a size scale that has no sizes yet', async () => {
    const empty = await cat.scale('EMPTY', []);
    const res = await write(admin, 'post', URL).send(body('empty', { hasSizeVariants: true, sizeScale: empty.code }));
    expect(res.status).toBe(422);
    expect(res.body.error.details.fieldErrors.sizeScale[0]).toMatch(/no sizes yet/);
  });

  it('forbids department roles and sheq from writing', async () => {
    expect((await write(hod, 'post', URL).send(body('hod'))).status).toBe(403);
    expect((await write(sheq, 'put', `${URL}/${glasses.id}`).send(body('glasses'))).status).toBe(403);
    expect((await write(hod, 'post', `${URL}/${glasses.id}/deactivate`)).status).toBe(403);
  });

  it('updates an item', async () => {
    const res = await write(stores, 'put', `${URL}/${glasses.id}`).send(
      body('glasses', { category: 'EYES/FACE', replacementFrequency: 3, supplier: 'Acme', hasColorVariants: true, availableColors: ['Clear', 'Smoke', 'Clear'] })
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ replacementFrequency: 3, supplier: 'Acme', availableColors: ['Clear', 'Smoke'] });
  });

  it('refuses a scale change that strands stock', async () => {
    const other = await cat.scale('ALPHA', ['S', 'M']);
    const res = await write(admin, 'put', `${URL}/${boots.id}`).send(
      body('boots', { hasSizeVariants: true, sizeScale: other.code })
    );
    expect(res.status).toBe(409);
    const off = await write(admin, 'put', `${URL}/${boots.id}`).send(body('boots'));
    expect(off.status).toBe(409);
  });

  it('keeps an item on its scale after the scale is retired', async () => {
    const old = await cat.scale('LEGACY', ['A']);
    const item = await cat.item('legacy', { hasSizeVariants: true, sizeScale: old.code });
    await old.update({ isActive: false });
    const res = await write(admin, 'put', `${URL}/${item.id}`).send(
      body('legacy', { replacementFrequency: 24, hasSizeVariants: true, sizeScale: old.code })
    );
    expect(res.status).toBe(200);
  });

  it('returns 404 when updating an unknown item', async () => {
    const res = await write(admin, 'put', `${URL}/00000000-0000-4000-8000-000000000000`).send(body('ghost'));
    expect(res.status).toBe(404);
  });
});

describe('activation', () => {
  it('refuses to deactivate an item that still has stock', async () => {
    const res = await write(stores, 'post', `${URL}/${boots.id}/deactivate`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/18 EA/);
  });

  it('deactivates and reactivates an item without stock', async () => {
    const off = await write(stores, 'post', `${URL}/${glasses.id}/deactivate`);
    expect(off.status).toBe(200);
    expect(off.body.data.isActive).toBe(false);
    expect((await hod.get(`${URL}/${glasses.id}`)).status).toBe(404);
    const on = await write(admin, 'post', `${URL}/${glasses.id}/activate`);
    expect(on.body.data.isActive).toBe(true);
  });
});

describe('PUT /ppe-items/replacement-frequency', () => {
  it('updates the chosen active PPE items only', async () => {
    const mop = await models.PPEItem.findOne({ where: { itemCode: cat.code('mop') } });
    const res = await write(stores, 'put', `${URL}/replacement-frequency`).send({
      replacementFrequency: 9,
      itemIds: [boots.id, retired.id, mop!.id],
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ updatedCount: 1, replacementFrequency: 9 });
    expect((await models.PPEItem.findByPk(boots.id))?.replacementFrequency).toBe(9);
    expect((await models.PPEItem.findByPk(retired.id))?.replacementFrequency).toBe(12);
  });

  it('validates and gates the bulk update', async () => {
    expect((await write(admin, 'put', `${URL}/replacement-frequency`).send({ replacementFrequency: 0 })).status).toBe(422);
    expect((await write(admin, 'put', `${URL}/replacement-frequency`).send({ replacementFrequency: 3, itemIds: ['x'] })).status).toBe(422);
    expect((await write(hod, 'put', `${URL}/replacement-frequency`).send({ replacementFrequency: 3, itemIds: [boots.id] })).status).toBe(403);
  });
});
