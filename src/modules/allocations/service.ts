import { Op, QueryTypes, col, fn, literal, where as sqlWhere, type Includeable, type Order, type OrderItem, type Transaction, type WhereOptions } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { inTransaction, models, sequelize, type Row } from '../../core/db';
import { AppError, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { allowedActions, scopeOf, type Scope } from './policy';
import {
  RESTOCK_CONDITIONS,
  type AllocationListQuery,
  type RenewInput,
  type RenewalsQuery,
  type ReturnInput,
  type employeeHistoryQuery,
} from './schemas';
import type { z } from 'zod';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { deductStock, restoreStock } = require('../../../helpers/stock_helper') as {
  deductStock: (id: string, qty: number, opts: { transaction: Transaction }) => Promise<number | null>;
  restoreStock: (id: string, qty: number, opts: { transaction: Transaction }) => Promise<number | null>;
};

const DAY_MS = 86_400_000;
import { DEFAULT_FREQUENCY_MONTHS, awaitingRenewal, dueSql, newerHolding } from './rules';

const DUE = literal(dueSql('"Allocation"', '"ppeItem"'));

const frequencyOf = (item: Row | null | undefined, allocation?: Row) =>
  Number(item?.replacementFrequency) || Number(allocation?.replacementFrequency) || DEFAULT_FREQUENCY_MONTHS;

const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const daysUntil = (date: Date | null) => (date ? Math.ceil((date.getTime() - Date.now()) / DAY_MS) : null);

const money = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/* ---------- query building ---------- */

interface Narrowing {
  departmentId?: string;
  sectionId?: string;
  employeeId?: string;
}

/** Employee -> section -> department joins carrying the role scope plus optional narrowing filters. */
const employeeInclude = (scope: Scope, narrow: Narrowing = {}): Includeable => {
  const employeeWhere: WhereOptions[] = [];
  const sectionWhere: WhereOptions[] = [];
  if (scope.kind === 'section') employeeWhere.push({ sectionId: scope.id });
  if (scope.kind === 'department') sectionWhere.push({ departmentId: scope.id });
  if (narrow.sectionId) employeeWhere.push({ sectionId: narrow.sectionId });
  if (narrow.employeeId) employeeWhere.push({ id: narrow.employeeId });
  if (narrow.departmentId) sectionWhere.push({ departmentId: narrow.departmentId });

  return {
    model: models.Employee,
    as: 'employee',
    required: true,
    attributes: ['id', 'worksNumber', 'firstName', 'lastName', 'isActive', 'sectionId'],
    where: employeeWhere.length ? { [Op.and]: employeeWhere } : undefined,
    include: [
      {
        model: models.Section,
        as: 'section',
        required: true,
        attributes: ['id', 'name', 'departmentId'],
        where: sectionWhere.length ? { [Op.and]: sectionWhere } : undefined,
        include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
      },
    ],
  };
};

const itemInclude: Includeable = {
  model: models.PPEItem,
  as: 'ppeItem',
  required: true,
  attributes: ['id', 'name', 'itemCode', 'category', 'replacementFrequency', 'hasSizeVariants'],
};

const issuedByInclude: Includeable = {
  model: models.User,
  as: 'issuedBy',
  required: false,
  attributes: ['id', 'username'],
  include: [{ model: models.Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] }],
};

const includes = (scope: Scope, narrow?: Narrowing): Includeable[] => [employeeInclude(scope, narrow), itemInclude, issuedByInclude];

/* ---------- DTOs ---------- */

const personName = (e: Row | null | undefined) => (e ? `${e.firstName} ${e.lastName}`.trim() : null);

const toEmployeeRef = (e: Row) => ({
  id: e.id as string,
  worksNumber: e.worksNumber as string,
  name: personName(e) as string,
  isActive: e.isActive !== false,
  section: e.section ? { id: e.section.id as string, name: e.section.name as string } : null,
  department: e.section?.department
    ? { id: e.section.department.id as string, name: e.section.department.name as string }
    : null,
});

export type EmployeeRef = ReturnType<typeof toEmployeeRef>;

