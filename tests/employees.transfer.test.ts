import { QueryTypes } from 'sequelize';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models, sequelize, type Row } from '../src/core/db';
import { spendByDepartment } from '../src/modules/budgets/spend';
import { prepareV2 } from '../src/v2';
import { PASSWORD, app, createFixtures, signIn, write } from './helpers';

const fx = createFixtures();
let w: Awaited<ReturnType<typeof world>>;

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

const world = async () => {
  const a = await fx.org();
  const b = await fx.org();
  const a2 = await fx.make('Section', { name: `${fx.tag}-a2`, departmentId: a.department.id });
  const fitter = await fx.make('JobTitle', { name: `${fx.tag}-Fitter`, sectionId: a.section.id });
  const driver = await fx.make('JobTitle', { name: `${fx.tag}-Driver`, sectionId: b.section.id });
  const ccA = await fx.make('CostCenter', { code: `${fx.tag}-CA`, name: `${fx.tag} A`, departmentId: a.department.id });
  const ccB = await fx.make('CostCenter', { code: `${fx.tag}-CB`, name: `${fx.tag} B`, departmentId: b.department.id });
  const boots = await fx.make('PPEItem', { itemCode: `${fx.tag}-BOOT`, name: `${fx.tag} Boots`, category: 'FEET' });
  const helmet = await fx.make('PPEItem', { itemCode: `${fx.tag}-HELM`, name: `${fx.tag} Helmet`, category: 'HEAD' });
  await fx.make('JobTitlePPEMatrix', { jobTitleId: fitter.id, ppeItemId: boots.id, quantityRequired: 1, isActive: true });
  await fx.make('SectionPPEMatrix', { sectionId: b.section.id, ppeItemId: helmet.id, quantityRequired: 1, isActive: true });

  const emp = await fx.employee(a.section.id, { jobTitleId: fitter.id, costCenterId: ccA.id });
  // The employee is also the section rep for their old section
  const account = await fx.user('section-rep', { employeeId: emp.id, sectionId: a.section.id });
  const requester = await fx.user('section-rep', { sectionId: a.section.id });
  const allocation = await fx.make('Allocation', {
    employeeId: emp.id,
    ppeItemId: boots.id,
    quantity: 1,
    issueDate: monthsAgo(1),
    unitCost: 40,
    totalCost: 40,
  });

  const request = (status: string, extra: Record<string, unknown> = {}) =>
    fx.make('Request', {
      employeeId: emp.id,
      requestedById: requester.id,
      sectionId: a.section.id,
      departmentId: a.department.id,
      status,
      requestType: 'replacement',
      ...extra,
    });
  const inHod = await request('hod-review', { sectionRepApprovalDate: new Date(), sectionRepApproverId: requester.id, sectionRepComment: 'ok' });
  const pending = await request('pending');
  const done = await request('fulfilled');

  const admin = await signIn((await fx.user('admin')).username);
  const deptRep = await signIn((await fx.user('department-rep', { departmentId: a.department.id })).username);
  return { a, b, a2, fitter, driver, ccA, ccB, boots, helmet, emp, account, allocation, inHod, pending, done, admin, deptRep };
};

const body = (emp: Row, overrides: Record<string, unknown>) => ({
  worksNumber: emp.worksNumber,
  firstName: emp.firstName,
  lastName: emp.lastName,
  sectionId: emp.sectionId,
  jobTitleId: emp.jobTitleId,
  costCenterId: emp.costCenterId,
  ...overrides,
});

const issueScope = async (id: string) => {
  const [row] = await sequelize.query<{ section_id: string; department_id: string }>(
    'SELECT section_id, department_id FROM allocations WHERE id = :id',
    { type: QueryTypes.SELECT, replacements: { id } }
  );
  return row;
};

beforeAll(async () => {
  await prepareV2();
  w = await world();
}, 60_000);

afterAll(() => fx.cleanup());

