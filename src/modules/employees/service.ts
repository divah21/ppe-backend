import { Op, literal, type Includeable, type Order, type Transaction, type WhereOptions } from 'sequelize';
import type { z } from 'zod';
import { ROLES, type AuthContext } from '../../core/auth';
import { config } from '../../core/config';
import { inTransaction, models, sequelize, type Row } from '../../core/db';
import { conflict, fieldError, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { logger } from '../../core/logger';
import { allowedActions, employeeScope, sectionScope, sectionWithinScope } from './policy';
import type { EmployeeInput, EmployeeUpdate, employeeListQuery, employeeOptionsQuery, TransferQuery } from './schemas';
import { placementOf, recordTransfer, transferHistory, transferPreview, type KnownDepartments } from './transfer';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { sendEmployeeOnboardedEmail } = require('../../../helpers/email_helper');

const DAY_MS = 24 * 60 * 60 * 1000;
export const DUE_SOON_DAYS = 30;
const RECENT_REQUESTS = 10;

const INCLUDE: Includeable[] = [
  {
    model: models.Section,
    as: 'section',
    attributes: ['id', 'name', 'departmentId'],
    include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
  },
  { model: models.JobTitle, as: 'jobTitleRef', attributes: ['id', 'name'], required: false },
  { model: models.CostCenter, as: 'costCenter', attributes: ['id', 'code', 'name'], required: false },
];

/** Today's calendar date on the server (the mine's local time), stored like a picked date. */
export const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dateOnly = (v: unknown) => (v ? new Date(v as string).toISOString().slice(0, 10) : null);

export const toEmployee = (row: Row, auth: AuthContext) => {
  const section = row.section as Row | null;
  const department = section?.department as Row | null;
  const jobTitle = row.jobTitleRef as Row | null;
  const costCentre = row.costCenter as Row | null;
  return {
    id: row.id as string,
    worksNumber: row.worksNumber as string,
    employeeId: (row.employeeId as string | null) ?? null,
    firstName: row.firstName as string,
    lastName: row.lastName as string,
    fullName: `${row.firstName} ${row.lastName}`,
    email: (row.email as string | null) ?? null,
    phoneNumber: (row.phoneNumber as string | null) ?? null,
    jobType: (row.jobType as string | null) ?? null,
    gender: (row.gender as string | null) ?? null,
    contractType: (row.contractType as string | null) ?? null,
    dateOfBirth: dateOnly(row.dateOfBirth),
    dateJoined: dateOnly(row.dateJoined),
    isActive: !!row.isActive,
    section: section ? { id: section.id as string, name: section.name as string } : null,
    department: department ? { id: department.id as string, name: department.name as string } : null,
    // Older records only carry the free-text job title
    jobTitle: jobTitle
      ? { id: jobTitle.id as string | null, name: jobTitle.name as string }
      : row.jobTitle
        ? { id: null, name: row.jobTitle as string }
        : null,
    costCentre: costCentre
      ? { id: costCentre.id as string, code: costCentre.code as string, name: costCentre.name as string }
      : null,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
    allowedActions: allowedActions(auth, !!row.isActive),
  };
};

export type EmployeeDto = ReturnType<typeof toEmployee>;

const orderFor = (sort: string | undefined, dir: 'ASC' | 'DESC'): Order => {
  switch (sort) {
    case 'worksNumber':
      return [['worksNumber', dir]];
    case 'section':
      return [[{ model: models.Section, as: 'section' }, 'name', dir], ['lastName', 'ASC'], ['id', 'ASC']];
    case 'dateJoined':
      return [['dateJoined', dir], ['id', 'ASC']];
    case 'createdAt':
      return [['createdAt', dir], ['id', 'ASC']];
    default:
      return [['lastName', dir], ['firstName', dir], ['id', 'ASC']];
  }
};

const searchWhere = (q: string): WhereOptions => {
  const term = likeTerm(q);
  return {
    [Op.or]: [
      { worksNumber: { [Op.iLike]: term } },
      { firstName: { [Op.iLike]: term } },
      { lastName: { [Op.iLike]: term } },
      sequelize.where(
        sequelize.fn('concat', sequelize.col('Employee.firstName'), ' ', sequelize.col('Employee.lastName')),
        { [Op.iLike]: term }
      ),
    ],
  };
};

const inDepartment = (departmentId: string) =>
  literal(`(SELECT s.id FROM sections s WHERE s.department_id = ${sequelize.escape(departmentId)})`);

export const listEmployees = async (auth: AuthContext, q: z.infer<typeof employeeListQuery>) => {
  const where: WhereOptions[] = [employeeScope(auth)];
  if (q.q) where.push(searchWhere(q.q));
  if (q.departmentId) where.push({ sectionId: { [Op.in]: inDepartment(q.departmentId) } });
  if (q.sectionId) where.push({ sectionId: q.sectionId });
  if (q.jobTitleId) where.push({ jobTitleId: q.jobTitleId });
  if (q.status) where.push({ isActive: q.status === 'active' });
  if (q.jobType) where.push({ jobType: q.jobType });

  const sorted = !!q.sort;
  const { rows, count } = await models.Employee.findAndCountAll({
    where: { [Op.and]: where },
    include: INCLUDE,
    attributes: { include: [[PPE_HELD, 'ppeHeld']] },
    order: orderFor(q.sort, sorted ? (q.order.toUpperCase() as 'ASC' | 'DESC') : 'ASC'),
    ...pageWindow(q),
  });
  return { rows: rows.map((r) => ({ ...toEmployee(r, auth), ppeHeld: Number(r.get('ppeHeld') ?? 0) })), count };
};

// Items the employee holds now, as the profile's "PPE in use" counts them
const PPE_HELD = literal(`(SELECT COALESCE(SUM(a.quantity), 0) FROM allocations a WHERE a.employee_id = "Employee"."id" AND a.status = 'active')`);

/** Figures for the employees cards, within the user's scope and the chosen department or section. */
export const employeeSummary = async (auth: AuthContext, q: { departmentId?: string; sectionId?: string }) => {
  const where: WhereOptions[] = [employeeScope(auth)];
  if (q.departmentId) where.push({ sectionId: { [Op.in]: inDepartment(q.departmentId) } });
  if (q.sectionId) where.push({ sectionId: q.sectionId });
  const [r] = (await models.Employee.findAll({
    where: { [Op.and]: where },
    attributes: [
      [literal('COUNT(*)'), 'total'],
      [literal('COUNT(*) FILTER (WHERE "Employee"."isActive")'), 'active'],
      [literal(`COUNT(*) FILTER (WHERE "Employee"."isActive" AND UPPER(COALESCE("Employee"."jobType", '')) = 'NEC')`), 'nec'],
      [literal(`COUNT(*) FILTER (WHERE "Employee"."isActive" AND UPPER(COALESCE("Employee"."jobType", '')) = 'SALARIED')`), 'salaried'],
      [
        literal(`COUNT(*) FILTER (WHERE "Employee"."isActive" AND NOT EXISTS (
          SELECT 1 FROM allocations a WHERE a.employee_id = "Employee"."id" AND a.status = 'active'))`),
        'withoutPpe',
      ],
    ],
    raw: true,
  })) as unknown as Array<Record<string, string>>;
  const n = (k: string) => Number(r?.[k] ?? 0);
  return { total: n('total'), active: n('active'), inactive: n('total') - n('active'), nec: n('nec'), salaried: n('salaried'), withoutPpe: n('withoutPpe') };
};

/** Job types in use, for the list filter. */
export const employeeJobTypes = async (auth: AuthContext) => {
  const rows = (await models.Employee.findAll({
    where: { [Op.and]: [employeeScope(auth), { jobType: { [Op.ne]: null } }] },
    attributes: [[literal('DISTINCT "Employee"."jobType"'), 'jobType']],
    raw: true,
  })) as unknown as Array<{ jobType: string }>;
  return rows.map((r) => r.jobType).filter(Boolean).sort();
};

export const OPTIONS_LIMIT = 20;

export const employeeOptions = async (auth: AuthContext, q: z.infer<typeof employeeOptionsQuery>) => {
  const where: WhereOptions[] = [employeeScope(auth), { isActive: true }];
  if (q.q) where.push(searchWhere(q.q));
  if (q.sectionId) where.push({ sectionId: q.sectionId });
  const rows = await models.Employee.findAll({
    where: { [Op.and]: where },
    attributes: ['id', 'worksNumber', 'firstName', 'lastName'],
    order: [['lastName', 'ASC'], ['firstName', 'ASC'], ['id', 'ASC']],
    limit: OPTIONS_LIMIT,
  });
  return rows.map((r) => ({
    id: r.id as string,
    name: `${r.firstName} ${r.lastName}`,
    worksNumber: r.worksNumber as string,
  }));
};

/** Organisation pickers for the employee screens, limited to the sections the user works with. */
export const employeeLookups = async (auth: AuthContext) => {
  const sections = await models.Section.findAll({
    where: { [Op.and]: [sectionScope(auth), { isActive: true }] },
    attributes: ['id', 'name', 'code', 'departmentId'],
    include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
    order: [['name', 'ASC']],
  });
  const sectionIds = sections.map((s) => s.id as string);
  const [jobTitles, costCentres] = await Promise.all([
    models.JobTitle.findAll({
      where: { sectionId: { [Op.in]: sectionIds }, isActive: true },
      attributes: ['id', 'name', 'sectionId'],
      order: [['name', 'ASC']],
    }),
    models.CostCenter.findAll({ where: { isActive: true }, attributes: ['id', 'code', 'name', 'departmentId'], order: [['code', 'ASC']] }),
  ]);
  const departments = new Map<string, { id: string; name: string }>();
  for (const s of sections) {
    const d = s.department as Row | null;
    if (d) departments.set(d.id, { id: d.id as string, name: d.name as string });
  }
  return {
    departments: [...departments.values()].sort((a, b) => a.name.localeCompare(b.name)),
    sections: sections.map((s) => ({
      id: s.id as string,
      name: s.name as string,
      code: (s.code as string | null) ?? null,
      departmentId: (s.departmentId as string | null) ?? null,
    })),
    jobTitles: jobTitles.map((j) => ({ id: j.id as string, name: j.name as string, sectionId: j.sectionId as string })),
    costCentres: costCentres.map((c) => ({
      id: c.id as string,
      code: c.code as string,
      name: c.name as string,
      departmentId: (c.departmentId as string | null) ?? null,
    })),
  };
};

const findInScope = async (auth: AuthContext, id: string, t?: Transaction) => {
  const row = await models.Employee.findOne({
    where: { [Op.and]: [employeeScope(auth), { id }] },
    ...(t ? { transaction: t, lock: t.LOCK.UPDATE } : { include: INCLUDE }),
  });
  if (!row) throw notFound('Employee');
  return row;
};

/**
 * Renewal date the way v1 shows it: issue date plus the item's replacement frequency, falling back
 * to the stored next renewal date.
 */
export const renewalFor = (issueDate: Date | string | null, frequencyMonths: unknown, stored: Date | string | null) => {
  const months = Number.parseInt(String(frequencyMonths ?? ''), 10);
  if (issueDate && Number.isFinite(months) && months > 0) {
    const due = new Date(issueDate);
    due.setMonth(due.getMonth() + months);
    return due;
  }
  return stored ? new Date(stored) : null;
};

const dueStatus = (renewal: Date | null, now: Date) => {
  if (!renewal) return { daysUntilRenewal: null, dueStatus: 'none' as const };
  const days = Math.ceil((renewal.getTime() - now.getTime()) / DAY_MS);
  return {
    daysUntilRenewal: days,
    dueStatus: days < 0 ? ('overdue' as const) : days <= DUE_SOON_DAYS ? ('due-soon' as const) : ('ok' as const),
  };
};

const toAllocation = (row: Row, now: Date) => {
  const item = row.ppeItem as Row | null;
  const renewal = renewalFor(row.issueDate, item?.replacementFrequency, row.nextRenewalDate);
  return {
    id: row.id as string,
    ppeItem: item
      ? {
          id: item.id as string,
          name: item.name as string,
          itemCode: (item.itemCode as string | null) ?? null,
          category: (item.category as string | null) ?? null,
        }
      : null,
    quantity: Number(row.quantity),
    size: (row.size as string | null) ?? null,
    allocationType: row.allocationType as string,
    issueDate: row.issueDate as Date,
    nextRenewalDate: renewal,
    ...dueStatus(renewal, now),
  };
};

const ITEM_COUNT = literal('(SELECT COUNT(*) FROM request_items ri WHERE ri.request_id = "Request"."id")');

const toRequest = (row: Row) => ({
  id: row.id as string,
  status: row.status as string,
  requestType: row.requestType as string,
  itemCount: Number(row.get('itemCount') ?? 0),
  createdAt: row.createdAt as Date,
});

export const getEmployee = async (auth: AuthContext, id: string) => {
  const row = await findInScope(auth, id);
  const [allocations, requests, requestCount, transfers] = await Promise.all([
    models.Allocation.findAll({
      where: { employeeId: id, status: 'active' },
      include: [
        { model: models.PPEItem, as: 'ppeItem', attributes: ['id', 'name', 'itemCode', 'category', 'replacementFrequency'] },
      ],
      order: [['issueDate', 'DESC']],
      limit: 200,
    }),
    models.Request.findAll({
      where: { employeeId: id },
      attributes: ['id', 'status', 'requestType', 'createdAt', [ITEM_COUNT, 'itemCount']],
      order: [['createdAt', 'DESC']],
      limit: RECENT_REQUESTS,
    }),
    models.Request.count({ where: { employeeId: id } }),
    transferHistory(id),
  ]);

  const now = new Date();
  const currentPpe = allocations.map((a) => toAllocation(a, now));
  return {
    ...toEmployee(row, auth),
    ppeSummary: {
      activeItems: currentPpe.length,
      overdue: currentPpe.filter((a) => a.dueStatus === 'overdue').length,
      dueSoon: currentPpe.filter((a) => a.dueStatus === 'due-soon').length,
      requestCount,
    },
    currentPpe,
    recentRequests: requests.map(toRequest),
    transfers,
  };
};

/** The section, if it exists and the user may place employees in it. */
const sectionInScope = async (auth: AuthContext, sectionId: string, t?: Transaction) => {
  const section = await models.Section.findByPk(sectionId, { attributes: ['id', 'departmentId'], transaction: t });
  if (!section || !sectionWithinScope(auth, { id: section.id, departmentId: section.departmentId ?? null })) {
    throw fieldError('sectionId', 'Choose a section you manage');
  }
  return section;
};

/**
 * Checks the referenced section (and that it is in the user's scope), job title and cost centre.
 * A job title must belong to the chosen section and a cost centre to its department, except ones the
 * record already carries there (older data crossed both) so such records can still be edited.
 */
const checkReferences = async (auth: AuthContext, input: EmployeeInput, t?: Transaction, current?: Row) => {
  const [section, jobTitle, costCentre, currentSection] = await Promise.all([
    sectionInScope(auth, input.sectionId, t),
    input.jobTitleId ? models.JobTitle.findByPk(input.jobTitleId, { attributes: ['id', 'sectionId'], transaction: t }) : null,
    input.costCenterId ? models.CostCenter.findByPk(input.costCenterId, { attributes: ['id', 'departmentId'], transaction: t }) : null,
    current ? models.Section.findByPk(current.sectionId, { attributes: ['id', 'departmentId'], transaction: t }) : null,
  ]);
  if (input.jobTitleId && !jobTitle) throw fieldError('jobTitleId', 'This job title no longer exists');
  const unchanged = !!current && current.jobTitleId === input.jobTitleId && current.sectionId === input.sectionId;
  if (jobTitle && jobTitle.sectionId !== section.id && !unchanged) {
    throw fieldError('jobTitleId', 'Choose a job title from the selected section');
  }
  if (input.costCenterId && !costCentre) throw fieldError('costCenterId', 'This cost centre no longer exists');
  const keptCostCentre =
    !!current && current.costCenterId === input.costCenterId && currentSection?.departmentId === section.departmentId;
  if (costCentre?.departmentId && costCentre.departmentId !== section.departmentId && !keptCostCentre) {
    throw fieldError('costCenterId', "Choose a cost centre in the employee's department");
  }
  // Departments of the new and old section, so a transfer need not look them up again
  const departments: KnownDepartments = new Map([[section.id as string, (section.departmentId as string | null) ?? null]]);
  if (currentSection) departments.set(currentSection.id as string, (currentSection.departmentId as string | null) ?? null);
  return departments;
};

const duplicateWorksNumber = (worksNumber: string) =>
  conflict(`Works number ${worksNumber} is already used by another employee`, {
    fieldErrors: { worksNumber: ['This works number is already in use'] },
  });

const assertWorksNumberFree = async (worksNumber: string, exceptId: string | null, t?: Transaction) => {
  const existing = await models.Employee.findOne({ where: { worksNumber }, attributes: ['id'], transaction: t });
  if (existing && existing.id !== exceptId) throw duplicateWorksNumber(worksNumber);
};

// The v1 template interpolates values into HTML as-is, and reps choose both the names and the recipient
const escapeHtml = (v: string | null | undefined) =>
  v ? v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!) : undefined;

