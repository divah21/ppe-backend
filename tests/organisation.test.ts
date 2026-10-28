import { Op } from 'sequelize';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { createFixtures, signIn } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;
const fx = createFixtures();
let admin: Agent, stores: Agent;
let org: Awaited<ReturnType<typeof fx.org>>;
let category: { id: string; name: string };

beforeAll(async () => {
  await prepareV2();
  org = await fx.org();
  category = await fx.make('JobTitle', { name: `${fx.tag} Plant category`, sectionId: org.section.id });
  const item = await fx.make('PPEItem', { name: `${fx.tag} Hard hat`, itemCode: `${fx.tag}-HH` });
  await fx.make('JobTitlePPEMatrix', { jobTitleId: category.id, ppeItemId: item.id, quantityRequired: 1, isActive: true });
  admin = await signIn((await fx.user('admin')).username);
  stores = await signIn((await fx.user('stores')).username);
});

afterAll(async () => {
  // Rows the imports created, children first
  const like = { [Op.like]: `${fx.tag}%` };
  await models.JobTitle.destroy({ where: { name: like, id: { [Op.ne]: category.id } } });
  await models.Section.destroy({ where: { name: like, id: { [Op.ne]: org.section.id } } });
  await models.Department.destroy({ where: { name: like, id: { [Op.ne]: org.department.id } } });
  await fx.cleanup();
});

const upload = (kind: string, rows: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) =>
  admin.post(`/api/v2/organisation/import/${kind}`).send({ rows, ...extra });

describe('POST /organisation/import/:kind', () => {
  it('checks departments, sections and job titles without saving, then saves them in order', async () => {
    const dept = `${fx.tag} Mining`;
    const check = await upload('departments', [{ name: dept, code: `${fx.tag}-MIN` }, { name: org.department.name }]);
    expect(check.status).toBe(200);
    expect(check.body.data).toMatchObject({ dryRun: true, created: 1, unchanged: 1, errors: [] });
    expect(await models.Department.count({ where: { name: dept } })).toBe(0);

    expect((await upload('departments', [{ name: dept, code: `${fx.tag}-MIN` }], { dryRun: false })).status).toBe(201);
    const sections = await upload('sections', [{ name: `${fx.tag} Shaft`, department: `${fx.tag}-MIN` }], { dryRun: false });
    expect(sections.body.data).toMatchObject({ created: 1, errors: [] });
    const titles = await upload(
      'job-titles',
      [{ name: `${fx.tag} Plant operator`, section: `${fx.tag} Shaft`, department: dept, ppeCategory: category.name, isActive: 'Yes' }],
      { dryRun: false }
    );
    expect(titles.body.data).toMatchObject({ created: 1, errors: [] });
    const saved = await models.JobTitle.findOne({ where: { name: `${fx.tag} Plant operator` } });
    expect(saved?.ppeCategoryId).toBe(category.id);
  });

  it('reports every bad row and saves nothing', async () => {
    const res = await upload(
      'sections',
      [{ name: `${fx.tag} Good`, department: org.department.name }, { name: `${fx.tag} Lost`, department: 'Nowhere' }, { name: 'x', department: org.department.name }],
      { dryRun: false }
    );
    expect(res.status).toBe(200);
    expect(res.body.data.errors.map((e: { row: number }) => e.row)).toEqual([2, 3]);
    expect(res.body.data.errors[0].message).toMatch(/No department called Nowhere/);
    expect(await models.Section.count({ where: { name: `${fx.tag} Good` } })).toBe(0);
  });

  it('updates existing records only when asked, and is admin only', async () => {
    const row = [{ name: org.section.name, department: org.department.name, description: 'Updated by upload' }];
    expect((await upload('sections', row, { dryRun: false })).body.data).toMatchObject({ unchanged: 1, updated: 0 });
    expect((await upload('sections', row, { dryRun: false, updateExisting: true })).body.data).toMatchObject({ updated: 1 });
    expect((await models.Section.findByPk(org.section.id))?.description).toBe('Updated by upload');
    await models.Section.update({ code: `${fx.tag}-WS` }, { where: { id: org.section.id } });
    const sameCode = await upload('sections', [{ name: `${fx.tag} Workshop`, department: org.department.name, code: `${fx.tag}-WS` }]);
    expect(sameCode.body.data).toMatchObject({ created: 1, errors: [] });
    expect((await stores.post('/api/v2/organisation/import/sections').send({ rows: row })).status).toBe(403);
  });
});

describe('job-title PPE categories', () => {
  it('lists categories, suggests and applies mappings, and refuses chains', async () => {
    const operator = await fx.make('JobTitle', { name: `${fx.tag} Plant attendant`, sectionId: org.section.id });
    const cats = await admin.get('/api/v2/job-titles/categories');
    expect(cats.body.data).toContainEqual(expect.objectContaining({ id: category.id, itemCount: 1 }));

    const suggested = await admin.post('/api/v2/job-titles/categories/suggest');
    expect(suggested.body.data).toContainEqual(expect.objectContaining({ jobTitleId: operator.id }));

    const apply = await admin.put('/api/v2/job-titles/categories').send({ mappings: [{ jobTitleId: operator.id, ppeCategoryId: category.id }] });
    expect(apply.status).toBe(200);
    const listed = await admin.get('/api/v2/job-titles').query({ q: `${fx.tag} Plant attendant`, category: 'mapped' });
    expect(listed.body.data).toEqual([expect.objectContaining({ id: operator.id, ppeCategory: { id: category.id, name: category.name } })]);

    const chain = await admin.put('/api/v2/job-titles/categories').send({ mappings: [{ jobTitleId: category.id, ppeCategoryId: operator.id }] });
    expect(chain.status).toBe(422);
    const other = await fx.make('JobTitle', { name: `${fx.tag} Other category`, sectionId: org.section.id });
    const viaUpload = await upload(
      'job-titles',
      [{ name: category.name, section: org.section.name, department: org.department.name, ppeCategory: other.name }],
      { dryRun: false, updateExisting: true }
    );
    expect(viaUpload.body.data.errors[0].message).toMatch(/cannot take another category/);
    expect((await stores.put('/api/v2/job-titles/categories').send({ mappings: [] })).status).toBe(403);
  });
});

describe('GET /organisation/summary', () => {
  it('counts the organisation for admins only', async () => {
    const res = await admin.get('/api/v2/organisation/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.departments.active).toBeGreaterThan(0);
    expect(res.body.data.jobTitles.categories).toBeGreaterThan(0);
    expect((await stores.get('/api/v2/organisation/summary')).status).toBe(403);
  });
});
