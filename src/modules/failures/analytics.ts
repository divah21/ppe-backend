import { QueryTypes } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { sequelize } from '../../core/db';
import { RENEWAL_SQL, filterSql, scopeOf } from '../dashboard/scope';
import type { FailureAnalyticsQuery } from './schemas';
import { OPEN_STATUSES } from './service';

const select = <T extends object>(sql: string, replacements: Record<string, unknown>) =>
  sequelize.query<T>(sql, { replacements, type: QueryTypes.SELECT });

const CLOSED = ['resolved', 'replaced'];
const FORECAST_MONTHS = 6;

/**
 * Failure trends for SHEQ and managers (v1 SHEQ analytics, stores failure analytics and forecasts):
 * counts by severity, type, item, department and environment, a monthly trend, how long reports take
 * to close, how many failed before their renewal date, and a six-month projection.
 */
export const failureAnalytics = async (auth: AuthContext, q: FailureAnalyticsQuery) => {
  const f = filterSql(scopeOf(auth), q, 'e."sectionId"', 'sec.department_id');
  // One scan of the scoped failures; every figure below is grouped from it
  const base = `WITH base AS (
    SELECT fr.id, fr.reported_date, fr.severity::text AS severity, fr.failure_type::text AS failure_type, fr.status::text AS status,
           fr.ppe_item_id, p.name AS item_name, d.name AS department, NULLIF(TRIM(fr.observed_at), '') AS environment,
           a.id AS allocation_id,
           -- Failed before the issue was due for renewal, by the rule the renewals screen uses
           (a.id IS NOT NULL AND COALESCE(fr.failure_date, fr.reported_date) < ${RENEWAL_SQL('a', 'p')}) AS premature,
           -- Closed when SHEQ rejected it, else when the replacement was issued (updated_at only as a fallback)
           CASE WHEN fr.status::text IN (:closed)
                THEN EXTRACT(EPOCH FROM COALESCE(rep.created_at, fr.sheq_review_date, fr.updated_at) - fr.reported_date) / 86400 END AS days_to_close
    FROM failure_reports fr
    JOIN employees e ON e.id = fr.employee_id
    LEFT JOIN sections sec ON sec.id = e."sectionId"
    LEFT JOIN departments d ON d.id = sec.department_id
    LEFT JOIN ppe_items p ON p.id = fr.ppe_item_id
    LEFT JOIN allocations a ON a.id = fr.allocation_id
    LEFT JOIN LATERAL (
      SELECT r.created_at FROM allocations r WHERE r.employee_id = fr.employee_id AND r.ppe_item_id = fr.ppe_item_id
        AND fr.status::text = 'replaced' AND r.created_at >= fr.reported_date ORDER BY r.created_at LIMIT 1
    ) rep ON TRUE
    WHERE ${f.sql} AND fr.reported_date >= date_trunc('month', NOW()) - make_interval(months => :back)
  )`;
  const r = { ...f.replacements, back: q.months - 1, open: OPEN_STATUSES, closed: CLOSED };

  const [[totals], groups, months, items] = await Promise.all([
    select<Record<string, string | null>>(
      `${base} SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status IN (:open)) AS open,
              COUNT(*) FILTER (WHERE status IN (:closed)) AS closed,
              COUNT(*) FILTER (WHERE severity = 'critical' AND status IN (:open)) AS critical_open,
              ROUND(AVG(days_to_close)::numeric, 1) AS avg_days,
              COUNT(*) FILTER (WHERE premature) AS premature,
              COUNT(*) FILTER (WHERE allocation_id IS NOT NULL) AS linked
       FROM base`,
      r
    ),
    select<{ dim: string; key: string | null; n: string }>(
      `${base} SELECT 'severity' AS dim, severity AS key, COUNT(*) AS n FROM base GROUP BY severity
       UNION ALL SELECT 'type', failure_type, COUNT(*) FROM base GROUP BY failure_type
       UNION ALL SELECT 'department', department, COUNT(*) FROM base GROUP BY department
       UNION ALL SELECT 'environment', environment, COUNT(*) FROM base GROUP BY environment`,
      r
    ),
    // Months as text in the database's own time zone, so a month is never shifted by a UTC conversion
    select<{ month: string; n: string }>(
      `${base}, m AS (
         SELECT generate_series(date_trunc('month', NOW()) - make_interval(months => :back), date_trunc('month', NOW()), interval '1 month') AS month
       )
       SELECT to_char(m.month, 'YYYY-MM') AS month, COUNT(base.id) AS n FROM m
       LEFT JOIN base ON date_trunc('month', base.reported_date) = m.month
       GROUP BY m.month ORDER BY m.month`,
      r
    ),
    select<{ id: string; name: string; n: string; premature: string; issued: string }>(
      `${base}, top AS (
         SELECT ppe_item_id AS id, MAX(item_name) AS name, COUNT(*) AS n, COUNT(*) FILTER (WHERE premature) AS premature
         FROM base WHERE ppe_item_id IS NOT NULL GROUP BY ppe_item_id ORDER BY n DESC, name LIMIT 10
       )
       -- Issued over the same window and to the same people in scope, so the rate compares like with like
       SELECT top.*, (
         SELECT COALESCE(SUM(al.quantity), 0) FROM allocations al
         JOIN employees e ON e.id = al.employee_id LEFT JOIN sections sec ON sec.id = e."sectionId"
         WHERE al.ppe_item_id = top.id AND ${f.sql} AND al.issue_date >= date_trunc('month', NOW()) - make_interval(months => :back)
       ) AS issued
       FROM top ORDER BY n DESC, name`,
      r
    ),
  ]);

  const n = (v: unknown) => Number(v ?? 0);
  const group = (dim: string) => groups.filter((g) => g.dim === dim);
  const counts = (dim: string) => Object.fromEntries(group(dim).map((x) => [x.key, n(x.n)]));
  const ranked = (dim: string, fallback: string) =>
    group(dim)
      .map((x) => ({ name: x.key ?? fallback, failures: n(x.n) }))
      .sort((a, b) => b.failures - a.failures || a.name.localeCompare(b.name))
      .slice(0, 10);
  const trend = months.map((m) => ({ month: m.month, count: n(m.n) }));
  // Projection: the average of the last six complete months, held flat (v1's forecast was an average too)
  const complete = trend.slice(0, -1).slice(-FORECAST_MONTHS);
  const perMonth = complete.length ? complete.reduce((s, m) => s + m.count, 0) / complete.length : 0;
  const [year, month] = trend.at(-1)!.month.split('-').map(Number) as [number, number];
  const forecast = Array.from({ length: FORECAST_MONTHS }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 + i + 1, 1));
    return { month: d.toISOString().slice(0, 7), expected: Math.round(perMonth * 10) / 10 };
  });

  return {
    months: q.months,
    totals: {
      total: n(totals?.total),
      open: n(totals?.open),
      closed: n(totals?.closed),
      criticalOpen: n(totals?.critical_open),
      averageDaysToClose: totals?.avg_days === null || totals?.avg_days === undefined ? null : Number(totals.avg_days),
      premature: n(totals?.premature),
      linkedToIssue: n(totals?.linked),
    },
    bySeverity: counts('severity'),
    byType: counts('type'),
    trend,
    forecast,
    topItems: items.map((i) => ({
      ppeItemId: i.id,
      name: i.name,
      failures: n(i.n),
      premature: n(i.premature),
      issued: n(i.issued),
      // Failures per 100 issued over the same window
      rate: n(i.issued) > 0 ? Math.round((n(i.n) / n(i.issued)) * 1000) / 10 : null,
    })),
    byDepartment: ranked('department', 'No department'),
    byEnvironment: ranked('environment', 'Not recorded').slice(0, 8),
  };
};
