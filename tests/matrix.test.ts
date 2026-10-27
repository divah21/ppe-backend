import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { computeEligibility } from '../src/modules/matrix/service';
import { prepareV2 } from '../src/v2';
import { app, signIn, write } from './helpers';
import { createMatrixFixtures } from './matrix.fixtures';

type Agent = Awaited<ReturnType<typeof signIn>>;
type Row = { id: string; name: string; entries: Array<{ id: string; ppeItemId: string } & Record<string, unknown>> };

const fx = createMatrixFixtures();
const JT = '/api/v2/matrix/job-titles';
const SEC = '/api/v2/matrix/sections';

let admin: Agent, sheq: Agent, stores: Agent, hod: Agent, sectionRep: Agent;
let mine: Awaited<ReturnType<typeof fx.org>>;
let other: Awaited<ReturnType<typeof fx.org>>;
let jtA: { id: string; name: string }, jtB: { id: string; name: string }, jtOther: { id: string; name: string };
let gloves: { id: string }, boots: { id: string }, helmet: { id: string }, retired: { id: string };

beforeAll(async () => {
  await prepareV2();
  mine = await fx.org();
  other = await fx.org();
  jtA = await fx.jobTitle(mine.section.id);
  jtB = await fx.jobTitle(mine.section.id);
  jtOther = await fx.jobTitle(other.section.id);
  gloves = await fx.ppeItem({ replacementFrequency: 6 });
  boots = await fx.ppeItem();
  helmet = await fx.ppeItem({ category: 'HEAD' });
  retired = await fx.ppeItem({ isActive: false });

  admin = await signIn((await fx.user('admin')).username);
  sheq = await signIn((await fx.user('sheq')).username);
  stores = await signIn((await fx.user('stores')).username);
  hod = await signIn((await fx.user('hod', { departmentId: mine.department.id })).username);
  sectionRep = await signIn((await fx.user('section-rep', { sectionId: other.section.id })).username);
});
afterAll(() => fx.cleanup());

const ids = (body: { data: Row[] }) => body.data.map((r) => r.id);

