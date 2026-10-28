import { Op, col, fn, type Transaction, type WhereOptions } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { inTransaction, models, type Row } from '../../core/db';
import { AppError, conflict, fieldError, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { allowedActions, canDo, employeeScope, scopedEmployee, sectionInclude, type FailureAction } from './policy';
import type { FailureInput, FailureListQuery, FailureStatus, ReplaceInput, ResolveInput, ReviewInput } from './schemas';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { deductStock } = require('../../../helpers/stock_helper') as {
  deductStock: (stockId: string, quantity: number, opts: { transaction: Transaction }) => Promise<number | null>;
};

const REJECTED = 'Rejected by SHEQ';
export const OPEN_STATUSES: FailureStatus[] = ['pending-sheq-review', 'sheq-approved', 'stores-processing'];
const CLOSED_ALLOCATION = new Set(['replaced', 'returned']);

/** The short reference v1 writes into allocation notes, e.g. "Failure Report #1a2b3c4d". */
const reference = (id: string) => id.substring(0, 8);
const referenceTag = (id: string) => `Failure Report #${reference(id)}`;

const invalidTransition = (message: string) => new AppError('INVALID_TRANSITION', message);

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : null);

const toEmployee = (e: Row | null | undefined) =>
  e
    ? {
        id: e.id as string,
        name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
        worksNumber: e.worksNumber as string,
        section: e.section ? { id: e.section.id as string, name: e.section.name as string } : null,
        department: e.section?.department
          ? { id: e.section.department.id as string, name: e.section.department.name as string }
          : null,
      }
    : null;

const sheqOutcome = (row: Row) => {
  if (!row.reviewedBySHEQ) return null;
  return row.status === 'resolved' && typeof row.actionTaken === 'string' && row.actionTaken.startsWith(REJECTED)
    ? ('rejected' as const)
    : ('approved' as const);
};

export const toFailureSummary = (row: Row, auth: AuthContext) => ({
  id: row.id as string,
  reference: reference(row.id).toUpperCase(),
  status: row.status as FailureStatus,
  severity: row.severity as string,
  failureType: row.failureType as string,
  description: row.description as string,
  reportedDate: iso(row.reportedDate),
  failureDate: iso(row.failureDate),
  employee: toEmployee(row.employee),
  ppeItem: row.ppeItem
    ? { id: row.ppeItem.id as string, name: row.ppeItem.name as string, itemCode: (row.ppeItem.itemCode as string | null) ?? null }
    : null,
  sheqDecision: sheqOutcome(row),
  allowedActions: allowedActions(auth, row.status),
  createdAt: iso(row.createdAt),
});

export type FailureSummaryDto = ReturnType<typeof toFailureSummary>;

const PPE_ITEM = { model: models.PPEItem, as: 'ppeItem', attributes: ['id', 'name', 'itemCode', 'category'] };

const SORT_DEFAULT: [string, string] = ['reportedDate', 'DESC'];

export const listFailures = async (auth: AuthContext, q: FailureListQuery) => {
  const where: WhereOptions[] = [];
  if (q.status) where.push({ status: q.status });
  if (q.severity) where.push({ severity: q.severity });
  if (q.failureType) where.push({ failureType: q.failureType });
  if (q.employeeId) where.push({ employeeId: q.employeeId });
  if (q.ppeItemId) where.push({ ppeItemId: q.ppeItemId });
  if (q.from) where.push({ reportedDate: { [Op.gte]: new Date(`${q.from}T00:00:00`) } });
  if (q.to) where.push({ reportedDate: { [Op.lte]: new Date(`${q.to}T23:59:59.999`) } });
  if (q.observedAt) where.push({ observedAt: { [Op.iLike]: likeTerm(q.observedAt) } });
  if (q.brand) where.push({ brand: { [Op.iLike]: likeTerm(q.brand) } });
  if (q.q) {
    const term = likeTerm(q.q);
    where.push({
      [Op.or]: [
        { description: { [Op.iLike]: term } },
        { '$employee.firstName$': { [Op.iLike]: term } },
        { '$employee.lastName$': { [Op.iLike]: term } },
        { '$employee.worksNumber$': { [Op.iLike]: term } },
        { '$ppeItem.name$': { [Op.iLike]: term } },
      ],
    });
  }

  const { rows, count } = await models.FailureReport.findAndCountAll({
    where: { [Op.and]: where },
    include: [scopedEmployee(auth, { departmentId: q.departmentId, sectionId: q.sectionId }), PPE_ITEM],
    order: [q.sort ? [q.sort, q.order.toUpperCase()] : SORT_DEFAULT, ['id', 'ASC']],
    distinct: true,
    col: 'id',
    ...pageWindow(q),
  });
  return { rows: rows.map((r) => toFailureSummary(r, auth)), count };
};

