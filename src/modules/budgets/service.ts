import { Op, type Transaction, type WhereOptions } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { inTransaction, models, type Row } from '../../core/db';
import { AppError, conflict, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { logger } from '../../core/logger';
import { departmentScope, effectiveDepartment, seesWholeMine } from './policy';
import type {
  BudgetInput,
  BudgetListQuery,
  BudgetUpdate,
  CompanyInput,
  CompanyListQuery,
  CompanyUpdate,
} from './schemas';
import {
  money,
  percent,
  periodRange,
  prevDay,
  round2,
  spendByBudget,
  spendByDepartment,
  totalSpend,
  type Period,
} from './spend';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const emailHelper = require('../../../helpers/email_helper');

// The email template interpolates these raw, and reps can edit HOD employee names
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const periodLabel = (b: { fiscalYear: number; period: Period; quarter: number | null; month: number | null }) => {
  if (b.period === 'quarterly' && b.quarter) return `Q${b.quarter} ${b.fiscalYear}`;
  if (b.period === 'monthly' && b.month) return `${MONTHS[b.month - 1]} ${b.fiscalYear}`;
  if (b.period === 'half-year') return `Half-year ${b.fiscalYear}`;
  return `FY ${b.fiscalYear}`;
};

/* ------------------------------------------------------------------ company budgets */

const companyRange = (c: Row) =>
  periodRange({ fiscalYear: Number(c.fiscalYear), startDate: c.startDate ?? null, endDate: c.endDate ?? null });

/**
 * Department budgets drawn from a company budget: those linked to it plus unlinked budgets of
 * its fiscal year (v1 linked a budget only when the client sent companyBudgetId, so older rows
 * are often unlinked but still come out of that year's company budget).
 */
const drawnFrom = (c: Row): WhereOptions => ({
  [Op.or]: [{ companyBudgetId: c.id }, { companyBudgetId: null, fiscalYear: Number(c.fiscalYear) }],
});

const allocatedUnder = async (c: Row, transaction?: Transaction) =>
  money(await models.Budget.sum('allocatedAmount', { where: drawnFrom(c), transaction }));

const toCompany = (c: Row, allocated: number, spend: { spent: number; allocationCount: number }, departmentBudgetCount: number) => {
  const totalBudget = money(c.totalBudget);
  return {
    id: c.id as string,
    fiscalYear: Number(c.fiscalYear),
    totalBudget,
    suggestedBudget: money(c.suggestedBudget),
    bufferAmount: money(c.bufferAmount),
    allocatedToDepartments: allocated,
    unallocated: round2(totalBudget - allocated),
    spent: spend.spent,
    remaining: round2(totalBudget - spend.spent),
    utilisationPercent: percent(spend.spent, totalBudget),
    allocationCount: spend.allocationCount,
    departmentBudgetCount,
    status: c.status as 'draft' | 'active' | 'closed',
    startDate: (c.startDate as string | null) ?? null,
    endDate: (c.endDate as string | null) ?? null,
    notes: (c.notes as string | null) ?? null,
    createdAt: c.createdAt as Date,
    updatedAt: c.updatedAt as Date,
  };
};

export type CompanyBudgetDto = ReturnType<typeof toCompany>;

const companyDto = async (c: Row, transaction?: Transaction) => {
  const [allocated, spend, count] = await Promise.all([
    allocatedUnder(c, transaction),
    totalSpend(companyRange(c), transaction),
    models.Budget.count({ where: drawnFrom(c), transaction }),
  ]);
  return toCompany(c, allocated, spend, count);
};

export const listCompanyBudgets = async (q: CompanyListQuery) => {
  const where: WhereOptions = q.status ? { status: q.status } : {};
  const { rows, count } = await models.CompanyBudget.findAndCountAll({
    where,
    order: [[q.sort ?? 'fiscalYear', q.sort ? q.order.toUpperCase() : 'DESC']],
    ...pageWindow(q),
  });
  return { rows: await Promise.all(rows.map((r) => companyDto(r))), count };
};

export const getCompanyBudget = async (id: string) => {
  const row = await models.CompanyBudget.findByPk(id);
  if (!row) throw notFound('Company budget');
  return companyDto(row);
};

export const createCompanyBudget = (auth: AuthContext, input: CompanyInput) =>
  inTransaction(async (t) => {
    const existing = await models.CompanyBudget.findOne({ where: { fiscalYear: input.fiscalYear }, transaction: t });
    if (existing) throw conflict(`A company budget for FY ${input.fiscalYear} already exists. Edit it instead.`);
    const row = await models.CompanyBudget.create(
      {
        ...input,
        suggestedBudget: input.suggestedBudget ?? 0,
        bufferAmount: input.bufferAmount ?? 0,
        startDate: input.startDate ?? `${input.fiscalYear}-01-01`,
        endDate: input.endDate ?? `${input.fiscalYear}-12-31`,
        allocatedToDepartments: 0,
        totalSpent: 0,
        createdById: auth.userId,
      },
      { transaction: t }
    );
    // Department budgets allocated before the company budget existed now draw from it
    await models.Budget.update(
      { companyBudgetId: row.id },
      { where: { companyBudgetId: null, fiscalYear: input.fiscalYear }, transaction: t }
    );
    const allocated = await allocatedUnder(row, t);
    if (input.totalBudget < allocated) {
      throw conflict(
        `Departments already hold ${allocated.toFixed(2)} for FY ${input.fiscalYear}. Set a total of at least that, or reduce their allocations first.`
      );
    }
    await row.update({ allocatedToDepartments: allocated }, { transaction: t });
    return companyDto(row, t);
  });

const lockCompany = async (id: string, t: Transaction) => {
  const row = await models.CompanyBudget.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!row) throw notFound('Company budget');
  return row;
};