const toAllocation = (auth: AuthContext) => (row: Row) => {
  const raw = row.get('dueDate') as Date | string | null | undefined;
  const dueDate = raw ? new Date(raw) : null;
  const status = row.status as string;
  return {
    id: row.id as string,
    status,
    allocationType: (row.allocationType as string | null) ?? null,
    quantity: Number(row.quantity),
    size: (row.size as string | null) ?? null,
    unitCost: money(row.unitCost),
    totalCost: money(row.totalCost),
    issueDate: row.issueDate as Date,
    dueDate,
    daysUntilDue: status === 'active' || status === 'expired' ? daysUntil(dueDate) : null,
    notes: (row.notes as string | null) ?? null,
    employee: toEmployeeRef(row.employee),
    item: {
      id: row.ppeItem.id as string,
      name: row.ppeItem.name as string,
      itemCode: (row.ppeItem.itemCode as string | null) ?? null,
      category: (row.ppeItem.category as string | null) ?? null,
    },
    issuedBy: row.issuedBy
      ? { id: row.issuedBy.id as string, name: personName(row.issuedBy.employee) ?? (row.issuedBy.username as string) }
      : null,
    updatedAt: row.updatedAt as Date,
    allowedActions: allowedActions(auth, status),
  };
};

export type AllocationDto = ReturnType<ReturnType<typeof toAllocation>>;

/* ---------- reads ---------- */

const ORDER: Record<string, (dir: 'ASC' | 'DESC') => OrderItem[]> = {
  issueDate: (d) => [['issueDate', d]],
  dueDate: (d) => [[DUE, d]],
  status: (d) => [['status', d], ['issueDate', 'DESC']],
  quantity: (d) => [['quantity', d]],
  employee: (d) => [
    [{ model: models.Employee, as: 'employee' }, 'lastName', d],
    [{ model: models.Employee, as: 'employee' }, 'firstName', d],
  ],
  item: (d) => [[{ model: models.PPEItem, as: 'ppeItem' }, 'name', d]],
};

const startOfDay = (iso: string) => new Date(`${iso}T00:00:00`);

const searchWhere = (q: string): WhereOptions => {
  const term = { [Op.iLike]: likeTerm(q) };
  return {
    [Op.or]: [
      sqlWhere(col('employee.worksNumber'), term),
      sqlWhere(fn('concat', col('employee.firstName'), ' ', col('employee.lastName')), term),
      sqlWhere(col('ppeItem.name'), term),
      sqlWhere(col('ppeItem.item_code'), term),
    ],
  };
};

type ListParams = Pick<AllocationListQuery, 'page' | 'pageSize' | 'sort' | 'order' | 'q' | 'status' | 'ppeItemId' | 'from' | 'to'> &
  Narrowing;

const findPage = async (auth: AuthContext, q: ListParams) => {
  const where: WhereOptions[] = [];
  if (q.status) where.push({ status: q.status });
  if (q.ppeItemId) where.push({ ppeItemId: q.ppeItemId });
  if (q.from) where.push({ issueDate: { [Op.gte]: startOfDay(q.from) } });
  if (q.to) where.push({ issueDate: { [Op.lt]: new Date(startOfDay(q.to).getTime() + DAY_MS) } });
  if (q.q) where.push(searchWhere(q.q));

  const dir = q.order === 'asc' ? 'ASC' : 'DESC';
  const order = [...(q.sort ? ORDER[q.sort]!(dir) : ORDER.issueDate!('DESC')), ['id', 'ASC']] as Order;

  const { rows, count } = await models.Allocation.findAndCountAll({
    where: where.length ? { [Op.and]: where } : undefined,
    attributes: { include: [[DUE, 'dueDate']] },
    include: includes(scopeOf(auth), q),
    order,
    ...pageWindow(q),
  });
  return { rows: rows.map(toAllocation(auth)), count };
};

export const listAllocations = (auth: AuthContext, q: AllocationListQuery) => findPage(auth, q);

export const getAllocation = async (auth: AuthContext, id: string, transaction?: Transaction) => {
  const row = await models.Allocation.findOne({
    where: { id },
    attributes: { include: [[DUE, 'dueDate']] },
    include: includes(scopeOf(auth)),
    transaction,
  });
  if (!row) throw notFound('Allocation');
  return toAllocation(auth)(row);
};

const findScopedEmployee = async (auth: AuthContext, employeeId: string) => {
  const include = employeeInclude(scopeOf(auth), { employeeId }) as { where?: WhereOptions; include: Includeable[] };
  const employee = await models.Employee.findOne({
    where: include.where ?? { id: employeeId },
    attributes: ['id', 'worksNumber', 'firstName', 'lastName', 'isActive', 'sectionId'],
    include: include.include,
  });
  if (!employee) throw notFound('Employee');
  return employee;
};