/** Counts per status within the user's scope, for the list header. */
export const failureStats = async (auth: AuthContext) => {
  const rows = await models.FailureReport.findAll({
    attributes: ['status', [fn('COUNT', col('FailureReport.id')), 'count']],
    include: [scopedEmployee(auth, undefined, true)],
    group: ['FailureReport.status'],
    raw: true,
  });
  const counts: Record<string, number> = {};
  for (const r of rows as unknown as Array<{ status: string; count: string }>) counts[r.status] = Number(r.count);
  return counts;
};

const findScoped = (auth: AuthContext, id: string, t?: Transaction) =>
  models.FailureReport.findOne({
    where: { id },
    include: [scopedEmployee(auth), PPE_ITEM],
    transaction: t,
    lock: t ? { level: t.LOCK.UPDATE, of: models.FailureReport } : undefined,
  });

const loadScoped = async (auth: AuthContext, id: string, t?: Transaction) => {
  const row = await findScoped(auth, id, t);
  if (!row) throw notFound('Failure report');
  return row;
};

export const getFailure = async (auth: AuthContext, id: string) => {
  const row = await loadScoped(auth, id);
  const [allocation, stock, replacementStock, replacementAllocation] = await Promise.all([
    row.allocationId
      ? models.Allocation.findByPk(row.allocationId, { attributes: ['id', 'issueDate', 'size', 'quantity', 'status'] })
      : null,
    row.stockId ? models.Stock.findByPk(row.stockId, { attributes: ['id', 'size', 'batchNumber', 'location'] }) : null,
    row.replacementStockId
      ? models.Stock.findByPk(row.replacementStockId, { attributes: ['id', 'size', 'batchNumber', 'location'] })
      : null,
    row.status === 'replaced'
      ? models.Allocation.findOne({
          where: {
            employeeId: row.employeeId,
            ppeItemId: row.ppeItemId,
            allocationType: 'replacement',
            notes: { [Op.like]: `%${referenceTag(row.id)}%` },
          },
          attributes: ['id', 'issueDate', 'size', 'quantity', 'status'],
          order: [['createdAt', 'DESC']],
        })
      : null,
  ]);

  const toAllocation = (a: Row | null) =>
    a ? { id: a.id as string, issueDate: iso(a.issueDate), size: (a.size as string | null) ?? null, quantity: a.quantity as number, status: a.status as string } : null;
  const toStock = (s: Row | null) =>
    s
      ? { id: s.id as string, size: (s.size as string | null) ?? null, batchNumber: (s.batchNumber as string | null) ?? null, location: (s.location as string | null) ?? null }
      : null;

  return {
    ...toFailureSummary(row, auth),
    observedAt: (row.observedAt as string | null) ?? null,
    brand: (row.brand as string | null) ?? null,
    remarks: (row.remarks as string | null) ?? null,
    ppeItem: row.ppeItem
      ? {
          id: row.ppeItem.id as string,
          name: row.ppeItem.name as string,
          itemCode: (row.ppeItem.itemCode as string | null) ?? null,
          category: (row.ppeItem.category as string | null) ?? null,
        }
      : null,
    sheqComment: (row.sheqDecision as string | null) ?? null,
    sheqReviewDate: iso(row.sheqReviewDate),
    actionTaken: (row.actionTaken as string | null) ?? null,
    allocation: toAllocation(allocation),
    stock: toStock(stock),
    replacementStock: toStock(replacementStock),
    replacementAllocation: toAllocation(replacementAllocation),
    updatedAt: iso(row.updatedAt),
  };
};