export const updateCompanyBudget = (id: string, input: CompanyUpdate) =>
  inTransaction(async (t) => {
    const row = await lockCompany(id, t);
    const allocated = await allocatedUnder(row, t);
    if (input.totalBudget !== undefined && input.totalBudget < allocated) {
      throw conflict(
        `Departments already hold ${allocated.toFixed(2)} of this budget. Reduce their allocations before lowering the total below that.`
      );
    }
    await row.update(
      Object.fromEntries(Object.entries({ ...input, allocatedToDepartments: allocated }).filter(([, v]) => v !== undefined)),
      { transaction: t }
    );
    return companyDto(row, t);
  });

export const deleteCompanyBudget = (id: string) =>
  inTransaction(async (t) => {
    const row = await lockCompany(id, t);
    const { spent } = await totalSpend(companyRange(row), t);
    if (spent > 0) {
      throw conflict('PPE has already been issued against this budget year. Close the budget instead of deleting it.');
    }
    await models.Budget.destroy({ where: drawnFrom(row), transaction: t });
    await row.destroy({ transaction: t });
  });

/* --------------------------------------------------------------- department budgets */

const BUDGET_INCLUDE = [
  { model: models.Department, as: 'department', attributes: ['id', 'name', 'code'] },
  { model: models.Section, as: 'section', attributes: ['id', 'name'], required: false },
];

const budgetRange = (b: Row) =>
  periodRange({
    fiscalYear: Number(b.fiscalYear),
    period: b.period,
    quarter: b.quarter,
    month: b.month,
    startDate: b.startDate ?? null,
    endDate: b.endDate ?? null,
  });