describe('employee transfer', () => {
  it('records the section and department an allocation was issued under', async () => {
    expect(await issueScope(w.allocation.id)).toEqual({ section_id: w.a.section.id, department_id: w.a.department.id });
  });

  it('refuses a job title from the old section or a cost centre from the old department', async () => {
    const job = await write(w.admin, 'put', `/api/v2/employees/${w.emp.id}`).send(body(w.emp, { sectionId: w.b.section.id, costCenterId: w.ccB.id }));
    expect(job.status).toBe(422);
    expect(job.body.error.details.fieldErrors.jobTitleId).toBeTruthy();

    const cc = await write(w.admin, 'put', `/api/v2/employees/${w.emp.id}`).send(body(w.emp, { sectionId: w.b.section.id, jobTitleId: w.driver.id }));
    expect(cc.status).toBe(422);
    expect(cc.body.error.details.fieldErrors.costCenterId).toBeTruthy();
  });

  it('previews what the move changes without saving it', async () => {
    const res = await w.admin.get(`/api/v2/employees/${w.emp.id}/transfer-preview`).query({ sectionId: w.b.section.id, jobTitleId: w.driver.id });
    expect(res.status).toBe(200);
    const p = res.body.data;
    expect(p).toMatchObject({ sectionChanged: true, departmentChanged: true, jobTitleChanged: true, canMoveAccounts: true });
    expect(p.requests.map((r: { id: string; restarts: boolean }) => [r.id, r.restarts]).sort()).toEqual(
      [
        [w.inHod.id, true],
        [w.pending.id, false],
      ].sort()
    );
    expect(p.accounts).toEqual([expect.objectContaining({ id: w.account.id, managesOld: true, followsEmployee: false })]);
    expect(p.matrix.added.map((i: { id: string }) => i.id)).toEqual([w.helmet.id]);
    expect(p.matrix.notRequired.map((i: { id: string }) => i.id)).toEqual([w.boots.id]);
    expect(p.matrix.toIssue.map((i: { id: string }) => i.id)).toEqual([w.helmet.id]);

    const unchanged = await models.Employee.findByPk(w.emp.id);
    expect(unchanged!.sectionId).toBe(w.a.section.id);
  });

  it('does not let a department rep move user accounts', async () => {
    const res = await w.deptRep.get(`/api/v2/employees/${w.emp.id}/transfer-preview`).query({ sectionId: w.a2.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ sectionChanged: true, departmentChanged: false, canMoveAccounts: false });
  });

  it('a job title change alone leaves open requests in their stage', async () => {
    const other = await fx.make('JobTitle', { name: `${fx.tag}-Rigger`, sectionId: w.a.section.id });
    const res = await write(w.admin, 'put', `/api/v2/employees/${w.emp.id}`).send(body(w.emp, { jobTitleId: other.id }));
    expect(res.status).toBe(200);
    expect(res.body.data.transfer).toMatchObject({ sectionChanged: false, jobTitleChanged: true, requestsRestarted: 0 });
    expect((await models.Request.findByPk(w.inHod.id))!.status).toBe('hod-review');
    await write(w.admin, 'put', `/api/v2/employees/${w.emp.id}`).send(body(w.emp, {}));
  });

  it('moves open requests, restarts approvals, moves accounts and keeps past spend', async () => {
    const res = await write(w.admin, 'put', `/api/v2/employees/${w.emp.id}`).send(
      body(w.emp, { sectionId: w.b.section.id, jobTitleId: w.driver.id, costCenterId: w.ccB.id, moveAccounts: true })
    );
    expect(res.status).toBe(200);
    expect(res.body.data.department.id).toBe(w.b.department.id);
    expect(res.body.data.transfer).toEqual({
      sectionChanged: true,
      departmentChanged: true,
      jobTitleChanged: true,
      requestsMoved: 2,
      requestsRestarted: 1,
      accountsMoved: 1,
    });

    const inHod = (await models.Request.findByPk(w.inHod.id))!;
    expect(inHod).toMatchObject({ status: 'pending', sectionId: w.b.section.id, departmentId: w.b.department.id });
    expect(inHod.sectionRepApprovalDate).toBeNull();
    expect(inHod.sectionRepApproverId).toBeNull();
    expect((await models.Request.findByPk(w.pending.id))!.sectionId).toBe(w.b.section.id);
    expect((await models.Request.findByPk(w.done.id))!).toMatchObject({ status: 'fulfilled', sectionId: w.a.section.id });
    expect((await models.User.findByPk(w.account.id))!.sectionId).toBe(w.b.section.id);

    expect(await issueScope(w.allocation.id)).toEqual({ section_id: w.a.section.id, department_id: w.a.department.id });
    const range = { start: monthsAgo(3).toISOString().slice(0, 10), end: new Date(Date.now() + 86400000).toISOString().slice(0, 10) };
    expect((await spendByDepartment(range, w.a.department.id)).get(w.a.department.id)?.allocationCount).toBe(1);
    expect((await spendByDepartment(range, w.b.department.id)).get(w.b.department.id)).toBeUndefined();

    const detail = await w.admin.get(`/api/v2/employees/${w.emp.id}`);
    expect(detail.body.data.transfers[0]).toMatchObject({
      from: { section: w.a.section.name, department: w.a.department.name, jobTitle: w.fitter.name },
      to: { section: w.b.section.name, department: w.b.department.name, jobTitle: w.driver.name },
      requestsRestarted: 1,
    });
  });

  it('keeps an allocation issued after the move with the new department', async () => {
    const later = await fx.make('Allocation', { employeeId: w.emp.id, ppeItemId: w.helmet.id, quantity: 1, issueDate: new Date() });
    expect(await issueScope(later.id)).toEqual({ section_id: w.b.section.id, department_id: w.b.department.id });
  });

  it('the classic (v1) update moves open requests too', async () => {
    const admin = await fx.user('admin');
    const login = await request(app).post('/api/v1/auth/login').send({ username: admin.username, password: PASSWORD });
    const restart = await fx.make('Request', {
      employeeId: w.emp.id,
      requestedById: admin.id,
      sectionId: w.b.section.id,
      departmentId: w.b.department.id,
      status: 'stores-review',
      requestType: 'replacement',
    });
    const res = await request(app)
      .put(`/api/v1/employees/${w.emp.id}`)
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ sectionId: w.a2.id });
    expect(res.status).toBe(200);
    expect((await models.Request.findByPk(restart.id))!).toMatchObject({ status: 'pending', sectionId: w.a2.id, departmentId: w.a.department.id });
  });

  it('an import that moves an employee clears a cost centre from the old department and restarts approvals', async () => {
    const emp = await fx.employee(w.a.section.id, { costCenterId: w.ccA.id });
    const requester = await fx.user('section-rep', { sectionId: w.a.section.id });
    const open = await fx.make('Request', {
      employeeId: emp.id,
      requestedById: requester.id,
      sectionId: w.a.section.id,
      departmentId: w.a.department.id,
      status: 'hod-review',
      requestType: 'replacement',
    });
    const row = { worksNumber: emp.worksNumber, firstName: emp.firstName, lastName: emp.lastName, section: w.b.section.name };

    const dry = await write(w.admin, 'post', '/api/v2/employees/import').send({ dryRun: true, rows: [row] });
    expect(dry.body.data.warnings).toEqual([expect.objectContaining({ field: 'costCentre', message: expect.stringMatching(/old department/) })]);

    const res = await write(w.admin, 'post', '/api/v2/employees/import').send({ rows: [row] });
    expect(res.status).toBe(200);
    expect((await models.Employee.findByPk(emp.id))!).toMatchObject({ sectionId: w.b.section.id, costCenterId: null });
    expect((await models.Request.findByPk(open.id))!).toMatchObject({ status: 'pending', departmentId: w.b.department.id });
  });
});