export type FailureDto = Awaited<ReturnType<typeof getFailure>>;

const findScopedEmployee = (auth: AuthContext, id: string, t?: Transaction) => {
  const scope = employeeScope(auth);
  return models.Employee.findOne({
    where: { [Op.and]: [{ id }, scope.employee] },
    include: [sectionInclude(scope.section)],
    transaction: t,
  });
};

export const createFailure = async (auth: AuthContext, input: FailureInput) =>
  inTransaction(async (t) => {
    const employee = await findScopedEmployee(auth, input.employeeId, t);
    if (!employee) throw notFound('Employee');

    const ppeItem = await models.PPEItem.findByPk(input.ppeItemId, { attributes: ['id'], transaction: t });
    if (!ppeItem) throw fieldError('ppeItemId', 'Choose a PPE item from the list');

    let stockId: string | null = null;
    if (input.allocationId) {
      const allocation = await models.Allocation.findByPk(input.allocationId, {
        transaction: t,
        lock: { level: t.LOCK.UPDATE, of: models.Allocation },
      });
      if (!allocation || allocation.employeeId !== employee.id) {
        throw fieldError('allocationId', 'This issue record does not belong to the employee');
      }
      if (allocation.ppeItemId !== input.ppeItemId) {
        throw fieldError('allocationId', 'This issue record is for a different PPE item');
      }
      if (CLOSED_ALLOCATION.has(allocation.status)) {
        throw fieldError('allocationId', `This issue record is already ${allocation.status}, so it cannot be reported again`);
      }
      const open = await models.FailureReport.findOne({
        where: { allocationId: allocation.id, status: { [Op.in]: OPEN_STATUSES } },
        attributes: ['id'],
        transaction: t,
      });
      if (open) {
        throw conflict(`This issue is already reported in failure report #${reference(open.id).toUpperCase()}`, {
          failureReportId: open.id,
        });
      }
      stockId = allocation.stockId ?? null;
    }

    const row = await models.FailureReport.create(
      {
        employeeId: employee.id,
        ppeItemId: input.ppeItemId,
        allocationId: input.allocationId,
        stockId,
        description: input.description,
        failureType: input.failureType,
        severity: input.severity,
        failureDate: input.failureDate ? new Date(`${input.failureDate}T12:00:00`) : new Date(),
        observedAt: input.observedAt,
        brand: input.brand,
        remarks: input.remarks,
        reportedDate: new Date(),
        status: 'pending-sheq-review',
      },
      { transaction: t }
    );
    return row.id as string;
  }).then((id) => getFailure(auth, id));

/** Locks the report, checks the action is allowed from its current status and applies `fn`. */
const transition = async <T>(
  auth: AuthContext,
  id: string,
  action: FailureAction,
  apply: (row: Row, t: Transaction) => Promise<T>
) => {
  const result = await inTransaction(async (t) => {
    const row = await loadScoped(auth, id, t);
    if (!canDo(auth, action, row.status)) throw invalidTransition(TRANSITION_MESSAGES[action](row.status));
    return apply(row, t);
  });
  return { result, report: await getFailure(auth, id) };
};

const STATUS_LABEL: Record<FailureStatus, string> = {
  'pending-sheq-review': 'waiting for SHEQ review',
  'sheq-approved': 'approved by SHEQ',
  'stores-processing': 'being processed by stores',
  resolved: 'already resolved',
  replaced: 'already replaced',
};