export const employeeHistory = async (
  auth: AuthContext,
  employeeId: string,
  q: z.infer<typeof employeeHistoryQuery>
) => {
  const employee = await findScopedEmployee(auth, employeeId);
  const [page, counts] = await Promise.all([
    findPage(auth, { ...q, employeeId }),
    models.Allocation.findAll({
      where: { employeeId },
      attributes: ['status', [fn('COUNT', col('id')), 'n']],
      group: ['status'],
      raw: true,
    }) as unknown as Promise<Array<{ status: string; n: string }>>,
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, Number(c.n)]));
  return {
    ...page,
    employee: toEmployeeRef(employee),
    summary: {
      active: byStatus.active ?? 0,
      expired: byStatus.expired ?? 0,
      replaced: byStatus.replaced ?? 0,
      returned: byStatus.returned ?? 0,
      total: counts.reduce((sum, c) => sum + Number(c.n), 0),
    },
  };
};

/** Dropdown data for the list filters, limited to what the user can see. */
export const filterOptions = async (auth: AuthContext) => {
  const scope = scopeOf(auth);
  const sectionWhere: WhereOptions = scope.kind === 'department' ? { departmentId: scope.id } : scope.kind === 'section' ? { id: scope.id } : {};
  const [sections, items] = await Promise.all([
    models.Section.findAll({
      where: sectionWhere,
      attributes: ['id', 'name', 'departmentId'],
      include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    }),
    models.PPEItem.findAll({
      where: { id: { [Op.in]: literal('(SELECT DISTINCT ppe_item_id FROM allocations)') } },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    }),
  ]);
  const departments = new Map<string, string>();
  for (const s of sections) if (s.department) departments.set(s.department.id, s.department.name);
  return {
    departments: [...departments].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    sections: sections.map((s) => ({ id: s.id as string, name: s.name as string, departmentId: s.departmentId as string })),
    items: items.map((i) => ({ id: i.id as string, name: i.name as string })),
  };
};

/* ---------- renewals due ---------- */

const RENEWAL_SORT: Record<string, string> = {
  dueDate: 'earliest_due',
  employee: 'e."lastName" {dir}, e."firstName"',
  items: 'item_count',
};

const renewalWindow = (auth: AuthContext, q: RenewalsQuery) => {
  const scope = scopeOf(auth);
  const replacements: Record<string, unknown> = { days: q.days };
  const filters: string[] = [];
  if (scope.kind === 'department') filters.push('s.department_id = :scopeId');
  if (scope.kind === 'section') filters.push('e."sectionId" = :scopeId');
  if (scope.kind !== 'all') replacements.scopeId = scope.id;
  if (q.departmentId) {
    filters.push('s.department_id = :departmentId');
    replacements.departmentId = q.departmentId;
  }
  if (q.sectionId) {
    filters.push('e."sectionId" = :sectionId');
    replacements.sectionId = q.sectionId;
  }
  if (q.ppeItemId) {
    filters.push('a.ppe_item_id = :ppeItemId');
    replacements.ppeItemId = q.ppeItemId;
  }
  if (q.q) {
    filters.push(
      `(e."worksNumber" ILIKE :q OR concat(e."firstName", ' ', e."lastName") ILIKE :q OR p.name ILIKE :q OR p.item_code ILIKE :q)`
    );
    replacements.q = likeTerm(q.q);
  }

  // Active and expired allocations are both still with the employee and need renewing, but only the latest
  // of an item: an earlier one superseded by a fulfilled request is not due again
  const cte = `WITH due AS (
      SELECT a.id, a.employee_id, ${dueSql('a', 'p')} AS due_date
      FROM allocations a
      JOIN ppe_items p ON p.id = a.ppe_item_id
      JOIN employees e ON e.id = a.employee_id
      JOIN sections s ON s.id = e."sectionId"
      WHERE ${awaitingRenewal('a', 'e')}
      ${filters.map((f) => `AND ${f}`).join(' ')}
    ), win AS (
      SELECT * FROM due
      WHERE due_date <= now() + make_interval(days => :days)
      ${q.includeOverdue ? '' : 'AND due_date >= now()'}
      ${q.onlyOverdue ? 'AND due_date < now()' : ''}
    )`;
  return { cte, replacements };
};

