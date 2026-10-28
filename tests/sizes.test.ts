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
let hod: Agent;
let gloves: { id: string; code: string };
let retired: { id: string };

const URL = '/api/v2/size-scales';
const values = (sizes: Array<{ value: string }>) => sizes.map((s) => s.value);

beforeAll(async () => {
  await prepareV2();
  const { department } = await fx.org();
  admin = await signIn((await fx.user('admin')).username);
  stores = await signIn((await fx.user('stores')).username);
  hod = await signIn((await fx.user('hod', { departmentId: department.id })).username);
  gloves = await cat.scale('GLOVE', ['7', '8', '9', '10']);
  retired = await cat.scale('OLD', ['A'], { isActive: false });
  await cat.item('glove', { hasSizeVariants: true, sizeScale: gloves.code });
});
afterAll(() => cat.cleanup());

describe('GET /size-scales', () => {
  it('pages and counts sizes and items', async () => {
    const res = await admin.get(URL).query({ q: fx.tag, sort: 'code', order: 'asc' });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ total: 2, page: 1 });
    const glove = res.body.data.find((s: { id: string }) => s.id === gloves.id);
    expect(glove).toMatchObject({ code: gloves.code, sizeCount: 4, itemCount: 1, isActive: true });
  });

  it('filters by status', async () => {
    const res = await admin.get(URL).query({ q: fx.tag, status: 'inactive' });
    expect(res.body.data.map((s: { id: string }) => s.id)).toEqual([retired.id]);
  });

  it('hides inactive scales from department roles, even when asked for', async () => {
    const res = await hod.get(URL).query({ q: fx.tag, status: 'inactive' });
    expect(res.body.data).toEqual([]);
    expect((await hod.get(`${URL}/${retired.id}`)).status).toBe(404);
    expect((await hod.get(`${URL}/${gloves.id}`)).status).toBe(200);
  });

  it('returns sizes in order on the detail', async () => {
    const res = await hod.get(`${URL}/${gloves.id}`);
    expect(values(res.body.data.sizes)).toEqual(['7', '8', '9', '10']);
  });

  it('lists only active scales as options', async () => {
    const res = await hod.get(`${URL}/options`);
    const ids = res.body.data.map((s: { id: string }) => s.id);
    expect(ids).toContain(gloves.id);
    expect(ids).not.toContain(retired.id);
  });

  it('validates the query and the id', async () => {
    expect((await admin.get(URL).query({ sort: 'secret' })).status).toBe(422);
    expect((await admin.get(`${URL}/not-a-uuid`)).status).toBe(422);
  });

  it('requires a session', async () => {
    expect((await request(app).get(URL)).status).toBe(401);
    expect((await request(app).get(`${URL}/options`)).status).toBe(401);
  });
});

describe('creating and editing scales', () => {
  it('lets stores create a scale with ordered sizes', async () => {
    const res = await write(stores, 'post', URL).send({
      code: cat.code('alpha').toLowerCase(),
      name: 'Alpha',
      categoryGroup: 'BODY/TORSO',
      sizes: [{ value: 'S' }, { value: 'M', label: 'Medium' }, { value: 'L', euSize: '50' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ code: cat.code('alpha'), sizeCount: 3, itemCount: 0 });
    expect(res.body.data.sizes.map((s: { value: string; sortOrder: number }) => [s.value, s.sortOrder])).toEqual([
      ['S', 1],
      ['M', 2],
      ['L', 3],
    ]);
  });

  it('rejects duplicate sizes, bad codes and missing names with 422', async () => {
    const dup = await write(admin, 'post', URL).send({ code: cat.code('dup'), name: 'Dup', sizes: [{ value: 'S' }, { value: 's' }] });
    expect(dup.status).toBe(422);
    expect(dup.body.error.details.fieldErrors.sizes).toBeDefined();
    const bad = await write(admin, 'post', URL).send({ code: 'has space', name: '' });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.details.fieldErrors)).toEqual(expect.arrayContaining(['code', 'name']));
  });

  it('reports a code that is already used as 409, regardless of case', async () => {
    const res = await write(admin, 'post', URL).send({ code: gloves.code.toLowerCase(), name: 'Again' });
    expect(res.status).toBe(409);
  });

  it('forbids department roles', async () => {
    expect((await write(hod, 'post', URL).send({ code: cat.code('hod'), name: 'Nope' })).status).toBe(403);
    expect((await write(hod, 'put', `${URL}/${gloves.id}/sizes`).send({ sizes: [] })).status).toBe(403);
  });

  it('carries a renamed code through to the items that use it', async () => {
    const scale = await cat.scale('REN', ['1']);
    const item = await cat.item('ren', { hasSizeVariants: true, sizeScale: scale.code });
    const res = await write(stores, 'put', `${URL}/${scale.id}`).send({ code: cat.code('ren2'), name: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ code: cat.code('ren2'), itemCount: 1 });
    expect((await models.PPEItem.findByPk(item.id))?.sizeScale).toBe(cat.code('ren2'));
  });

  it('keeps a legacy code as it is when only the details change', async () => {
    const legacy = await fx.make('SizeScale', { code: cat.code('legacy').toLowerCase(), name: 'Legacy', isActive: true });
    await fx.make('Size', { scaleId: legacy.id, value: 'A', sortOrder: 1 });
    const item = await cat.item('legacy-item', { hasSizeVariants: true, sizeScale: legacy.code });
    const res = await write(stores, 'put', `${URL}/${legacy.id}`).send({ code: legacy.code, name: 'Legacy renamed' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ code: legacy.code, name: 'Legacy renamed', itemCount: 1 });
    expect((await models.PPEItem.findByPk(item.id))?.sizeScale).toBe(legacy.code);
  });

  it('returns 404 for an unknown scale', async () => {
    const res = await write(admin, 'put', `${URL}/00000000-0000-4000-8000-000000000000`).send({ code: 'X1', name: 'Nope' });
    expect(res.status).toBe(404);
  });
});