const TRANSITION_MESSAGES: Record<FailureAction, (s: FailureStatus) => string> = {
  review: (s) => `This report is ${STATUS_LABEL[s]}, so it cannot be reviewed`,
  process: (s) => `This report is ${STATUS_LABEL[s]}, so processing cannot start`,
  replace: (s) =>
    s === 'pending-sheq-review'
      ? 'SHEQ must approve this report before a replacement can be issued'
      : `This report is ${STATUS_LABEL[s]}, so a replacement cannot be issued`,
  resolve: (s) => `This report is ${STATUS_LABEL[s]}, so it cannot be closed`,
};

export const reviewFailure = (auth: AuthContext, id: string, input: ReviewInput) =>
  transition(auth, id, 'review', async (row, t) => {
    const approved = input.decision === 'approve';
    await row.update(
      {
        status: approved ? 'sheq-approved' : 'resolved',
        reviewedBySHEQ: true,
        sheqDecision: input.comment,
        sheqReviewDate: new Date(),
        actionTaken: approved ? input.actionTaken : input.actionTaken ? `${REJECTED}: ${input.actionTaken}` : REJECTED,
      },
      { transaction: t }
    );
  }).then(({ report }) => report);

export const startProcessing = (auth: AuthContext, id: string) =>
  transition(auth, id, 'process', (row, t) => row.update({ status: 'stores-processing' }, { transaction: t })).then(
    ({ report }) => report
  );

export const resolveFailure = (auth: AuthContext, id: string, input: ResolveInput) =>
  transition(auth, id, 'resolve', (row, t) =>
    row.update({ status: 'resolved', actionTaken: input.actionTaken }, { transaction: t })
  ).then(({ report }) => report);

const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Issues a replacement from stock (v1 /reallocate): deducts stock, creates a replacement
 * allocation, marks the original allocation replaced and the report replaced.
 */
export const replaceFailure = (auth: AuthContext, id: string, input: ReplaceInput) =>
  transition(auth, id, 'replace', async (row, t) => {
    const stock = await models.Stock.findByPk(input.stockId, {
      include: [{ model: models.PPEItem, as: 'ppeItem', attributes: ['id', 'replacementFrequency'] }],
      transaction: t,
    });
    if (!stock) throw fieldError('stockId', 'Choose stock from the list');
    if (stock.ppeItemId !== row.ppeItemId) throw fieldError('stockId', 'This stock is for a different PPE item');

    const remaining = await deductStock(stock.id, input.quantity, { transaction: t });
    if (remaining === null) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        `Not enough stock. Available: ${stock.quantity}, requested: ${input.quantity}`,
        { available: stock.quantity, requested: input.quantity }
      );
    }

    const now = new Date();
    // Allocation costs are USD everywhere (budgets, dashboard); stock.unitCost is local currency.
    const unitCost = stock.unitPriceUSD === null || stock.unitPriceUSD === undefined ? null : Number(stock.unitPriceUSD);
    const replacementFrequency = Number(stock.ppeItem?.replacementFrequency) || 12;
    const tag = referenceTag(row.id);

    const allocation = await models.Allocation.create(
      {
        employeeId: row.employeeId,
        ppeItemId: row.ppeItemId,
        stockId: stock.id,
        issuedById: auth.userId,
        quantity: input.quantity,
        size: stock.size || input.size || null,
        unitCost,
        totalCost: unitCost === null ? null : Math.round(unitCost * input.quantity * 100) / 100,
        issueDate: now,
        nextRenewalDate: addMonths(now, replacementFrequency),
        allocationType: 'replacement',
        status: 'active',
        replacementFrequency,
        notes: `Replacement due to ${row.failureType} - ${tag}${input.notes ? `. ${input.notes}` : ''}`,
      },
      { transaction: t }
    );

    if (row.allocationId) {
      const old = await models.Allocation.findByPk(row.allocationId, {
        transaction: t,
        lock: { level: t.LOCK.UPDATE, of: models.Allocation },
      });
      if (old && old.status !== 'replaced') {
        await old.update(
          {
            status: 'replaced',
            notes: `${old.notes ? `${old.notes}\n` : ''}Replaced on ${now.toISOString().slice(0, 10)} due to ${row.failureType} (${tag})`,
          },
          { transaction: t }
        );
      }
    }

    await row.update(
      {
        status: 'replaced',
        replacementStockId: stock.id,
        actionTaken: `Reallocated ${input.quantity} unit(s) from stock. New allocation created with ID: ${reference(allocation.id)}`,
      },
      { transaction: t }
    );

    return { allocationId: allocation.id as string, stockRemaining: remaining };
  }).then(({ result, report }) => ({ report, ...result }));