export const renewalsDue = async (auth: AuthContext, q: RenewalsQuery) => {
  const { cte, replacements } = renewalWindow(auth, q);
  const dir = q.sort ? (q.order === 'asc' ? 'ASC' : 'DESC') : 'ASC';
  const sortSql = RENEWAL_SORT[q.sort ?? 'dueDate']!.replace('{dir}', dir);
  const { limit, offset } = pageWindow(q);

  const [groups, [summary]] = await Promise.all([
    sequelize.query<{ employee_id: string; earliest_due: Date; item_count: number; overdue_count: number; ids: string[] }>(
      `${cte}
       SELECT w.employee_id, MIN(w.due_date) AS earliest_due, COUNT(*)::int AS item_count,
              COUNT(*) FILTER (WHERE w.due_date < now())::int AS overdue_count, array_agg(w.id) AS ids
       FROM win w JOIN employees e ON e.id = w.employee_id
       GROUP BY w.employee_id, e."lastName", e."firstName"
       ORDER BY ${sortSql} ${dir}, w.employee_id
       LIMIT :limit OFFSET :offset`,
      { replacements: { ...replacements, limit, offset }, type: QueryTypes.SELECT }
    ),
    sequelize.query<{ employees: number; items: number; overdue: number; next7: number }>(
      `${cte}
       SELECT COUNT(DISTINCT employee_id)::int AS employees, COUNT(*)::int AS items,
              COUNT(*) FILTER (WHERE due_date < now())::int AS overdue,
              COUNT(*) FILTER (WHERE due_date >= now() AND due_date <= now() + interval '7 days')::int AS next7
       FROM win`,
      { replacements, type: QueryTypes.SELECT }
    ),
  ]);

  const ids = groups.flatMap((g) => g.ids);
  const rows = ids.length
    ? await models.Allocation.findAll({
        where: { id: ids },
        attributes: { include: [[DUE, 'dueDate']] },
        include: includes(scopeOf(auth)),
        order: [[DUE, 'ASC']],
      })
    : [];
  const items = rows.map(toAllocation(auth));

  const data = groups.flatMap((g) => {
    const own = items.filter((i) => i.employee.id === g.employee_id);
    if (!own[0]) return [];
    const earliestDue = new Date(g.earliest_due);
    return {
      employee: own[0].employee,
      earliestDue,
      daysUntilDue: daysUntil(earliestDue),
      itemCount: g.item_count,
      overdueCount: g.overdue_count,
      items: own,
    };
  });

  return {
    rows: data,
    count: summary?.employees ?? 0,
    summary: {
      days: q.days,
      employees: summary?.employees ?? 0,
      items: summary?.items ?? 0,
      overdue: summary?.overdue ?? 0,
      dueIn7Days: summary?.next7 ?? 0,
    },
  };
};

/* ---------- transitions ---------- */

