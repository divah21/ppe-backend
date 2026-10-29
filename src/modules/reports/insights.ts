import { QueryTypes } from 'sequelize';
import { ROLES, type AuthContext, type Role } from '../../core/auth';
import { sequelize } from '../../core/db';
import { awaitingRenewal } from '../allocations/rules';
import { PRICE_CTE, allocationCost, money } from '../budgets/spend';
import { RENEWAL_SQL, REQUEST_DEPARTMENT, REQUEST_SECTION, filterSql, scopeOf } from '../dashboard/scope';
import type { InsightsQuery } from './schemas';
import { SPEND_ROLES } from './service';

const select = <T extends object>(sql: string, replacements: Record<string, unknown>) =>
  sequelize.query<T>(sql, { replacements, type: QueryTypes.SELECT });
const num = (v: unknown) => Number(v ?? 0);

/** Stock is mine-wide; only roles that manage it see stock levels. */
const SEES_STOCK = new Set<Role>([ROLES.ADMIN, ROLES.STORES, ROLES.SHEQ]);
const TOP = 8;
const AHEAD = 6;

// Months as text in the database's own time zone, so no month is shifted by a UTC conversion
const MONTH = (expr: string) => `to_char(date_trunc('month', ${expr}), 'YYYY-MM')`;
const SINCE = `date_trunc('month', NOW()) - make_interval(months => :back)`;

const SPEND_GROUP = {
  mine: { label: 'department', name: `COALESCE(d.name, 'No department')` },
  department: { label: 'section', name: `COALESCE(sec.name, 'No section')` },
  section: { label: 'category', name: `COALESCE(NULLIF(p.category, ''), 'Uncategorised')` },
} as const;

/** Folds everything past the top rows into "Other", so a chart stays readable. */
const topWithOther = (rows: Array<{ name: string; value: number }>, round = (n: number) => n) => {
  if (rows.length <= TOP) return rows;
  const rest = rows.splice(TOP - 1);
  return [...rows, { name: 'Other', value: round(rest.reduce((s, r) => s + r.value, 0)) }];
};

/**
 * Charts for the reports page: monthly issues, spend, requests and failures, where the spend went,
 * what is issued most, where requests stand, and the renewals coming up. Scoped like the exports.
 */