const toBudget = (b: Row, spend: { spent: number; allocationCount: number } | undefined) => {
  const allocatedAmount = money(b.allocatedAmount ?? b.totalBudget);
  const spent = spend?.spent ?? 0;
  const fiscalYear = Number(b.fiscalYear);
  const period = (b.period ?? 'annual') as Period;
  const quarter = (b.quarter as number | null) ?? null;
  const month = (b.month as number | null) ?? null;
  const range = budgetRange(b);
  return {
    id: b.id as string,
    fiscalYear,
    period,
    quarter,
    month,
    periodLabel: periodLabel({ fiscalYear, period, quarter, month }),
    startDate: range.start,
    endDate: prevDay(range.end),
    status: (b.status ?? 'active') as 'active' | 'expired' | 'draft',
    department: { id: b.department?.id as string, name: b.department?.name as string, code: (b.department?.code as string | null) ?? null },
    section: b.section ? { id: b.section.id as string, name: b.section.name as string } : null,
    companyBudgetId: (b.companyBudgetId as string | null) ?? null,
    allocatedAmount,
    suggestedAmount: money(b.suggestedAmount),
    spent,
    remaining: round2(allocatedAmount - spent),
    utilisationPercent: percent(spent, allocatedAmount),
    allocationCount: spend?.allocationCount ?? 0,
    notes: (b.notes as string | null) ?? null,
    createdAt: b.createdAt as Date,
    updatedAt: b.updatedAt as Date,
  };
};

export type BudgetDto = ReturnType<typeof toBudget>;

const withSpend = async (rows: Row[], transaction?: Transaction) => {
  const spend = await spendByBudget(
    rows.map((b) => ({ id: b.id, departmentId: b.departmentId, sectionId: b.sectionId ?? null, ...budgetRange(b) })),
    transaction
  );
  return rows.map((b) => toBudget(b, spend.get(b.id)));
};

const SORT: Record<NonNullable<BudgetListQuery['sort']>, unknown> = {
  fiscalYear: 'fiscalYear',
  allocatedAmount: 'allocatedAmount',
  createdAt: 'createdAt',
  department: [{ model: models.Department, as: 'department' }, 'name'],
};

export const listBudgets = async (auth: AuthContext, q: BudgetListQuery) => {
  const where: WhereOptions[] = [];
  const dept = effectiveDepartment(auth, q.departmentId);
  if (dept) where.push({ departmentId: dept });
  if (q.fiscalYear) where.push({ fiscalYear: q.fiscalYear });
  if (q.status) where.push({ status: q.status });
  if (q.period) where.push({ period: q.period });
  if (q.q) where.push({ '$department.name$': { [Op.iLike]: likeTerm(q.q) } });

  const dir = q.order.toUpperCase();
  const sortKey = q.sort ? SORT[q.sort] : null;
  const order = sortKey
    ? [Array.isArray(sortKey) ? [...sortKey, dir] : [sortKey, dir], ['id', 'ASC']]
    : [['fiscalYear', 'DESC'], [{ model: models.Department, as: 'department' }, 'name', 'ASC'], ['id', 'ASC']];

  const { rows, count } = await models.Budget.findAndCountAll({
    where: { [Op.and]: where },
    include: BUDGET_INCLUDE,
    order: order as never,
    distinct: true,
    ...pageWindow(q),
  });
  return { rows: await withSpend(rows), count };
};

const findScoped = async (auth: AuthContext, id: string, t?: Transaction) => {
  const dept = departmentScope(auth);
  const row = await models.Budget.findOne({
    where: dept ? { id, departmentId: dept } : { id },
    include: BUDGET_INCLUDE,
    transaction: t,
  });
  if (!row) throw notFound('Budget');
  return row;
};

export const getBudget = async (auth: AuthContext, id: string) => {
  const [dto] = await withSpend([await findScoped(auth, id)]);
  return dto!;
};

const insufficient = (available: number, fiscalYear: number) =>
  new AppError(
    'CONFLICT',
    `Only ${available.toFixed(2)} of the FY ${fiscalYear} company budget is unallocated. Lower the amount or raise the company budget.`,
    { available }
  );

const notifyHods = async (budget: BudgetDto) => {
  try {
    const hodRole = await models.Role.findOne({ where: { name: 'hod' } });
    if (!hodRole) return;
    const hods = await models.User.findAll({
      where: { roleId: hodRole.id, departmentId: budget.department.id, isActive: true },
      attributes: ['id', 'username'],
      include: [{ model: models.Employee, as: 'employee', attributes: ['firstName', 'lastName', 'email'] }],
    });
    for (const u of hods) {
      const email = u.employee?.email;
      if (!email) continue;
      await emailHelper.sendBudgetAllocatedEmail(
        { fiscalYear: budget.fiscalYear, allocatedAmount: budget.allocatedAmount, startDate: budget.startDate },
        { name: escapeHtml(budget.department.name) },
        {
          firstName: escapeHtml(u.employee?.firstName ?? u.username),
          lastName: escapeHtml(u.employee?.lastName ?? ''),
          email,
        }
      );
    }
  } catch (err) {
    logger.warn({ err }, 'Budget allocation email failed');
  }
};