export const onboardingEmail = (employee: EmployeeDto) => ({
  firstName: escapeHtml(employee.firstName),
  lastName: escapeHtml(employee.lastName),
  email: employee.email,
  worksNumber: escapeHtml(employee.worksNumber),
  department: escapeHtml(employee.department?.name),
  section: escapeHtml(employee.section?.name),
  jobTitle: escapeHtml(employee.jobTitle?.name ?? employee.jobType),
});

export const sendOnboarding = (employee: EmployeeDto) => {
  if (!employee.email || config.env === 'test') return;
  Promise.resolve(sendEmployeeOnboardedEmail(onboardingEmail(employee))).catch((err: unknown) =>
    logger.warn({ err }, 'Employee onboarding email failed')
  );
};

/** Emails each new employee who has an address, for imports (v1 "send onboarding emails"). */
export const onboardEmployees = async (ids: string[]) => {
  const rows = await models.Employee.findAll({ where: { id: ids }, include: INCLUDE });
  // Only the employee's own details go into the email, so the role passed here does not matter
  for (const row of rows) sendOnboarding(toEmployee(row, { role: ROLES.ADMIN } as AuthContext));
};

export const createEmployee = async (auth: AuthContext, input: EmployeeInput) => {
  await checkReferences(auth, input);
  await assertWorksNumberFree(input.worksNumber, null);
  const row = await models.Employee.create({
    ...input,
    dateJoined: input.dateJoined ?? localToday(),
    isActive: true,
  });
  const created = toEmployee(await findInScope(auth, row.id), auth);
  sendOnboarding(created);
  return created;
};

