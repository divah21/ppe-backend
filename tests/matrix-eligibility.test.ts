import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { addMonths, computeEligibility } from '../src/modules/matrix/service';
import { prepareV2 } from '../src/v2';
import { app, signIn } from './helpers';
import { createMatrixFixtures, monthsAgo } from './matrix.fixtures';

type Agent = Awaited<ReturnType<typeof signIn>>;
type Item = { ppeItemId: string } & Record<string, unknown>;

const fx = createMatrixFixtures();
const URL = '/api/v2/matrix/eligibility';

let admin: Agent, hod: Agent, otherRep: Agent;
let mine: Awaited<ReturnType<typeof fx.org>>;
let other: Awaited<ReturnType<typeof fx.org>>;
let employee: { id: string };
let gloves: { id: string }, boots: { id: string }, helmet: { id: string }, vest: { id: string };

beforeAll(async () => {
  await prepareV2();
  mine = await fx.org();
  other = await fx.org();
  const jt = await fx.jobTitle(mine.section.id);
  gloves = await fx.ppeItem({ replacementFrequency: 6 });
  boots = await fx.ppeItem();
  helmet = await fx.ppeItem();
  vest = await fx.ppeItem({ isActive: false });

  // Section baseline: gloves (item frequency 6) and boots; job title overrides boots and adds a helmet
  await models.SectionPPEMatrix.bulkCreate([
    { sectionId: mine.section.id, ppeItemId: gloves.id, quantityRequired: 1 },
    { sectionId: mine.section.id, ppeItemId: boots.id, quantityRequired: 1, replacementFrequency: 24 },
    { sectionId: mine.section.id, ppeItemId: vest.id, quantityRequired: 1 },
  ]);
  await models.JobTitlePPEMatrix.bulkCreate([
    { jobTitleId: jt.id, jobTitle: jt.name, ppeItemId: boots.id, quantityRequired: 2, replacementFrequency: 12, isMandatory: false },
    { jobTitleId: jt.id, jobTitle: jt.name, ppeItemId: helmet.id, quantityRequired: 1, replacementFrequency: 12 },
  ]);

  employee = await fx.employee(mine.section.id, { jobTitleId: jt.id, jobTitle: jt.name });
  await fx.allocation(employee.id, gloves.id, monthsAgo(8));
  await fx.allocation(employee.id, gloves.id, monthsAgo(2));
  await fx.allocation(employee.id, boots.id, monthsAgo(13), { status: 'expired' });

  admin = await signIn((await fx.user('admin')).username);
  hod = await signIn((await fx.user('hod', { departmentId: mine.department.id })).username);
  otherRep = await signIn((await fx.user('section-rep', { sectionId: other.section.id })).username);
});
afterAll(() => fx.cleanup());

describe('GET /matrix/eligibility', () => {
  it('merges the section baseline with job-title overrides and works out due dates', async () => {
    const res = await hod.get(URL).query({ employeeId: employee.id });
    expect(res.status).toBe(200);
    const { employee: who, items, summary } = res.body.data;
    expect(who).toMatchObject({ id: employee.id, section: { id: mine.section.id }, department: { id: mine.department.id } });
    const byItem: Record<string, Item> = Object.fromEntries(items.map((i: Item) => [i.ppeItemId, i]));

    // Inactive PPE items are not offered
    expect(Object.keys(byItem).sort()).toEqual([gloves.id, boots.id, helmet.id].sort());
    // Latest gloves issue was 2 months ago; the item replaces every 6, so not due for ~4 months
    expect(byItem[gloves.id]).toMatchObject({ source: 'section', replacementMonths: 6, isDue: false });
    expect(byItem[gloves.id]!.daysUntilDue).toBeGreaterThan(100);
    // Job title overrides the section's boots row
    expect(byItem[boots.id]).toMatchObject({ source: 'jobTitle', quantity: 2, isMandatory: false, isDue: true, daysUntilDue: 0 });
    // Never issued: due now
    expect(byItem[helmet.id]).toMatchObject({ source: 'jobTitle', lastIssueDate: null, nextDueDate: null, isDue: true });
    expect(summary).toEqual({ total: 3, due: 2, fromJobTitle: 2, fromSection: 1 });
  });

  it('hides employees outside the user scope', async () => {
    expect((await otherRep.get(URL).query({ employeeId: employee.id })).status).toBe(404);
    expect((await admin.get(URL).query({ employeeId: '00000000-0000-4000-8000-000000000000' })).status).toBe(404);
  });

  it('validates the query and needs a session', async () => {
    expect((await admin.get(URL)).status).toBe(422);
    expect((await admin.get(URL).query({ employeeId: 'abc' })).status).toBe(422);
    expect((await request(app).get(URL).query({ employeeId: employee.id })).status).toBe(401);
  });
});

describe('computeEligibility', () => {
  it('falls back to the PPE category job title and prefers a stored renewal date', async () => {
    const category = await fx.jobTitle(other.section.id);
    const jt = await fx.jobTitle(other.section.id, { ppeCategoryId: category.id });
    await models.JobTitlePPEMatrix.create({ jobTitleId: category.id, jobTitle: category.name, ppeItemId: helmet.id, quantityRequired: 1 });
    const person = await fx.employee(other.section.id, { jobTitleId: jt.id });
    const renewal = addMonths(new Date(), 1);
    await fx.allocation(person.id, helmet.id, monthsAgo(1), { nextRenewalDate: renewal });

    const result = await computeEligibility(person.id);
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]).toMatchObject({ ppeItemId: helmet.id, source: 'jobTitle', replacementMonths: 12, isDue: false });
    expect(result?.items[0]?.nextDueDate?.getTime()).toBe(renewal.getTime());

    const later = await computeEligibility(person.id, { now: addMonths(new Date(), 2) });
    expect(later?.items[0]?.isDue).toBe(true);
    expect(await computeEligibility('00000000-0000-4000-8000-000000000000')).toBeNull();
  });

  it('adds months without spilling into the next month', () => {
    expect(addMonths(new Date('2026-01-31T00:00:00Z'), 1).toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(addMonths(new Date('2026-03-15T10:00:00Z'), 12).toISOString()).toBe('2027-03-15T10:00:00.000Z');
  });
});