export const reportInsights = async (auth: AuthContext, q: InsightsQuery) => {
  const scope = scopeOf(auth);
  const seesSpend = SPEND_ROLES.includes(auth.role);
  const filter = { departmentId: q.departmentId };
  // Issues stay with the section and department they were issued under; people, requests and failures go by where people are now
  const issued = filterSql(scope, filter, 'a.section_id', 'a.department_id');
  const people = filterSql(scope, filter, 'sec.id', 'sec.department_id');
  const requests = filterSql(scope, filter, REQUEST_SECTION, REQUEST_DEPARTMENT);
  const back = q.months - 1;
  const group = SPEND_GROUP[scope.kind];
  const cost = allocationCost('a', 'pr');

  const ISSUED_FROM = `FROM allocations a
    LEFT JOIN sections sec ON sec.id = a.section_id
    LEFT JOIN departments d ON d.id = a.department_id
    LEFT JOIN ppe_items p ON p.id = a.ppe_item_id
    LEFT JOIN price pr ON pr.ppe_item_id = a.ppe_item_id`;
  const REQUESTS_FROM = `FROM requests r
    LEFT JOIN employees e ON e.id = r.employee_id
    LEFT JOIN sections sec ON sec.id = ${REQUEST_SECTION}`;

  const [months, issues, requestMonths, failureMonths, spendBy, items, statuses, severities, renewals, stock] = await Promise.all([
    select<{ month: string }>(
      `SELECT ${MONTH('m')} AS month FROM generate_series(${SINCE}, date_trunc('month', NOW()), interval '1 month') m ORDER BY m`,
      { back }
    ),
    select<{ month: string; units: string; spend: string }>(
      `WITH ${PRICE_CTE}
       SELECT ${MONTH('a.issue_date')} AS month, SUM(a.quantity) AS units, SUM(${cost}) AS spend
       ${ISSUED_FROM}
       WHERE ${issued.sql} AND a.issue_date >= ${SINCE}
       GROUP BY 1`,
      { ...issued.replacements, back }
    ),
    select<{ kind: 'raised' | 'fulfilled'; month: string; n: string }>(
      `SELECT 'raised' AS kind, ${MONTH('r.created_at')} AS month, COUNT(*) AS n
       ${REQUESTS_FROM} WHERE ${requests.sql} AND r.created_at >= ${SINCE} GROUP BY 2
       UNION ALL
       SELECT 'fulfilled', ${MONTH('r.fulfilled_date')}, COUNT(*)
       ${REQUESTS_FROM} WHERE ${requests.sql} AND r.status::text = 'fulfilled' AND r.fulfilled_date >= ${SINCE} GROUP BY 2`,
      { ...requests.replacements, back }
    ),
    select<{ month: string; n: string }>(
      `SELECT ${MONTH('fr.reported_date')} AS month, COUNT(*) AS n
       FROM failure_reports fr
       JOIN employees e ON e.id = fr.employee_id
       LEFT JOIN sections sec ON sec.id = e."sectionId"
       WHERE ${people.sql} AND fr.reported_date >= ${SINCE}
       GROUP BY 1`,
      { ...people.replacements, back }
    ),
    seesSpend
      ? select<{ name: string; value: string }>(
          `WITH ${PRICE_CTE}
           SELECT ${group.name} AS name, SUM(${cost}) AS value
           ${ISSUED_FROM}
           WHERE ${issued.sql} AND a.issue_date >= ${SINCE}
           GROUP BY 1 HAVING SUM(${cost}) > 0
           ORDER BY value DESC, name`,
          { ...issued.replacements, back }
        )
      : null,
    select<{ name: string; value: string }>(
      `WITH ${PRICE_CTE}
       SELECT COALESCE(p.name, 'Unknown item') AS name, SUM(a.quantity) AS value
       ${ISSUED_FROM}
       WHERE ${issued.sql} AND a.issue_date >= ${SINCE}
       GROUP BY 1 ORDER BY value DESC, name LIMIT :top`,
      { ...issued.replacements, back, top: TOP }
    ),
    select<{ status: string; n: string }>(
      `SELECT r.status::text AS status, COUNT(*) AS n ${REQUESTS_FROM}
       WHERE ${requests.sql} AND r.created_at >= ${SINCE} GROUP BY 1`,
      { ...requests.replacements, back }
    ),
    select<{ severity: string; n: string }>(
      `SELECT fr.severity::text AS severity, COUNT(*) AS n
       FROM failure_reports fr
       JOIN employees e ON e.id = fr.employee_id
       LEFT JOIN sections sec ON sec.id = e."sectionId"
       WHERE ${people.sql} AND fr.reported_date >= ${SINCE}
       GROUP BY 1`,
      { ...people.replacements, back }
    ),
    // Same rule as the renewals screen: still held, latest issue of the item only
    select<{ month: string | null; n: string }>(
      `SELECT CASE WHEN ${RENEWAL_SQL('a', 'p')} < date_trunc('month', NOW()) THEN NULL ELSE ${MONTH(RENEWAL_SQL('a', 'p'))} END AS month,
              COUNT(*) AS n
       FROM allocations a
       JOIN employees e ON e.id = a.employee_id
       JOIN sections sec ON sec.id = e."sectionId"
       LEFT JOIN ppe_items p ON p.id = a.ppe_item_id
       WHERE ${people.sql} AND ${awaitingRenewal('a', 'e')}
         AND ${RENEWAL_SQL('a', 'p')} < date_trunc('month', NOW()) + make_interval(months => :ahead)
       GROUP BY 1`,
      { ...people.replacements, ahead: AHEAD }
    ),
    SEES_STOCK.has(auth.role)
      ? select<{ healthy: string; low: string; out: string }>(
          `SELECT COUNT(*) FILTER (WHERE s.quantity > COALESCE(s.min_level, 0)) AS healthy,
                  COUNT(*) FILTER (WHERE s.quantity > 0 AND s.quantity <= COALESCE(s.min_level, 0)) AS low,
                  COUNT(*) FILTER (WHERE s.quantity <= 0) AS out
           FROM stocks s JOIN ppe_items p ON p.id = s.ppe_item_id`,
          {}
        )
      : null,
  ]);

  const byMonth = <T extends { month: string | null }>(rows: T[]) => new Map(rows.map((r) => [r.month, r]));
  const issuesBy = byMonth(issues);
  const raised = byMonth(requestMonths.filter((r) => r.kind === 'raised'));
  const fulfilled = byMonth(requestMonths.filter((r) => r.kind === 'fulfilled'));
  const failed = byMonth(failureMonths);
  const due = byMonth(renewals);
  const now = months.at(-1)!.month;
  const [year, month] = now.split('-').map(Number) as [number, number];
  const ahead = Array.from({ length: AHEAD }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 + i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });

  return {
    months: q.months,
    monthly: months.map(({ month: m }) => ({
      month: m,
      issued: num(issuesBy.get(m)?.units),
      spend: seesSpend ? money(issuesBy.get(m)?.spend) : null,
      requestsRaised: num(raised.get(m)?.n),
      requestsFulfilled: num(fulfilled.get(m)?.n),
      failures: num(failed.get(m)?.n),
    })),
    spendBy: spendBy
      ? { groupBy: group.label, rows: topWithOther(spendBy.map((r) => ({ name: r.name, value: money(r.value) })), money) }
      : null,
    topItems: items.map((r) => ({ name: r.name, value: num(r.value) })),
    requestStatus: Object.fromEntries(statuses.map((r) => [r.status, num(r.n)])),
    failureSeverity: Object.fromEntries(severities.map((r) => [r.severity, num(r.n)])),
    renewals: { overdue: num(due.get(null)?.n), ahead: ahead.map((m) => ({ month: m, due: num(due.get(m)?.n) })) },
    stock: stock ? { healthy: num(stock[0]?.healthy), low: num(stock[0]?.low), out: num(stock[0]?.out) } : null,
  };
};