export const updateEmployee = async (auth: AuthContext, id: string, { moveAccounts, ...input }: EmployeeUpdate) => {
  const transfer = await inTransaction(async (t) => {
    const row = await findInScope(auth, id, t);
    const departments = await checkReferences(auth, input, t, row);
    if (input.worksNumber !== row.worksNumber) await assertWorksNumberFree(input.worksNumber, id, t);
    const from = placementOf(row);
    // A picked job title replaces the legacy free-text one
    await row.update({ ...input, ...(input.jobTitleId ? { jobTitle: null } : {}) }, { transaction: t });
    // Only an admin manages user accounts
    return recordTransfer(t, id, from, placementOf(row), {
      actorId: auth.userId,
      moveAccounts: moveAccounts && auth.role === ROLES.ADMIN,
      departments,
    });
  });
  return { employee: toEmployee(await findInScope(auth, id), auth), transfer };
};

/** What moving the employee to another section or job title would change. */
export const previewTransfer = async (auth: AuthContext, id: string, q: TransferQuery) => {
  const [row, section] = await Promise.all([findInScope(auth, id), sectionInScope(auth, q.sectionId)]);
  const departments: KnownDepartments = new Map([
    [section.id as string, (section.departmentId as string | null) ?? null],
    [row.sectionId as string, (row.section?.departmentId as string | null) ?? null],
  ]);
  const to = { sectionId: q.sectionId, jobTitleId: q.jobTitleId, costCenterId: row.costCenterId ?? null };
  return transferPreview(auth, row, to, departments);
};

export const setEmployeeActive = async (auth: AuthContext, id: string, isActive: boolean) => {
  const changed = await inTransaction(async (t) => {
    const row = await findInScope(auth, id, t);
    if (!!row.isActive === isActive) return false;
    await row.update({ isActive }, { transaction: t });
    return true;
  });
  return { employee: toEmployee(await findInScope(auth, id), auth), changed };
};
