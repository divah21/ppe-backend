import { QueryTypes } from 'sequelize';
import { ROLES, type AuthContext, type Role } from '../../core/auth';
import { sequelize } from '../../core/db';
import { PRICE_CTE, allocationCost } from '../budgets/spend';
import type { DashboardQuery } from './schemas';
import { CLOSED_REQUEST_STATUSES, RENEWAL_SQL, REQUEST_DEPARTMENT, REQUEST_SECTION, scopeOf, scopeSql, type Scope } from './scope';

/** Request stages each role acts on (v1 approval chain: section rep, dept rep, HOD, stores; SHEQ for replacements). */
const ACTION_STATUSES: Record<Role, readonly string[]> = {
  [ROLES.ADMIN]: ['pending', 'dept-rep-review', 'sheq-review', 'hod-review', 'stores-review', 'approved', 'partially-fulfilled'],
  [ROLES.SECTION_REP]: ['pending'],
  [ROLES.DEPARTMENT_REP]: ['dept-rep-review'],
  [ROLES.HOD]: ['hod-review'],
  [ROLES.SHEQ]: ['sheq-review'],
  [ROLES.STORES]: ['stores-review', 'approved', 'partially-fulfilled'],
};

/** Stock is mine-wide; only roles that manage it see stock levels. */
const SEES_STOCK = new Set<Role>([ROLES.ADMIN, ROLES.STORES, ROLES.SHEQ]);

const WEEKS = 8;
const TOP = 5;
const SPEND_GROUPS = 8;
const RENEWAL_WINDOW_DAYS = 30;

const REQUESTS_FROM = `
  FROM requests r
  LEFT JOIN employees e ON e.id = r.employee_id
  LEFT JOIN sections sec ON sec.id = ${REQUEST_SECTION}`;
const requestScope = (scope: Scope) => scopeSql(scope, REQUEST_SECTION, REQUEST_DEPARTMENT);

const ALLOCATIONS_FROM = `
  FROM allocations a
  JOIN employees e ON e.id = a.employee_id
  JOIN sections sec ON sec.id = e."sectionId"
  LEFT JOIN ppe_items p ON p.id = a.ppe_item_id`;
const allocationScope = (scope: Scope) => scopeSql(scope, 'sec.id', 'sec.department_id');

/** Priced as on the budget pages, so spend agrees across screens. Queries using it start WITH PRICE_CTE. */
const COST = allocationCost('a', 'pr');
const JOIN_PRICE = 'LEFT JOIN price pr ON pr.ppe_item_id = a.ppe_item_id';

const RENEWAL_DUE = `a.status = 'active' AND e."isActive" IS NOT FALSE
  AND ${RENEWAL_SQL('a', 'p')} >= NOW() AND ${RENEWAL_SQL('a', 'p')} < NOW() + make_interval(days => :renewalDays)`;

const select = <T extends object>(sql: string, replacements: Record<string, unknown>) =>
  sequelize.query<T>(sql, { replacements, type: QueryTypes.SELECT });

const num = (v: unknown) => Number(v ?? 0);

// Per stock line, as the Stock page counts it (stock/service.ts lowSql), so the tile matches its filter
const LOW_STOCK_LINES = `
  FROM stocks s JOIN ppe_items p ON p.id = s.ppe_item_id
  WHERE s.quantity <= COALESCE(s.min_level, 0)`;