describe('PUT /matrix/job-titles/entries', () => {
  it('creates, updates and removes entries in one save', async () => {
    const created = await write(sheq, 'put', `${JT}/entries`).send({
      upserts: [
        { jobTitleId: jtA.id, ppeItemId: gloves.id, quantityRequired: 2 },
        { jobTitleId: jtA.id, ppeItemId: boots.id, quantityRequired: 1, isMandatory: false, heavyUseFrequency: 3 },
        { jobTitleId: jtB.id, ppeItemId: helmet.id, quantityRequired: 1, replacementFrequency: 24 },
      ],
    });
    expect(created.status).toBe(200);
    expect(created.body.data).toEqual({ created: 3, updated: 0, deleted: 0 });

    const a = (await admin.get(`${JT}/${jtA.id}`)).body.data;
    const byItem = Object.fromEntries(a.entries.map((e: Row['entries'][number]) => [e.ppeItemId, e]));
    // Matrix frequency falls back to the item's, then 12 months (v1)
    expect(byItem[gloves.id]).toMatchObject({ quantityRequired: 2, replacementFrequency: 6, isMandatory: true });
    expect(byItem[boots.id]).toMatchObject({ replacementFrequency: 12, heavyUseFrequency: 3, isMandatory: false });
    expect(byItem[gloves.id].ppeItem).toMatchObject({ id: gloves.id, category: 'HANDS' });
    const stored = await models.JobTitlePPEMatrix.findOne({ where: { jobTitleId: jtA.id, ppeItemId: gloves.id } });
    expect(stored).toMatchObject({ jobTitle: jtA.name, category: 'HANDS' });

    const saved = await write(stores, 'put', `${JT}/entries`).send({
      upserts: [{ jobTitleId: jtA.id, ppeItemId: gloves.id, quantityRequired: 4 }],
      deletes: [{ jobTitleId: jtA.id, ppeItemId: boots.id }],
    });
    expect(saved.body.data).toEqual({ created: 0, updated: 1, deleted: 1 });
    const after = (await admin.get(`${JT}/${jtA.id}`)).body.data;
    // Fields left out of an update keep their value
    expect(after.entries).toHaveLength(1);
    expect(after.entries[0]).toMatchObject({ ppeItemId: gloves.id, quantityRequired: 4, replacementFrequency: 6 });
  });

  it('writes nothing when any part of the batch fails', async () => {
    const res = await write(admin, 'put', `${JT}/entries`).send({
      upserts: [
        { jobTitleId: jtB.id, ppeItemId: gloves.id, quantityRequired: 1 },
        { jobTitleId: '00000000-0000-4000-8000-000000000000', ppeItemId: gloves.id, quantityRequired: 1 },
      ],
    });
    expect(res.status).toBe(404);
    expect(await models.JobTitlePPEMatrix.count({ where: { jobTitleId: jtB.id, ppeItemId: gloves.id } })).toBe(0);
  });

  it('rejects invalid batches with 422', async () => {
    const bad = (body: unknown) => write(admin, 'put', `${JT}/entries`).send(body as object);
    expect((await bad({})).status).toBe(422);
    expect((await bad({ upserts: [{ jobTitleId: jtA.id, ppeItemId: gloves.id, quantityRequired: 0 }] })).status).toBe(422);
    expect((await bad({ upserts: [{ jobTitleId: jtA.id, ppeItemId: gloves.id, quantityRequired: 1, replacementFrequency: 500 }] })).status).toBe(422);
    const twice = { jobTitleId: jtA.id, ppeItemId: gloves.id, quantityRequired: 1 };
    expect((await bad({ upserts: [twice, twice] })).status).toBe(422);
    expect((await bad({ upserts: [twice], deletes: [{ jobTitleId: jtA.id, ppeItemId: gloves.id }] })).status).toBe(422);
    const inactive = await bad({ upserts: [{ jobTitleId: jtA.id, ppeItemId: retired.id, quantityRequired: 1 }] });
    expect(inactive.status).toBe(422);
    expect(inactive.body.error.details.ppeItemIds).toEqual([retired.id]);
  });

  it('lets same-named job titles in different sections hold the same item', async () => {
    const twinA = await fx.jobTitle(mine.section.id, { name: `${fx.tag}-driver` });
    const twinB = await fx.jobTitle(other.section.id, { name: `${fx.tag}-driver` });
    const res = await write(admin, 'put', `${JT}/entries`).send({
      upserts: [
        { jobTitleId: twinA.id, ppeItemId: helmet.id, quantityRequired: 1 },
        { jobTitleId: twinB.id, ppeItemId: helmet.id, quantityRequired: 2 },
      ],
    });
    expect(res.body.data).toMatchObject({ created: 2 });
    expect((await admin.get(`${JT}/${twinB.id}`)).body.data.entries[0]).toMatchObject({ quantityRequired: 2 });
  });

  it('edits and removes shared legacy rows for one job title without touching same-named ones', async () => {
    const name = `${fx.tag}-legacy-fitter`;
    const here = await fx.jobTitle(mine.section.id, { name });
    const there = await fx.jobTitle(other.section.id, { name });
    const legacyBoots = await models.JobTitlePPEMatrix.create({ jobTitle: name, ppeItemId: boots.id, quantityRequired: 3, replacementFrequency: 9 });
    await models.JobTitlePPEMatrix.create({ jobTitle: name, ppeItemId: gloves.id, quantityRequired: 1 });
    const hereEmployee = await fx.employee(mine.section.id, { jobTitleId: here.id, jobTitle: name });
    const thereEmployee = await fx.employee(other.section.id, { jobTitleId: there.id, jobTitle: name });
    const entriesOf = async (id: string) =>
      Object.fromEntries(((await admin.get(`${JT}/${id}`)).body.data as Row).entries.map((e) => [e.ppeItemId, e]));
    const eligible = async (employeeId: string) =>
      Object.fromEntries((await computeEligibility(employeeId))!.items.map((i) => [i.ppeItemId, i]));

    expect(await entriesOf(here.id)).toMatchObject({ [boots.id]: { quantityRequired: 3 }, [gloves.id]: {} });

    const edit = await write(admin, 'put', `${JT}/entries`).send({
      upserts: [{ jobTitleId: here.id, ppeItemId: boots.id, quantityRequired: 5 }],
    });
    expect(edit.body.data).toMatchObject({ created: 0, updated: 1, deleted: 0 });
    // The shared row is unchanged; this job title has its own copy that keeps the legacy frequency
    expect(await legacyBoots.reload()).toMatchObject({ jobTitleId: null, quantityRequired: 3 });
    expect(await entriesOf(here.id)).toMatchObject({ [boots.id]: { quantityRequired: 5, replacementFrequency: 9 }, [gloves.id]: {} });
    expect(await entriesOf(there.id)).toMatchObject({ [boots.id]: { quantityRequired: 3 } });
    // Eligibility matches what the matrix shows: the own row and the remaining legacy row
    expect(await eligible(hereEmployee.id)).toMatchObject({ [boots.id]: { quantity: 5 }, [gloves.id]: { quantity: 1 } });

    const remove = await write(admin, 'put', `${JT}/entries`).send({
      deletes: [
        { jobTitleId: here.id, ppeItemId: boots.id },
        { jobTitleId: here.id, ppeItemId: gloves.id },
      ],
    });
    expect(remove.body.data).toMatchObject({ deleted: 2 });
    expect(await entriesOf(here.id)).toEqual({});
    expect(Object.keys(await entriesOf(there.id)).sort()).toEqual([boots.id, gloves.id].sort());
    expect(await eligible(hereEmployee.id)).toEqual({});
    expect(Object.keys(await eligible(thereEmployee.id)).sort()).toEqual([boots.id, gloves.id].sort());
    const unconfigured = await admin.get(JT).query({ sectionId: mine.section.id, q: name, configured: 'no' });
    expect(ids(unconfigured.body)).toEqual([here.id]);

    // Adding the item back works and is counted as new
    const back = await write(admin, 'put', `${JT}/entries`).send({
      upserts: [{ jobTitleId: here.id, ppeItemId: gloves.id, quantityRequired: 2 }],
    });
    expect(back.body.data).toMatchObject({ created: 1, updated: 0 });
    expect(await entriesOf(here.id)).toMatchObject({ [gloves.id]: { quantityRequired: 2 } });
    expect(await entriesOf(there.id)).toMatchObject({ [gloves.id]: { quantityRequired: 1 } });
  });

  it('is limited to admin, SHEQ and stores', async () => {
    const body = { upserts: [{ jobTitleId: jtA.id, ppeItemId: helmet.id, quantityRequired: 1 }] };
    expect((await write(hod, 'put', `${JT}/entries`).send(body)).status).toBe(403);
    expect((await write(sectionRep, 'put', `${JT}/entries`).send(body)).status).toBe(403);
    expect((await request(app).put(`${JT}/entries`).set('Origin', 'http://localhost:3000').send(body)).status).toBe(401);
  });
});

