import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models, sequelize } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { createFixtures, signIn, write } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;
const fx = createFixtures();
let admin: Agent, sectionRep: Agent, hod: Agent;
let section: { id: string; name: string };
let worker: { id: string };

beforeAll(async () => {
  await prepareV2();
  const org = await fx.org();
  section = org.section;
  worker = await fx.employee(section.id, { jobType: 'NEC' });
  await fx.employee(section.id, { jobType: 'SALARIED' });
  const item = await fx.make('PPEItem', { name: `${fx.tag} Gloves`, itemCode: `${fx.tag}-G` });
  await fx.make('Allocation', { employeeId: worker.id, ppeItemId: item.id, quantity: 3, status: 'active', issueDate: new Date() });
  admin = await signIn((await fx.user('admin')).username);
  sectionRep = await signIn((await fx.user('section-rep', { sectionId: section.id })).username);
  hod = await signIn((await fx.user('hod', { departmentId: org.department.id })).username);
});
afterAll(async () => {
  await sequelize.query(`DELETE FROM employees WHERE "worksNumber" LIKE :tag`, { replacements: { tag: `${fx.tag}-IMP%` } });
  await fx.cleanup();
});

describe('employees list and summary', () => {
  it('filters by job type and says how much PPE each person holds', async () => {
    const res = await sectionRep.get('/api/v2/employees').query({ jobType: 'nec', sectionId: section.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: worker.id, ppeHeld: 3, jobType: 'NEC' });
  });

  it('summarises headcount, job types and people without PPE in scope', async () => {
    const res = await hod.get('/api/v2/employees/summary').query({ sectionId: section.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ total: 2, active: 2, inactive: 0, nec: 1, salaried: 1, withoutPpe: 1 });
    const types = await sectionRep.get('/api/v2/employees/job-types');
    expect(types.body.data).toEqual(expect.arrayContaining(['NEC', 'SALARIED']));
  });
});

describe('employee import options', () => {
  const rows = () => [
    { worksNumber: `${fx.tag}-IMP1`, firstName: 'Ann', lastName: 'One', section: section.name },
    { worksNumber: `${fx.tag}-IMP2`, firstName: 'Ben', lastName: 'Two', section: section.name },
  ];

  it('can leave existing employees as they are', async () => {
    const first = await write(admin, 'post', '/api/v2/employees/import').send({ rows: rows() });
    expect(first.body.data).toMatchObject({ created: 2, updated: 0, skipped: 0 });
    const changed = rows().map((r) => ({ ...r, firstName: 'Changed' }));
    const check = await write(admin, 'post', '/api/v2/employees/import').send({ dryRun: true, skipExisting: true, rows: changed });
    expect(check.body.data).toMatchObject({ created: 0, updated: 0, skipped: 2 });
    await write(admin, 'post', '/api/v2/employees/import').send({ skipExisting: true, rows: changed });
    expect((await models.Employee.findOne({ where: { worksNumber: `${fx.tag}-IMP1` } }))!.firstName).toBe('Ann');
    // A skipped row's problems do not block the rest
    const mixed = await write(admin, 'post', '/api/v2/employees/import').send({
      dryRun: true,
      skipExisting: true,
      rows: [{ ...rows()[0], section: 'No such section' }, { worksNumber: `${fx.tag}-IMP3`, firstName: 'Cy', lastName: 'Three', section: section.name }],
    });
    expect(mixed.body.data).toMatchObject({ valid: true, created: 1, skipped: 1, errors: [] });
  });
});

describe('employees report', () => {
  it('exports the employee list for the caller’s scope', async () => {
    const res = await sectionRep.get('/api/v2/reports/employees');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
  });
});