/** Locks the allocation row (scoped) so a double click cannot apply a transition twice. */
const lockAllocation = async (auth: AuthContext, id: string, t: Transaction) => {
  const row = await models.Allocation.findOne({
    where: { id },
    include: [employeeInclude(scopeOf(auth)), itemInclude],
    transaction: t,
    lock: { level: t.LOCK.UPDATE, of: models.Allocation },
  });
  if (!row) throw notFound('Allocation');
  if (row.status === 'returned' || row.status === 'replaced') {
    throw new AppError('INVALID_TRANSITION', `This allocation has already been ${row.status}`);
  }
  return row;
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export const returnAllocation = async (auth: AuthContext, id: string, input: ReturnInput) => {
  const restocked = await inTransaction(async (t) => {
    const row = await lockAllocation(auth, id, t);
    // v1 accepted condition and reason but the table has no columns for them, so they were lost; keep them in notes
    const line = `Returned ${isoDay(new Date())} in ${input.condition} condition${input.reason ? `: ${input.reason}` : ''}`;
    await row.update({ status: 'returned', notes: row.notes ? `${row.notes}\n${line}` : line }, { transaction: t });

    if (!RESTOCK_CONDITIONS.has(input.condition)) return 0;
    // A sized item only goes back on the shelf of its own size; putting a size L into size M stock would
    // make the stock count wrong for both sizes
    const sizedReturn = Boolean((row.ppeItem as Row).hasSizeVariants && row.size);
    const stock =
      (row.stockId && (await models.Stock.findByPk(row.stockId, { transaction: t }))) ||
      (await models.Stock.findOne({
        where: sizedReturn ? { ppeItemId: row.ppeItemId, size: row.size } : { ppeItemId: row.ppeItemId },
        order: [[literal(`size IS NOT DISTINCT FROM ${sequelize.escape(row.size ?? null)}`), 'DESC'], ['quantity', 'DESC']],
        transaction: t,
      }));
    if (!stock) return 0;
    const quantity = Number(row.quantity);
    return (await restoreStock(stock.id, quantity, { transaction: t })) === null ? 0 : quantity;
  });
  return { allocation: await getAllocation(auth, id), restocked };
};

export const renewAllocation = async (auth: AuthContext, id: string, input: RenewInput) => {
  const created = await inTransaction(async (t) => {
    const old = await lockAllocation(auth, id, t);
    const item = old.ppeItem as Row;
    const quantity = input.quantity ?? Number(old.quantity);
    const size: string | null = input.size ?? old.size ?? null;

    const [superseded] = await sequelize.query(`SELECT 1 FROM allocations a WHERE a.id = :id AND ${newerHolding('a')}`, {
      replacements: { id: old.id },
      type: QueryTypes.SELECT,
      transaction: t,
    });
    if (superseded) {
      throw new AppError('INVALID_TRANSITION', `${item.name} has been issued to this employee again since; renew the latest issue instead`);
    }

    // v1 rule: sized items draw from the matching size; unsized items from the unsized row
    const stockWhere: WhereOptions = { ppeItemId: old.ppeItemId };
    if (item.hasSizeVariants && size) Object.assign(stockWhere, { size });
    else if (!item.hasSizeVariants) Object.assign(stockWhere, { size: null });
    // Keep the gender (or unisex) and colour of the stock line the old issue came from
    const prev = old.stockId ? await models.Stock.findByPk(old.stockId, { transaction: t }) : null;
    const order: OrderItem[] = [[literal(`quantity >= ${sequelize.escape(quantity)}`), 'DESC']];
    if (prev?.gender) {
      Object.assign(stockWhere, { [Op.or]: [{ gender: [prev.gender, 'unisex'] }, { gender: null }] });
      order.push([literal(`gender IS NOT DISTINCT FROM ${sequelize.escape(prev.gender)}`), 'DESC']);
    }
    if (prev?.color) order.push([literal(`color IS NOT DISTINCT FROM ${sequelize.escape(prev.color)}`), 'DESC']);
    order.push(['quantity', 'DESC']);
    const stock = await models.Stock.findOne({ where: stockWhere, order, transaction: t });

    const remaining = stock ? await deductStock(stock.id, quantity, { transaction: t }) : null;
    if (remaining === null || !stock) {
      const available = stock ? Number(stock.quantity) : 0;
      throw new AppError(
        'INSUFFICIENT_STOCK',
        `Not enough stock to renew ${item.name}${size ? ` (size ${size})` : ''}. Available: ${available}, needed: ${quantity}.`,
        { available, requested: quantity }
      );
    }

    await old.update({ status: 'replaced' }, { transaction: t });

    const issueDate = new Date();
    const frequency = frequencyOf(item, old);
    const unitCost = stock.unitPriceUSD === null || stock.unitPriceUSD === undefined ? null : Number(stock.unitPriceUSD);
    return models.Allocation.create(
      {
        employeeId: old.employeeId,
        ppeItemId: old.ppeItemId,
        requestItemId: old.requestItemId ?? null,
        stockId: stock.id,
        issuedById: auth.userId,
        quantity,
        // A sized item renewed without a size takes the size of the stock row it was drawn from
        size: item.hasSizeVariants ? (size ?? stock.size ?? null) : size,
        issueDate,
        nextRenewalDate: addMonths(issueDate, frequency),
        replacementFrequency: frequency,
        allocationType: 'replacement',
        status: 'active',
        unitCost,
        totalCost: unitCost === null ? null : Math.round(unitCost * quantity * 100) / 100,
        notes: `Renewal of allocation issued ${isoDay(new Date(old.issueDate))}`,
      },
      { transaction: t }
    );
  });
  return getAllocation(auth, created.id);
};