describe('GET /matrix/job-titles', () => {
  it('pages job titles with their entries and filters by department, section and item', async () => {
    const res = await admin.get(JT).query({ departmentId: mine.department.id, q: fx.tag, pageSize: 2 });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 2 });
    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    for (const row of res.body.data) expect(row.department.id).toBe(mine.department.id);

    const bySection = await admin.get(JT).query({ sectionId: other.section.id });
    expect(ids(bySection.body)).toContain(jtOther.id);
    expect(ids(bySection.body)).not.toContain(jtA.id);

    const withHelmet = await admin.get(JT).query({ ppeItemId: helmet.id, q: fx.tag });
    expect(ids(withHelmet.body)).toContain(jtB.id);
    expect(ids(withHelmet.body)).not.toContain(jtA.id);

    const unconfigured = await admin.get(JT).query({ configured: 'no', sectionId: other.section.id });
    expect(ids(unconfigured.body)).toContain(jtOther.id);
    const configured = await admin.get(JT).query({ configured: 'yes', sectionId: mine.section.id });
    expect(ids(configured.body)).toEqual(expect.arrayContaining([jtA.id, jtB.id]));
  });

  it('scopes HODs to their department and section reps to their section', async () => {
    const hodList = await hod.get(JT).query({ q: fx.tag, departmentId: other.department.id });
    expect(hodList.body.data).toEqual([]);
    expect(ids((await hod.get(JT).query({ q: fx.tag })).body)).not.toContain(jtOther.id);
    expect((await hod.get(`${JT}/${jtOther.id}`)).status).toBe(404);
    expect((await hod.get(`${JT}/${jtA.id}`)).status).toBe(200);

    const repList = await sectionRep.get(JT).query({ q: fx.tag });
    expect(ids(repList.body)).toContain(jtOther.id);
    expect(ids(repList.body)).not.toContain(jtA.id);
  });

  it('validates the query and needs a session', async () => {
    expect((await admin.get(JT).query({ departmentId: 'nope' })).status).toBe(422);
    expect((await admin.get(JT).query({ pageSize: 1000 })).status).toBe(422);
    expect((await admin.get(JT).query({ sort: 'secret' })).status).toBe(422);
    expect((await admin.get(`${JT}/not-a-uuid`)).status).toBe(422);
    expect((await request(app).get(JT)).status).toBe(401);
  });
});

