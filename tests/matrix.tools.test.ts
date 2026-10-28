import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models, sequelize } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { createFixtures, signIn, write } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;
const fx = createFixtures();
let stores: Agent, sheq: Agent, hod: Agent;
let section: { id: string; name: string }, other: { id: string; name: string };
let fitter: { id: string; name: string }, driver: { id: string; name: string }, twinA: { id: string }, twinB: { id: string };
let gloves: { id: string; itemCode: string; name: string }, boots: { id: string; itemCode: string; name: string };

beforeAll(async () => {
  await prepareV2();
  const org = await fx.org();
  section = org.section;
  other = await fx.make('Section', { name: `${fx.tag}-other`, departmentId: org.department.id });
  fitter = await fx.make('JobTitle', { name: `${fx.tag} Fitter`, sectionId: section.id });
  driver = await fx.make('JobTitle', { name: `${fx.tag} Driver`, sectionId: section.id });
  twinA = await fx.make('JobTitle', { name: `${fx.tag} Twin`, sectionId: section.id });
  twinB = await fx.make('JobTitle', { name: `${fx.tag} Twin`, sectionId: other.id });
  gloves = await fx.make('PPEItem', { name: `${fx.tag} Gloves`, itemCode: `${fx.tag}-GL`, replacementFrequency: 6 });
  boots = await fx.make('PPEItem', { name: `${fx.tag} Boots`, itemCode: `${fx.tag}-BT`, replacementFrequency: 12 });
  stores = await signIn((await fx.user('stores')).username);
  sheq = await signIn((await fx.user('sheq')).username);
  hod = await signIn((await fx.user('hod', { departmentId: org.department.id })).username);
});
afterAll(async () => {
  const ids = [fitter.id, driver.id, twinA.id, twinB.id];
  await sequelize.query(`DELETE FROM job_title_ppe_matrix WHERE "jobTitleId" IN (:ids)`, { replacements: { ids } });
  await sequelize.query(`DELETE FROM section_ppe_matrix WHERE section_id IN (:ids)`, { replacements: { ids: [section.id, other.id] } });
  await fx.cleanup();
});

const own = (jobTitleId: string) => models.JobTitlePPEMatrix.findAll({ where: { jobTitleId, isActive: true } });

describe('POST /matrix/:kind/import', () => {
  it('resolves names and codes, checks without saving, then saves', async () => {
    const rows = [
      { owner: fitter.name, item: gloves.itemCode, quantity: 2, months: 3, mandatory: 'Yes' },
      { owner: fitter.name, item: boots.name, quantity: '1', mandatory: 'No' },
      { owner: 'Twin'.replace('Twin', `${fx.tag} Twin`), section: section.name, item: gloves.itemCode },
    ];
    const check = await write(sheq, 'post', '/api/v2/matrix/job-titles/import').send({ rows });
    expect(check.status).toBe(200);
    expect(check.body.data).toMatchObject({ dryRun: true, owners: 2, entries: 3, errors: [] });
    expect(await own(fitter.id)).toHaveLength(0);

    const run = await write(sheq, 'post', '/api/v2/matrix/job-titles/import').send({ dryRun: false, rows });
    expect(run.status).toBe(201);
    const saved = await own(fitter.id);
    expect(saved.map((r) => [r.ppeItemId, r.quantityRequired, r.isMandatory]).sort()).toEqual(
      [
        [gloves.id, 2, true],
        [boots.id, 1, false],
      ].sort()
    );
    expect(await own(twinA.id)).toHaveLength(1);
    expect(await own(twinB.id)).toHaveLength(0);
  });

  it('reports unknown names, ambiguous job titles and bad numbers per row', async () => {
    const res = await write(sheq, 'post', '/api/v2/matrix/job-titles/import').send({
      rows: [
        { owner: `${fx.tag} Nobody`, item: gloves.itemCode },
        { owner: `${fx.tag} Twin`, item: gloves.itemCode },
        { owner: driver.name, item: `${fx.tag}-NOPE` },
        { owner: driver.name, item: gloves.itemCode, quantity: 0 },
      ],
    });
    expect(res.body.data.errors.map((e: { row: number }) => e.row)).toEqual([1, 2, 3, 4]);
    expect(res.body.data.errors[1].message).toMatch(/Section column/);
  });

  it('replaces an owner’s other items when asked', async () => {
    const res = await write(sheq, 'post', '/api/v2/matrix/job-titles/import').send({
      dryRun: false,
      replace: true,
      rows: [{ owner: fitter.name, item: boots.itemCode, quantity: 1 }],
    });
    expect(res.body.data).toMatchObject({ removals: 1 });
    expect((await own(fitter.id)).map((r) => r.ppeItemId)).toEqual([boots.id]);
  });

  it('imports section matrices for stores only', async () => {
    const rows = [{ owner: section.name, item: gloves.itemCode, quantity: 1 }];
    expect((await write(sheq, 'post', '/api/v2/matrix/sections/import').send({ rows })).status).toBe(403);
    const res = await write(stores, 'post', '/api/v2/matrix/sections/import').send({ dryRun: false, rows });
    expect(res.status).toBe(201);
    expect(await models.SectionPPEMatrix.count({ where: { sectionId: section.id, isActive: true } })).toBe(1);
    expect((await write(stores, 'post', '/api/v2/matrix/people/import').send({ rows })).status).toBe(422);
  });
});

describe('POST /matrix/:kind/copy', () => {
  it('copies one job title’s PPE to others, optionally replacing theirs', async () => {
    await write(sheq, 'post', '/api/v2/matrix/job-titles/import').send({ dryRun: false, rows: [{ owner: driver.name, item: gloves.itemCode }] });
    const res = await write(sheq, 'post', '/api/v2/matrix/job-titles/copy').send({ fromId: fitter.id, toIds: [driver.id], replace: true });
    expect(res.status).toBe(200);
    expect((await own(driver.id)).map((r) => r.ppeItemId)).toEqual([boots.id]);
    const empty = await write(sheq, 'post', '/api/v2/matrix/job-titles/copy').send({ fromId: fitter.id, toIds: [fitter.id] });
    expect(empty.status).toBe(422);
    expect((await write(hod, 'post', '/api/v2/matrix/job-titles/copy').send({ fromId: fitter.id, toIds: [driver.id] })).status).toBe(403);
  });
});

describe('GET /matrix/:kind/summary', () => {
  it('counts owners set up and not', async () => {
    const res = await hod.get('/api/v2/matrix/job-titles/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.owners).toBe(res.body.data.configured + res.body.data.notConfigured);
    expect(res.body.data.configured).toBeGreaterThanOrEqual(3);
  });
});
