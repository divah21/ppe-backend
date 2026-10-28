import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models, sequelize } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { createFixtures, signIn, write } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;
const fx = createFixtures();
let stores: Agent, hod: Agent;
let scaleCode: string;

beforeAll(async () => {
  await prepareV2();
  scaleCode = `${fx.tag}-SC`.toUpperCase();
  const scale = await fx.make('SizeScale', { code: scaleCode, name: `${fx.tag} scale`, isActive: true });
  await fx.make('Size', { scaleId: scale.id, value: '8', sortOrder: 1 });
  await fx.make('Size', { scaleId: scale.id, value: '9', sortOrder: 2 });
  stores = await signIn((await fx.user('stores')).username);
  hod = await signIn((await fx.user('hod')).username);
});
afterAll(async () => {
  const tag = `${fx.tag}%`;
  await sequelize.query(`DELETE FROM ppe_items WHERE item_code ILIKE :tag`, { replacements: { tag } });
  await sequelize.query(`DELETE FROM sizes WHERE scale_id IN (SELECT id FROM size_scales WHERE code ILIKE :tag)`, { replacements: { tag } });
  await sequelize.query(`DELETE FROM size_scales WHERE code ILIKE :tag AND id NOT IN (SELECT id FROM size_scales WHERE code = :own)`, {
    replacements: { tag, own: scaleCode },
  });
  await fx.cleanup();
});

describe('POST /ppe-items/import', () => {
  const rows = () => [
    { itemCode: `${fx.tag}-A`, name: `${fx.tag} Ear plugs`, category: 'HEARING', replacementFrequency: 3, isMandatory: 'Yes' },
    { itemCode: `${fx.tag}-B`, name: `${fx.tag} Boots`, category: 'FEET', replacementFrequency: '12', sizeScale: scaleCode, availableSizes: '8, 9', targetGender: 'male' },
  ];

  it('checks rows with the form’s rules without saving, then creates them', async () => {
    const check = await write(stores, 'post', '/api/v2/ppe-items/import').send({ rows: rows() });
    expect(check.status).toBe(200);
    expect(check.body.data).toMatchObject({ dryRun: true, created: 2, errors: [] });
    expect(await models.PPEItem.count({ where: { itemCode: `${fx.tag}-A` } })).toBe(0);

    const run = await write(stores, 'post', '/api/v2/ppe-items/import').send({ dryRun: false, rows: rows() });
    expect(run.status).toBe(201);
    const boots = await models.PPEItem.findOne({ where: { itemCode: `${fx.tag}-B` } });
    expect(boots).toMatchObject({ hasSizeVariants: true, sizeScale: scaleCode, targetGender: 'MALE' });
    expect(boots!.availableSizes).toEqual(['8', '9']);
  });

  it('leaves existing codes alone unless asked to update them', async () => {
    const again = await write(stores, 'post', '/api/v2/ppe-items/import').send({ dryRun: false, rows: rows() });
    expect(again.body.data).toMatchObject({ created: 0, unchanged: 2 });
    const changed = [{ ...rows()[0], replacementFrequency: 6 }];
    const update = await write(stores, 'post', '/api/v2/ppe-items/import').send({ dryRun: false, updateExisting: true, rows: changed });
    expect(update.body.data).toMatchObject({ updated: 1 });
    expect((await models.PPEItem.findOne({ where: { itemCode: `${fx.tag}-A` } }))!.replacementFrequency).toBe(6);
  });

  it('reports each bad row and saves nothing', async () => {
    const res = await write(stores, 'post', '/api/v2/ppe-items/import').send({
      dryRun: false,
      rows: [
        { itemCode: `${fx.tag}-C`, name: `${fx.tag} Visor`, category: 'FACE', replacementFrequency: 12 },
        { itemCode: `${fx.tag}-D`, name: `${fx.tag} Shoes`, category: 'FEET', replacementFrequency: 12, sizeScale: 'NOPE' },
        { itemCode: `${fx.tag}-E`, name: 'X', category: 'FACE' },
        { itemCode: `${fx.tag}-C`, name: `${fx.tag} Visor 2`, category: 'FACE', replacementFrequency: 12 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.errors.map((e: { row: number }) => e.row)).toEqual([2, 3, 4]);
    expect(res.body.data.errors[0].message).toMatch(/size scale/i);
    expect(await models.PPEItem.count({ where: { itemCode: `${fx.tag}-C` } })).toBe(0);
    expect((await write(hod, 'post', '/api/v2/ppe-items/import').send({ rows: rows() })).status).toBe(403);
  });
});

describe('POST /size-scales/import', () => {
  it('creates scales with their sizes in order, and extends existing ones on request', async () => {
    const code = `${fx.tag}-GL`;
    const res = await write(stores, 'post', '/api/v2/size-scales/import').send({
      dryRun: false,
      rows: [
        { code, name: `${fx.tag} gloves`, sizes: 'S, M, L' },
        { code: scaleCode, name: `${fx.tag} scale`, sizes: '8, 9, 10' },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ created: 1, unchanged: 1, sizesAdded: 3 });
    const scale = await models.SizeScale.findOne({ where: { code: code.toUpperCase() } });
    const sizes = await models.Size.findAll({ where: { scaleId: scale!.id }, order: [['sortOrder', 'ASC']] });
    expect(sizes.map((s) => s.value)).toEqual(['S', 'M', 'L']);

    const extend = await write(stores, 'post', '/api/v2/size-scales/import').send({
      dryRun: false,
      updateExisting: true,
      rows: [{ code: scaleCode, name: `${fx.tag} scale`, sizes: '8, 9, 10' }],
    });
    expect(extend.body.data).toMatchObject({ extended: 1, sizesAdded: 1 });
    expect((await write(stores, 'post', '/api/v2/size-scales/import').send({ rows: [{ code: 'x y', name: 'Bad', sizes: '' }] })).status).toBe(422);
  });
});