/* ---------- lookups for the create and replace forms ---------- */

export const employeeOptions = async (auth: AuthContext, q?: string) => {
  const scope = employeeScope(auth);
  const where: WhereOptions[] = [scope.employee, { isActive: true }];
  if (q) {
    const term = likeTerm(q);
    where.push({
      [Op.or]: [{ firstName: { [Op.iLike]: term } }, { lastName: { [Op.iLike]: term } }, { worksNumber: { [Op.iLike]: term } }],
    });
  }
  const rows = await models.Employee.findAll({
    where: { [Op.and]: where },
    include: [sectionInclude(scope.section)],
    attributes: ['id', 'firstName', 'lastName', 'worksNumber', 'sectionId'],
    order: [['firstName', 'ASC'], ['lastName', 'ASC']],
    limit: 25,
  });
  return rows.map((r) => {
    const e = toEmployee(r)!;
    return { id: e.id, name: `${e.name} (${e.worksNumber})`, section: e.section?.name ?? null };
  });
};

export const ppeItemOptions = async (q?: string) => {
  const where: WhereOptions[] = [{ isActive: true }];
  if (q) {
    const term = likeTerm(q);
    where.push({ [Op.or]: [{ name: { [Op.iLike]: term } }, { itemCode: { [Op.iLike]: term } }] });
  }
  const rows = await models.PPEItem.findAll({
    where: { [Op.and]: where },
    attributes: ['id', 'name', 'itemCode'],
    order: [['name', 'ASC']],
    limit: 25,
  });
  return rows.map((r) => ({ id: r.id as string, name: r.itemCode ? `${r.name} (${r.itemCode})` : (r.name as string) }));
};

/** The employee's PPE issues, so a report can point at the item that failed. */
export const allocationOptions = async (auth: AuthContext, employeeId: string) => {
  const employee = await findScopedEmployee(auth, employeeId);
  if (!employee) throw notFound('Employee');
  const rows = await models.Allocation.findAll({
    where: { employeeId, status: 'active' },
    include: [{ model: models.PPEItem, as: 'ppeItem', attributes: ['id', 'name'] }],
    attributes: ['id', 'issueDate', 'size', 'quantity', 'ppeItemId'],
    order: [['issueDate', 'DESC']],
    limit: 50,
  });
  return rows.map((r) => ({
    id: r.id as string,
    name: `${r.ppeItem?.name ?? 'PPE item'}${r.size ? `, size ${r.size}` : ''} (issued ${iso(r.issueDate)?.slice(0, 10)})`,
    ppeItemId: r.ppeItemId as string,
  }));
};

/** In-stock rows of the report's PPE item that a replacement can be issued from. */
export const stockOptions = async (auth: AuthContext, id: string) => {
  const report = await loadScoped(auth, id);
  const rows = await models.Stock.findAll({
    where: { ppeItemId: report.ppeItemId, quantity: { [Op.gt]: 0 } },
    attributes: ['id', 'size', 'quantity', 'location', 'batchNumber'],
    order: [['size', 'ASC'], ['quantity', 'DESC']],
    limit: 100,
  });
  return rows.map((s) => {
    const parts = [s.size ? `Size ${s.size}` : 'No size', s.location, s.batchNumber ? `batch ${s.batchNumber}` : null].filter(Boolean);
    return {
      id: s.id as string,
      name: `${parts.join(', ')} (${s.quantity} in stock)`,
      size: (s.size as string | null) ?? null,
      quantity: s.quantity as number,
    };
  });
};
