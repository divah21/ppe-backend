import { Op } from 'sequelize';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { employeeWorld, type EmployeeWorld } from './employees.fixtures';
import { createFixtures, write } from './helpers';

const fx = createFixtures();
let w: EmployeeWorld;

const URL = '/api/v2/employees/import';
const NUMERIC = Number(`9${Date.now().toString().slice(-9)}`);

const imported = () => models.Employee.findAll({ where: { worksNumber: { [Op.like]: `${fx.tag}-imp-%` } } });

beforeAll(async () => {
  await prepareV2();
  w = await employeeWorld(fx);
});
afterAll(async () => {
  for (const e of await imported()) fx.track('Employee', e.id);
  await fx.cleanup();
});

const row = (n: number, extra: Record<string, unknown> = {}) => ({
  worksNumber: `${fx.tag}-imp-${n}`,
  firstName: 'Import',
  lastName: `Person${n}`,
  section: w.mine.section.name,
  ...extra,
});

describe('POST /employees/import', () => {
  it('previews per-row errors without writing anything', async () => {
    const res = await write(w.agents.admin, 'post', URL).send({
      dryRun: true,
      rows: [
        row(1),
        row(2, { section: 'No such section' }),
        row(3, { firstName: '', email: 'bad' }),
        row(1),
        row(5, { worksNumber: w.employees.c.worksNumber, section: w.other.section.name }),
      ],
    });
    expect(res.status).toBe(200);
    const result = res.body.data;
    expect(result).toMatchObject({ dryRun: true, valid: false, total: 5, created: 1, updated: 1 });
    const problems = result.errors.map((e: { index: number; field: string }) => `${e.index}:${e.field}`);
    expect(problems).toEqual(expect.arrayContaining(['1:section', '2:firstName', '2:email', '3:worksNumber']));
    expect(problems).not.toContain('0:worksNumber');
    expect(await imported()).toHaveLength(0);
  });

  it('refuses to commit when any row is invalid', async () => {
    const res = await write(w.agents.admin, 'post', URL).send({ rows: [row(1), row(2, { lastName: '' })] });
    expect(res.status).toBe(422);
    expect(res.body.error.details.errors).toEqual([
      expect.objectContaining({ index: 1, field: 'lastName', worksNumber: `${fx.tag}-imp-2` }),
    ]);
    expect(await imported()).toHaveLength(0);
  });

  it('creates and updates in one transaction, resolving names and codes', async () => {
    const res = await write(w.agents.admin, 'post', URL).send({
      rows: [
        row(10, {
          section: w.sectionB.get('code'),
          gender: 'f',
          jobType: 'nec',
          costCentre: `${fx.tag}-cc`,
          email: 'Someone@Example.com',
          dateJoined: '2023-05-04',
        }),
        row(11, { jobTitle: `${fx.tag}-fitter`, worksNumber: NUMERIC }),
        row(12, { jobTitle: 'Unknown title', contractType: 'terminated' }),
        { ...row(13), worksNumber: w.employees.c.worksNumber, firstName: 'Chipo-Updated', section: w.other.section.name },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ dryRun: false, valid: true, total: 4, created: 3, updated: 1, errors: [] });
    expect(res.body.data.warnings).toEqual([expect.objectContaining({ index: 2, field: 'jobTitle' })]);

    fx.track('Employee', (await models.Employee.findOne({ where: { worksNumber: String(NUMERIC) } }))!.id);
    const byNumber = Object.fromEntries((await imported()).map((e) => [e.worksNumber, e]));
    expect(byNumber[`${fx.tag}-imp-10`]).toMatchObject({
      sectionId: w.sectionB.id,
      gender: 'FEMALE',
      jobType: 'NEC',
      costCenterId: w.costCentre.id,
      email: 'someone@example.com',
      isActive: true,
    });
    expect(byNumber[`${fx.tag}-imp-12`]).toMatchObject({ isActive: false, jobTitle: 'Unknown title', jobTitleId: null });
    const numeric = await models.Employee.findOne({ where: { worksNumber: String(NUMERIC) } });
    expect(numeric?.jobTitleId).toBe(w.jobTitle.id);

    const updated = await models.Employee.findByPk(w.employees.c.id);
    expect(updated?.firstName).toBe('Chipo-Updated');
    expect(updated?.lastName).toBe('Person13');

    const audit = await models.AuditLog.count({ where: { action: 'BULK_IMPORT', entityType: 'Employee' } });
    expect(audit).toBeGreaterThan(0);
  });

  it('flags a section name shared by two sections as ambiguous', async () => {
    await fx.make('Section', { name: w.sectionB.name, departmentId: w.other.department.id });
    const res = await write(w.agents.admin, 'post', URL).send({ dryRun: true, rows: [row(20, { section: w.sectionB.name })] });
    expect(res.body.data.errors).toEqual([expect.objectContaining({ field: 'section', message: expect.stringMatching(/more than one/) })]);
  });

  it('validates the envelope', async () => {
    expect((await write(w.agents.admin, 'post', URL).send({ rows: [] })).status).toBe(422);
    expect((await write(w.agents.admin, 'post', URL).send({ rows: 'x' })).status).toBe(422);
    const tooMany = Array.from({ length: 2001 }, (_, i) => row(i));
    expect((await write(w.agents.admin, 'post', URL).send({ dryRun: true, rows: tooMany })).status).toBe(422);
  });

  it('is admin only', async () => {
    for (const agent of [w.agents.sectionRep, w.agents.deptRep, w.agents.hod, w.agents.sheq, w.agents.stores]) {
      expect((await write(agent, 'post', URL).send({ dryRun: true, rows: [row(30)] })).status).toBe(403);
    }
  });
});
