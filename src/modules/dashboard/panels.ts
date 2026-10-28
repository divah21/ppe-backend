import { QueryTypes } from 'sequelize';
import { ROLES, type AuthContext, type Role } from '../../core/auth';
import { sequelize } from '../../core/db';
import { listForecast } from '../valuation/forecast';
import { forecastQuery } from '../valuation/schemas';
import { REQUEST_DEPARTMENT, REQUEST_SECTION, scopeSql, type Scope } from './scope';

const TOP = 5;

const select = <T extends object>(sql: string, replacements: Record<string, unknown>) =>
  sequelize.query<T>(sql, { replacements, type: QueryTypes.SELECT });

const iso = (d: Date | string) => new Date(d).toISOString();
const fullName = (first: string | null, last: string | null) => `${first ?? ''} ${last ?? ''}`.trim();

interface RequestRow {
  id: string;
  status: string;
  request_type: string;
  created_at: Date;
  first_name: string | null;
  last_name: string | null;
  works_number: string | null;
  section_name: string | null;
  item_count: string;
}

const REQUEST_ROWS = `
  SELECT r.id, r.status, r.request_type, r.created_at, e."firstName" AS first_name, e."lastName" AS last_name,
         e."worksNumber" AS works_number, sec.name AS section_name,
         (SELECT COALESCE(SUM(ri.quantity), 0) FROM request_items ri WHERE ri.request_id = r.id) AS item_count
  FROM requests r
  LEFT JOIN employees e ON e.id = r.employee_id
  LEFT JOIN sections sec ON sec.id = ${REQUEST_SECTION}`;

const toRequest = (r: RequestRow) => ({
  id: r.id,
  status: r.status,
  requestType: r.request_type,
  createdAt: iso(r.created_at),
  employeeName: fullName(r.first_name, r.last_name) || 'Visitor',
  worksNumber: r.works_number,
  sectionName: r.section_name,
  itemCount: Number(r.item_count),
});

/** Oldest first: the requests that have waited longest for this user. */
export const actionQueue = async (scope: Scope, statuses: readonly string[]) => {
  if (!statuses.length) return [];
  const s = scopeSql(scope, REQUEST_SECTION, REQUEST_DEPARTMENT);
  const rows = await select<RequestRow>(
    `${REQUEST_ROWS} WHERE ${s.sql} AND r.status::text IN (:statuses) ORDER BY r.created_at ASC LIMIT :top`,
    { ...s.replacements, statuses, top: TOP }
  );
  return rows.map(toRequest);
};

export const recentRequests = async (scope: Scope) => {
  const s = scopeSql(scope, REQUEST_SECTION, REQUEST_DEPARTMENT);
  const rows = await select<RequestRow>(`${REQUEST_ROWS} WHERE ${s.sql} ORDER BY r.created_at DESC LIMIT :top`, {
    ...s.replacements,
    top: TOP,
  });
  return rows.map(toRequest);
};

const OPEN_FAILURES = ['pending-sheq-review', 'sheq-approved', 'stores-processing'];
const FAILURES_FROM = `
  FROM failure_reports f
  JOIN employees e ON e.id = f.employee_id
  JOIN sections sec ON sec.id = e."sectionId"`;

/** Open failure reports by severity, and the newest few, for roles that act on them. */
export const failurePanel = async (scope: Scope) => {
  const s = scopeSql(scope, 'sec.id', 'sec.department_id');
  const replacements = { ...s.replacements, open: OPEN_FAILURES, top: TOP };
  const [severities, recent] = await Promise.all([
    select<{ severity: string; count: string }>(
      `SELECT f.severity, COUNT(*) AS count ${FAILURES_FROM} WHERE ${s.sql} AND f.status::text IN (:open) GROUP BY 1`,
      replacements
    ),
    select<{
      id: string;
      severity: string;
      status: string;
      created_at: Date;
      first_name: string;
      last_name: string;
      item_name: string | null;
    }>(
      `SELECT f.id, f.severity, f.status, f.created_at, e."firstName" AS first_name, e."lastName" AS last_name, p.name AS item_name
       ${FAILURES_FROM}
       LEFT JOIN ppe_items p ON p.id = f.ppe_item_id
       WHERE ${s.sql} AND f.status::text IN (:open)
       ORDER BY f.created_at DESC LIMIT :top`,
      replacements
    ),
  ]);
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of severities) if (r.severity in bySeverity) bySeverity[r.severity as keyof typeof bySeverity] = Number(r.count);
  return {
    open: Object.values(bySeverity).reduce((a, b) => a + b, 0),
    bySeverity,
    recent: recent.map((r) => ({
      id: r.id,
      severity: r.severity,
      status: r.status,
      createdAt: iso(r.created_at),
      employeeName: fullName(r.first_name, r.last_name),
      itemName: r.item_name ?? 'Unknown item',
    })),
  };
};

/** Items whose renewals in the next 90 days the shelf cannot cover, largest gap first. */
export const forecastShortfall = async (auth: AuthContext) => {
  const { rows } = await listForecast(auth, forecastQuery.parse({ days: 90, pageSize: TOP, sort: 'shortage' }));
  return rows
    .filter((r) => r.shortage > 0)
    .map((r) => ({
      ppeItemId: r.ppeItemId,
      itemName: r.itemName,
      required: r.required,
      currentStock: r.currentStock,
      shortage: r.shortage,
    }));
};

/** Latest changes across the system; sign-ins are left out as noise. */
export const recentActivity = async () => {
  const rows = await select<{ id: string; action: string; entity_type: string | null; created_at: Date; username: string | null }>(
    `SELECT l.id, l.action, l.entity_type, l.created_at, u.username
     FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id
     WHERE l.action <> 'LOGIN'
     ORDER BY l.created_at DESC LIMIT :top`,
    { top: TOP + 1 }
  );
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entity_type,
    username: r.username,
    createdAt: iso(r.created_at),
  }));
};

export const SEES_FAILURES = new Set<Role>([ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES]);
export const SEES_FORECAST = new Set<Role>([ROLES.ADMIN, ROLES.STORES]);
export const SEES_BUDGET = new Set<Role>([ROLES.ADMIN, ROLES.STORES, ROLES.SHEQ, ROLES.HOD, ROLES.DEPARTMENT_REP]);