export const createBudget = async (input: BudgetInput) => {
  const dto = await inTransaction(async (t) => {
    // Serialises budget writes per department so two admins cannot create the same period twice
    const department = await models.Department.findByPk(input.departmentId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!department) throw new AppError('VALIDATION_FAILED', 'Some fields are invalid', { fieldErrors: { departmentId: ['Choose a department'] } });
    if (input.sectionId) {
      const section = await models.Section.findOne({ where: { id: input.sectionId, departmentId: input.departmentId }, transaction: t });
      if (!section) {
        throw new AppError('VALIDATION_FAILED', 'Some fields are invalid', {
          fieldErrors: { sectionId: ['Choose a section in this department'] },
        });
      }
    }

    const duplicate = await models.Budget.findOne({
      where: {
        departmentId: input.departmentId,
        sectionId: input.sectionId,
        fiscalYear: input.fiscalYear,
        period: input.period,
        quarter: input.quarter,
        month: input.month,
      },
      transaction: t,
    });
    if (duplicate) throw conflict('A budget already exists for this department and period. Edit it instead.');

    const company = await models.CompanyBudget.findOne({
      where: { fiscalYear: input.fiscalYear },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    let allocated = 0;
    if (company) {
      if (company.status === 'closed') throw conflict(`The FY ${input.fiscalYear} company budget is closed.`);
      allocated = await allocatedUnder(company, t);
      const available = round2(money(company.totalBudget) - allocated);
      if (input.allocatedAmount > available) throw insufficient(available, input.fiscalYear);
    }

    const range = periodRange(input);
    const suggested = input.suggestedAmount ?? 0;
    const row = await models.Budget.create(
      {
        companyBudgetId: company?.id ?? null,
        departmentId: input.departmentId,
        sectionId: input.sectionId,
        fiscalYear: input.fiscalYear,
        period: input.period,
        quarter: input.quarter,
        month: input.month,
        startDate: range.start,
        endDate: prevDay(range.end),
        allocatedAmount: input.allocatedAmount,
        suggestedAmount: suggested,
        additionalAmount: round2(Math.max(0, input.allocatedAmount - suggested)),
        totalSpent: 0,
        status: input.status,
        notes: input.notes,
      },
      { transaction: t }
    );
    if (company) await company.update({ allocatedToDepartments: round2(allocated + input.allocatedAmount) }, { transaction: t });

    const created = await models.Budget.findByPk(row.id, { include: BUDGET_INCLUDE, transaction: t });
    const [out] = await withSpend([created!], t);
    return out!;
  });
  void notifyHods(dto);
  return dto;
};

/**
 * Locks the company budget a department budget draws from, then the budget itself. Company
 * first, in the same order as the company budget writes, so concurrent writes cannot deadlock.
 */
const lockForWrite = async (id: string, t: Transaction) => {
  const current = await models.Budget.findByPk(id, { attributes: ['id', 'companyBudgetId', 'fiscalYear'], transaction: t });
  if (!current) throw notFound('Budget');
  const company = current.companyBudgetId
    ? await models.CompanyBudget.findByPk(current.companyBudgetId, { transaction: t, lock: t.LOCK.UPDATE })
    : await models.CompanyBudget.findOne({ where: { fiscalYear: current.fiscalYear }, transaction: t, lock: t.LOCK.UPDATE });
  const budget = await models.Budget.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!budget) throw notFound('Budget');
  return { budget, company };
};

export const updateBudget = (auth: AuthContext, id: string, input: BudgetUpdate) =>
  inTransaction(async (t) => {
    const { budget: locked, company } = await lockForWrite(id, t);

    const patch: Record<string, unknown> = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (company && !locked.companyBudgetId) patch.companyBudgetId = company.id;

    if (input.allocatedAmount !== undefined) {
      const oldAmount = money(locked.allocatedAmount);
      if (company) {
        const allocated = await allocatedUnder(company, t);
        const available = round2(money(company.totalBudget) - allocated + oldAmount);
        if (input.allocatedAmount > oldAmount) {
          if (company.status === 'closed') throw conflict(`The FY ${company.fiscalYear} company budget is closed.`);
          if (input.allocatedAmount > available) throw insufficient(round2(available - oldAmount), Number(company.fiscalYear));
        }
        await company.update({ allocatedToDepartments: round2(allocated - oldAmount + input.allocatedAmount) }, { transaction: t });
      }
      patch.allocatedAmount = input.allocatedAmount;
      patch.additionalAmount = round2(Math.max(0, input.allocatedAmount - money(locked.suggestedAmount)));
    }

    await locked.update(patch, { transaction: t });
    const [out] = await withSpend([await findScoped(auth, id, t)], t);
    return out!;
  });

export const deleteBudget = (id: string) =>
  inTransaction(async (t) => {
    const { budget, company } = await lockForWrite(id, t);
    await budget.destroy({ transaction: t });
    if (company) await company.update({ allocatedToDepartments: await allocatedUnder(company, t) }, { transaction: t });
  });

/* ------------------------------------------------------------------------- summary */

/**
 * Budget position for a fiscal year: the company budget (whole-mine roles only) and, per
 * department in scope, what was allocated and what has been spent.
 */
export const budgetSummary = async (auth: AuthContext, fiscalYear: number) => {
  const dept = departmentScope(auth);
  const company = seesWholeMine(auth) ? await models.CompanyBudget.findOne({ where: { fiscalYear } }) : null;
  const range = company ? companyRange(company) : periodRange({ fiscalYear });

  const budgets = await models.Budget.findAll({
    where: dept ? { fiscalYear, departmentId: dept } : { fiscalYear },
    attributes: ['departmentId', 'allocatedAmount'],
    include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
  });
  const spend = await spendByDepartment(range, dept);

  const byDept = new Map<string, { departmentId: string; departmentName: string; allocated: number; spent: number; allocationCount: number; budgetCount: number }>();
  for (const b of budgets) {
    const cur = byDept.get(b.departmentId) ?? {
      departmentId: b.departmentId as string,
      departmentName: b.department?.name as string,
      allocated: 0,
      spent: 0,
      allocationCount: 0,
      budgetCount: 0,
    };
    cur.allocated = round2(cur.allocated + money(b.allocatedAmount));
    cur.budgetCount += 1;
    byDept.set(b.departmentId, cur);
  }
  const unbudgetedIds = [...spend.keys()].filter((id) => !byDept.has(id));
  if (unbudgetedIds.length) {
    const names = await models.Department.findAll({ where: { id: unbudgetedIds }, attributes: ['id', 'name'] });
    for (const d of names) byDept.set(d.id, { departmentId: d.id, departmentName: d.name, allocated: 0, spent: 0, allocationCount: 0, budgetCount: 0 });
  }
  for (const [id, s] of spend) {
    const cur = byDept.get(id);
    if (cur) Object.assign(cur, s);
  }

  const departments = [...byDept.values()]
    .map((d) => ({ ...d, remaining: round2(d.allocated - d.spent), utilisationPercent: percent(d.spent, d.allocated) }))
    .sort((a, b) => b.allocated - a.allocated || a.departmentName.localeCompare(b.departmentName));

  const allocated = round2(departments.reduce((s, d) => s + d.allocated, 0));
  const spent = round2(departments.reduce((s, d) => s + d.spent, 0));
  return {
    fiscalYear,
    company: company ? await companyDto(company) : null,
    totals: {
      allocated,
      spent,
      remaining: round2(allocated - spent),
      utilisationPercent: percent(spent, allocated),
      allocationCount: departments.reduce((s, d) => s + d.allocationCount, 0),
      departmentCount: departments.length,
    },
    departments,
  };
};