const kpis = async (auth: AuthContext, scope: Scope, period: DashboardQuery['period']) => {
  const rs = requestScope(scope);
  const as = allocationScope(scope);
  const [requests] = await select<{ awaiting: string; open: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE r.status::text IN (:actionStatuses)) AS awaiting,
       COUNT(*) FILTER (WHERE r.status::text NOT IN (:closed)) AS open
     ${REQUESTS_FROM}
     WHERE ${rs.sql}`,
    { ...rs.replacements, actionStatuses: ACTION_STATUSES[auth.role] ?? ['none'], closed: CLOSED_REQUEST_STATUSES }
  );
  const [allocations] = await select<{ issued: string; spend: string; renewals: string }>(
    `WITH ${PRICE_CTE}
     SELECT
       COALESCE(SUM(a.quantity) FILTER (WHERE a.issue_date >= date_trunc(:period, NOW())), 0) AS issued,
       COALESCE(SUM(${COST}) FILTER (WHERE a.issue_date >= date_trunc(:period, NOW())), 0) AS spend,
       COUNT(*) FILTER (WHERE ${RENEWAL_DUE}) AS renewals
     ${ALLOCATIONS_FROM}
     ${JOIN_PRICE}
     WHERE ${as.sql} AND (a.issue_date >= date_trunc(:period, NOW()) OR a.status = 'active')`,
    { ...as.replacements, period, renewalDays: RENEWAL_WINDOW_DAYS }
  );
  let lowStock: number | null = null;
  if (SEES_STOCK.has(auth.role)) {
    const [row] = await select<{ count: string }>(`SELECT COUNT(*) AS count ${LOW_STOCK_LINES}`, {});
    lowStock = num(row?.count);
  }
  return {
    awaitingMyAction: num(requests?.awaiting),
    openRequests: num(requests?.open),
    issuedThisPeriod: num(allocations?.issued),
    spendThisPeriod: Math.round(num(allocations?.spend) * 100) / 100,
    lowStock,
    renewalsDue: num(allocations?.renewals),
  };
};

const requestsPerWeek = async (scope: Scope) => {
  const rs = requestScope(scope);
  const rows = await select<{ week_start: Date; count: string }>(
    `WITH weeks AS (
       SELECT generate_series(date_trunc('week', NOW()) - make_interval(weeks => :back), date_trunc('week', NOW()), interval '1 week') AS week_start
     )
     SELECT w.week_start, COUNT(r.id) AS count
     FROM weeks w
     LEFT JOIN (
       SELECT r.id, r.created_at ${REQUESTS_FROM}
       WHERE ${rs.sql} AND r.created_at >= date_trunc('week', NOW()) - make_interval(weeks => :back)
     ) r
       ON r.created_at >= w.week_start AND r.created_at < w.week_start + interval '1 week'
     GROUP BY w.week_start ORDER BY w.week_start`,
    { ...rs.replacements, back: WEEKS - 1 }
  );
  return rows.map((r) => ({ weekStart: new Date(r.week_start).toISOString(), count: num(r.count) }));
};

const SPEND_GROUP_BY = {
  mine: { groupBy: 'department', id: 'd.id', name: `COALESCE(d.name, 'No department')` },
  department: { groupBy: 'section', id: 'sec.id', name: 'sec.name' },
  section: { groupBy: 'category', id: 'NULL', name: `COALESCE(NULLIF(p.category, ''), 'Uncategorised')` },
} as const;

const spendBreakdown = async (scope: Scope, period: DashboardQuery['period']) => {
  const as = allocationScope(scope);
  const g = SPEND_GROUP_BY[scope.kind];
  const rows = await select<{ id: string | null; name: string; amount: string }>(
    `WITH ${PRICE_CTE}
     SELECT ${g.id} AS id, ${g.name} AS name, SUM(${COST}) AS amount
     ${ALLOCATIONS_FROM}
     ${JOIN_PRICE}
     LEFT JOIN departments d ON d.id = sec.department_id
     WHERE ${as.sql} AND a.issue_date >= date_trunc(:period, NOW())
     GROUP BY 1, 2
     HAVING SUM(${COST}) > 0
     ORDER BY amount DESC, name`,
    { ...as.replacements, period }
  );
  const items = rows.map((r) => ({ id: r.id, name: r.name, amount: Math.round(num(r.amount) * 100) / 100 }));
  if (items.length > SPEND_GROUPS) {
    const rest = items.splice(SPEND_GROUPS - 1);
    items.push({ id: null, name: 'Other', amount: Math.round(rest.reduce((s, r) => s + r.amount, 0) * 100) / 100 });
  }
  return { groupBy: g.groupBy, rows: items };
};

const lowStockTop = async () => {
  const rows = await select<{
    stock_id: string;
    id: string;
    name: string;
    item_code: string | null;
    size: string | null;
    quantity: number;
    min_level: number;
  }>(
    `SELECT s.id AS stock_id, p.id, p.name, p.item_code, s.size, s.quantity, COALESCE(s.min_level, 0) AS min_level
     ${LOW_STOCK_LINES}
     ORDER BY s.quantity - COALESCE(s.min_level, 0), s.quantity, p.name, s.size
     LIMIT :top`,
    { top: TOP }
  );
  return rows.map((r) => ({
    stockId: r.stock_id,
    ppeItemId: r.id,
    size: r.size,
    name: r.name,
    itemCode: r.item_code,
    quantity: num(r.quantity),
    minLevel: num(r.min_level),
  }));
};

const renewalsTop = async (scope: Scope) => {
  const as = allocationScope(scope);
  const rows = await select<{
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    works_number: string;
    item_name: string | null;
    due: Date;
  }>(
    `SELECT a.id, e.id AS employee_id, e."firstName" AS first_name, e."lastName" AS last_name,
            e."worksNumber" AS works_number, p.name AS item_name, ${RENEWAL_SQL('a', 'p')} AS due
     ${ALLOCATIONS_FROM}
     WHERE ${as.sql} AND ${RENEWAL_DUE}
     ORDER BY due, e."lastName", e."firstName"
     LIMIT :top`,
    { ...as.replacements, renewalDays: RENEWAL_WINDOW_DAYS, top: TOP }
  );
  const now = Date.now();
  return rows.map((r) => ({
    allocationId: r.id,
    employeeId: r.employee_id,
    employeeName: `${r.first_name} ${r.last_name}`.trim(),
    worksNumber: r.works_number,
    itemName: r.item_name ?? 'Unknown item',
    dueDate: new Date(r.due).toISOString(),
    daysLeft: Math.max(0, Math.ceil((new Date(r.due).getTime() - now) / 86_400_000)),
  }));
};

const scopeLabel = async (scope: Scope) => {
  if (scope.kind === 'mine') return 'Whole mine';
  const table = scope.kind === 'department' ? 'departments' : 'sections';
  const [row] = await select<{ name: string }>(`SELECT name FROM ${table} WHERE id = :id`, { id: scope.id });
  return row?.name ?? (scope.kind === 'department' ? 'No department assigned' : 'No section assigned');
};

export const dashboardSummary = async (auth: AuthContext, q: DashboardQuery) => {
  const scope = scopeOf(auth);
  const sees = SEES_STOCK.has(auth.role);
  const [k, weeks, spend, low, renewals, label, [period]] = await Promise.all([
    kpis(auth, scope, q.period),
    requestsPerWeek(scope),
    spendBreakdown(scope, q.period),
    sees ? lowStockTop() : Promise.resolve(null),
    renewalsTop(scope),
    scopeLabel(scope),
    select<{ start: Date }>(`SELECT date_trunc(:period, NOW()) AS start`, { period: q.period }),
  ]);
  return {
    role: auth.role,
    scope: { kind: scope.kind, id: scope.kind === 'mine' ? null : scope.id, name: label },
    period: { key: q.period, start: new Date(period!.start).toISOString() },
    kpis: k,
    requestsPerWeek: weeks,
    spendBreakdown: spend,
    lowStock: low,
    renewalsDue: renewals,
  };
};

export type DashboardSummary = Awaited<ReturnType<typeof dashboardSummary>>;