describe('PUT /size-scales/:id/sizes', () => {
  it('reorders, relabels, swaps and adds sizes in one save', async () => {
    const scale = await cat.scale('EDIT', ['S', 'M', 'L']);
    const before = (await admin.get(`${URL}/${scale.id}`)).body.data.sizes;
    const [s, m, l] = before;
    const res = await write(stores, 'put', `${URL}/${scale.id}/sizes`).send({
      sizes: [
        { id: l.id, value: 'L', label: 'Large' },
        { id: s.id, value: 'M' },
        { id: m.id, value: 'S' },
        { value: 'XL' },
      ],
    });
    expect(res.status).toBe(200);
    expect(values(res.body.data.sizes)).toEqual(['L', 'M', 'S', 'XL']);
    expect(res.body.data.sizes[0]).toMatchObject({ id: l.id, label: 'Large', sortOrder: 1 });
    expect(res.body.data.sizes[1].id).toBe(s.id);
  });

  it('keeps items’ available sizes in step with renames and removals', async () => {
    const scale = await cat.scale('SYNC', ['S', 'M', 'L']);
    const item = await cat.item('sync', { hasSizeVariants: true, sizeScale: scale.code, availableSizes: ['S', 'M', 'L'] });
    const [s, m] = (await admin.get(`${URL}/${scale.id}`)).body.data.sizes;
    const res = await write(admin, 'put', `${URL}/${scale.id}/sizes`).send({
      sizes: [{ id: s.id, value: 'SM' }, { id: m.id, value: 'M' }],
    });
    expect(res.status).toBe(200);
    expect((await models.PPEItem.findByPk(item.id))?.availableSizes).toEqual(['SM', 'M']);
  });

  it('only lets an admin remove sizes', async () => {
    const scale = await cat.scale('RM', ['S', 'M']);
    const res = await write(stores, 'put', `${URL}/${scale.id}/sizes`).send({ sizes: [{ value: 'S' }] });
    expect(res.status).toBe(403);
    const ok = await write(admin, 'put', `${URL}/${scale.id}/sizes`).send({ sizes: [{ value: 'S' }] });
    expect(ok.status).toBe(200);
    expect(values(ok.body.data.sizes)).toEqual(['S']);
  });

  it('refuses to rename or remove a size that stock uses', async () => {
    const scale = await cat.scale('STK', ['S', 'M']);
    const item = await cat.item('stk', { hasSizeVariants: true, sizeScale: scale.code });
    await cat.stock(item.id, 'M', 0);
    const removed = await write(admin, 'put', `${URL}/${scale.id}/sizes`).send({ sizes: [{ value: 'S' }] });
    expect(removed.status).toBe(409);
    expect(removed.body.error.details.values).toEqual(['M']);
    const [, m] = (await admin.get(`${URL}/${scale.id}`)).body.data.sizes;
    const renamed = await write(admin, 'put', `${URL}/${scale.id}/sizes`).send({ sizes: [{ value: 'S' }, { id: m.id, value: 'Medium' }] });
    expect(renamed.status).toBe(409);
  });

  it('matches sizes recorded on stock regardless of case', async () => {
    const scale = await cat.scale('STKCASE', ['S', 'M']);
    const item = await cat.item('stkcase', { hasSizeVariants: true, sizeScale: scale.code });
    await cat.stock(item.id, 'm', 2);
    const removed = await write(admin, 'put', `${URL}/${scale.id}/sizes`).send({ sizes: [{ value: 'S' }] });
    expect(removed.status).toBe(409);
    expect(removed.body.error.details.values).toEqual(['m']);
  });

  it('rejects stale size ids and invalid rows', async () => {
    const stale = await write(admin, 'put', `${URL}/${gloves.id}/sizes`).send({
      sizes: [{ id: '00000000-0000-4000-8000-000000000000', value: '7' }],
    });
    expect(stale.status).toBe(409);
    const bad = await write(admin, 'put', `${URL}/${gloves.id}/sizes`).send({ sizes: [{ value: '' }] });
    expect(bad.status).toBe(422);
  });
});

describe('DELETE /size-scales/:id', () => {
  it('is admin only', async () => {
    expect((await write(stores, 'delete', `${URL}/${retired.id}`)).status).toBe(403);
  });

  it('refuses while items use the scale', async () => {
    const res = await write(admin, 'delete', `${URL}/${gloves.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/1 PPE item uses/);
  });

  it('deletes an unused scale together with its sizes', async () => {
    const scale = await cat.scale('DEL', ['A', 'B']);
    expect((await write(admin, 'delete', `${URL}/${scale.id}`)).status).toBe(204);
    expect(await models.Size.count({ where: { scaleId: scale.id } })).toBe(0);
    expect((await admin.get(`${URL}/${scale.id}`)).status).toBe(404);
  });
});
