import { QueryTypes } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { sequelize } from '../../core/db';
import { filterSql, scopeOf } from '../dashboard/scope';
import type { FailureAnalyticsQuery } from './schemas';
import { OPEN_STATUSES } from './service';

const select = <T extends object>(sql: string, replacements: Record<string, unknown>) =>
  sequelize.query<T>(sql, { replacements, type: QueryTypes.SELECT });

const CLOSED = ['resolved', 'replaced'];
const FORECAST_MONTHS = 6;

/**
 * Failure trends for SHEQ and managers (v1 SHEQ analytics, stores failure analytics and forecasts):
 * counts by severity, type, status, item and department, a monthly trend, how long reports take to
 * close, how many failed before their replacement date, and a six-month projection.
 */
export const failureAnalytics = async (auth: AuthContext, q: FailureAnalyticsQuery) => {
  const f = filterSql(scopeOf(auth), q, 'e."sectionId"', 'sec.department_id');
  const from = `FROM failure_reports fr
    JOIN employees e ON e.id = fr.employee_id
    LEFT JOIN sections sec ON sec.id = e."sectionId"
    LEFT JOIN departments d ON d.id = sec.department_id
    LEFT JOIN ppe_items p ON p.id = fr.ppe_item_id
    LEFT JOIN allocations a ON a.id = fr.allocation_id
    WHERE ${f.sql} AND fr.reported_date >= date_trunc('month', NOW()) - make_interval(months => :back)`;
  const r = { ...f.replacements, back: q.months - 1, open: OPEN_STATUSES, closed: CLOSED };
  // Failed before the item was due for replacement: issue date plus its replacement frequency
  const premature = `a.issue_date IS NOT NULL AND p.replacement_frequency > 0
    AND COALESCE(fr.failure_date, fr.reported_date) < a.issue_date + make_interval(months => p.replacement_frequency)`;

  const [[totals], severity, type, status, months, items, departments, environments] = await Promise.all([
    select<Record<string, string | null>>(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE fr.status::text IN (:open)) AS open,
              COUNT(*) FILTER (WHERE fr.status::text IN (:closed)) AS closed,
              COUNT(*) FILTER (WHERE fr.severity::text = 'critical' AND fr.status::text IN (:open)) AS critical_open,
              ROUND(AVG(EXTRACT(EPOCH FROM fr.updated_at - fr.reported_date) / 86400) FILTER (WHERE fr.status::text IN (:closed))::numeric, 1) AS avg_days,
              COUNT(*) FILTER (WHERE ${premature}) AS premature,
              COUNT(*) FILTER (WHERE a.id IS NOT NULL) AS linked
       ${from}`,
      r
    ),
    select<{ key: string; n: string }>(`SELECT fr.severity::text AS key, COUNT(*) AS n ${from} GROUP BY 1`, r),
    select<{ key: string; n: string }>(`SELECT fr.failure_type::text AS key, COUNT(*) AS n ${from} GROUP BY 1`, r),
    select<{ key: string; n: string }>(`SELECT fr.status::text AS key, COUNT(*) AS n ${from} GROUP BY 1`, r),
    select<{ month: Date; n: string }>(
      `WITH m AS (
         SELECT generate_series(date_trunc('month', NOW()) - make_interval(months => :back), date_trunc('month', NOW()), interval '1 month') AS month
       )
       SELECT m.month, COUNT(x.id) AS n FROM m
       LEFT JOIN (SELECT fr.id, fr.reported_date ${from}) x ON date_trunc('month', x.reported_date) = m.month
       GROUP BY m.month ORDER BY m.month`,
      r
    ),
    select<{ id: string; name: string; n: string; premature: string; issued: string }>(
      `SELECT p.id, p.name, COUNT(*) AS n, COUNT(*) FILTER (WHERE ${premature}) AS premature,
              (SELECT COALESCE(SUM(al.quantity), 0) FROM allocations al WHERE al.ppe_item_id = p.id
                 AND al.issue_date >= date_trunc('month', NOW()) - make_interval(months => :back)) AS issued
       ${from} AND p.id IS NOT NULL
       GROUP BY p.id, p.name ORDER BY n DESC, p.name LIMIT 10`,
      r
    ),
    select<{ name: string | null; n: string }>(
      `SELECT d.name, COUNT(*) AS n ${from} GROUP BY d.name ORDER BY n DESC, d.name NULLS LAST LIMIT 10`,
      r
    ),
    select<{ name: string; n: string }>(
      `SELECT COALESCE(NULLIF(TRIM(fr.observed_at), ''), 'Not recorded') AS name, COUNT(*) AS n ${from}
       GROUP BY 1 ORDER BY n DESC, 1 LIMIT 8`,
      r
    ),
  ]);

  const n = (v: unknown) => Number(v ?? 0);
  const counts = (rows: Array<{ key: string; n: string }>) => Object.fromEntries(rows.map((x) => [x.key, n(x.n)]));
  const trend = months.map((m) => ({ month: new Date(m.month).toISOString().slice(0, 7), count: n(m.n) }));
  // Projection: the average of the last six complete months, held flat (v1 forecast was a simple average too)
  const complete = trend.slice(0, -1).slice(-FORECAST_MONTHS);
  const perMonth = complete.length ? complete.reduce((s, m) => s + m.count, 0) / complete.length : 0;
  const start = new Date();
  const forecast = Array.from({ length: FORECAST_MONTHS }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i + 1, 1);
    return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, expected: Math.round(perMonth * 10) / 10 };
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
    bySeverity: counts(severity),
    byType: counts(type),
    byStatus: counts(status),
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
    byDepartment: departments.map((d) => ({ name: d.name ?? 'No department', failures: n(d.n) })),
    byEnvironment: environments.map((e) => ({ name: e.name, failures: n(e.n) })),
  };
};