describe('DELETE /matrix/job-titles/entries/:id', () => {
  it('removes one entry for editors only', async () => {
    const [entry] = (await admin.get(`${JT}/${jtB.id}`)).body.data.entries;
    expect((await write(hod, 'delete', `${JT}/entries/${entry.id}`)).status).toBe(403);
    expect((await write(sheq, 'delete', `${JT}/entries/${entry.id}`)).status).toBe(204);
    expect((await write(sheq, 'delete', `${JT}/entries/${entry.id}`)).status).toBe(404);
  });
});

describe('section matrix', () => {
  it('lets stores save a section matrix and returns it scoped', async () => {
    const res = await write(stores, 'put', `${SEC}/entries`).send({
      upserts: [
        { sectionId: mine.section.id, ppeItemId: gloves.id, quantityRequired: 2 },
        { sectionId: mine.section.id, ppeItemId: boots.id, quantityRequired: 1, replacementFrequency: 18, isMandatory: false },
        { sectionId: other.section.id, ppeItemId: helmet.id, quantityRequired: 1 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ created: 3, updated: 0, deleted: 0 });

    const row = (await admin.get(`${SEC}/${mine.section.id}`)).body.data;
    expect(row.department).toMatchObject({ id: mine.department.id });
    // Section rows keep a null frequency, meaning "use the item's"
    expect(row.entries.find((e: Row['entries'][number]) => e.ppeItemId === gloves.id)).toMatchObject({
      quantityRequired: 2,
      replacementFrequency: null,
    });

    const hodList = await hod.get(SEC).query({ q: fx.tag });
    expect(ids(hodList.body)).toEqual([mine.section.id]);
    expect((await hod.get(`${SEC}/${other.section.id}`)).status).toBe(404);
    expect(ids((await sectionRep.get(SEC).query({ q: fx.tag })).body)).toEqual([other.section.id]);

    const filtered = await admin.get(SEC).query({ q: fx.tag, ppeItemId: helmet.id });
    expect(ids(filtered.body)).toEqual([other.section.id]);
  });

  it('updates and deletes in one save, and removes single entries', async () => {
    const res = await write(admin, 'put', `${SEC}/entries`).send({
      upserts: [{ sectionId: mine.section.id, ppeItemId: gloves.id, quantityRequired: 3, replacementFrequency: 4 }],
      deletes: [{ sectionId: mine.section.id, ppeItemId: boots.id }],
    });
    expect(res.body.data).toEqual({ created: 0, updated: 1, deleted: 1 });
    const row = (await admin.get(`${SEC}/${mine.section.id}`)).body.data;
    expect(row.entries).toHaveLength(1);
    expect(row.entries[0]).toMatchObject({ quantityRequired: 3, replacementFrequency: 4 });

    expect((await write(stores, 'delete', `${SEC}/entries/${row.entries[0].id}`)).status).toBe(204);
    expect((await admin.get(`${SEC}/${mine.section.id}`)).body.data.entries).toEqual([]);
  });

  it('keeps v1 roles: SHEQ and department roles cannot edit sections', async () => {
    const body = { upserts: [{ sectionId: mine.section.id, ppeItemId: gloves.id, quantityRequired: 1 }] };
    expect((await write(sheq, 'put', `${SEC}/entries`).send(body)).status).toBe(403);
    expect((await write(hod, 'put', `${SEC}/entries`).send(body)).status).toBe(403);
    expect((await request(app).get(SEC)).status).toBe(401);
  });

  it('validates section saves', async () => {
    expect((await write(admin, 'put', `${SEC}/entries`).send({ upserts: [] })).status).toBe(422);
    expect(
      (await write(admin, 'put', `${SEC}/entries`).send({ upserts: [{ sectionId: mine.section.id, ppeItemId: 'x', quantityRequired: 1 }] }))
        .status
    ).toBe(422);
    const missing = await write(admin, 'put', `${SEC}/entries`).send({
      deletes: [{ sectionId: '00000000-0000-4000-8000-000000000000', ppeItemId: gloves.id }],
    });
    expect(missing.status).toBe(404);
  });
});

describe('legacy and retired entries', () => {
  it('flags entries whose PPE item was retired', async () => {
    const section = (await fx.org()).section;
    await models.SectionPPEMatrix.create({ sectionId: section.id, ppeItemId: retired.id, quantityRequired: 1 });
    const [entry] = (await admin.get(`${SEC}/${section.id}`)).body.data.entries;
    expect(entry.ppeItem).toMatchObject({ id: retired.id, isActive: false });
    // It can still be removed
    const res = await write(stores, 'put', `${SEC}/entries`).send({ deletes: [{ sectionId: section.id, ppeItemId: retired.id }] });
    expect(res.body.data).toMatchObject({ deleted: 1 });
  });

  it('removing a job title row by id does not bring back a shared legacy row', async () => {
    const name = `${fx.tag}-legacy-welder`;
    const jt = await fx.jobTitle(mine.section.id, { name });
    await models.JobTitlePPEMatrix.create({ jobTitle: name, ppeItemId: helmet.id, quantityRequired: 4 });
    await write(admin, 'put', `${JT}/entries`).send({ upserts: [{ jobTitleId: jt.id, ppeItemId: helmet.id, quantityRequired: 1 }] });
    const [own] = (await admin.get(`${JT}/${jt.id}`)).body.data.entries;
    expect(own).toMatchObject({ quantityRequired: 1 });

    expect((await write(sheq, 'delete', `${JT}/entries/${own.id}`)).status).toBe(204);
    expect((await admin.get(`${JT}/${jt.id}`)).body.data.entries).toEqual([]);
    expect((await write(sheq, 'delete', `${JT}/entries/${own.id}`)).status).toBe(404);
    expect(await models.JobTitlePPEMatrix.count({ where: { jobTitle: name, jobTitleId: null, isActive: true } })).toBe(1);
  });
});

describe('options', () => {
  it('lists active PPE items and scoped sections', async () => {
    const items = (await hod.get('/api/v2/matrix/options/ppe-items')).body.data.map((i: { id: string }) => i.id);
    expect(items).toContain(gloves.id);
    expect(items).not.toContain(retired.id);

    const sections = (await hod.get('/api/v2/matrix/options/sections')).body.data.map((s: { id: string }) => s.id);
    expect(sections).toContain(mine.section.id);
    expect(sections).not.toContain(other.section.id);
    const filtered = await admin.get('/api/v2/matrix/options/sections').query({ departmentId: other.department.id });
    expect(filtered.body.data.map((s: { id: string }) => s.id)).toEqual([other.section.id]);
    expect((await admin.get('/api/v2/matrix/options/sections').query({ departmentId: 'x' })).status).toBe(422);
  });
});
