import { QueryTypes } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { sequelize } from '../../core/db';
import { likeTerm, pageWindow } from '../../core/http';
import { PRICE_CTE, allocationCost } from '../budgets/spend';
import { scopeOf, type Scope } from './policy';
import { awaitingRenewal, dueSql } from './rules';
import type { AllocationListQuery, ComplianceQuery, EmployeeSummaryQuery, TemplateQuery } from './schemas';

const DAY_MS = 86_400_000;
const EXPIRING_DAYS = 30;

const select = <T extends object>(sql: string, replacements: Record<string, unknown>) =>
  sequelize.query<T>(sql, { replacements, type: QueryTypes.SELECT });

/** Scope and narrowing filters on employees e joined to sections s. */
const employeeFilters = (scope: Scope, f: { departmentId?: string; sectionId?: string; employeeId?: string }) => {
  const parts: string[] = [];
  const replacements: Record<string, unknown> = {};
  if (scope.kind === 'section') parts.push('e."sectionId" = :scopeId');
  if (scope.kind === 'department') parts.push('s.department_id = :scopeId');
  if (scope.kind !== 'all') replacements.scopeId = scope.id;
  if (f.departmentId) (parts.push('s.department_id = :departmentId'), (replacements.departmentId = f.departmentId));
  if (f.sectionId) (parts.push('e."sectionId" = :sectionId'), (replacements.sectionId = f.sectionId));
  if (f.employeeId) (parts.push('e.id = :employeeId'), (replacements.employeeId = f.employeeId));
  return { parts, replacements };
};

const DUE = dueSql('a', 'p');

/** Figures for the cards above the issued list, under the list's filters. */
export const allocationSummary = async (auth: AuthContext, q: AllocationListQuery) => {
  const { parts, replacements } = employeeFilters(scopeOf(auth), q);
  if (q.status) (parts.push('a.status = :status'), (replacements.status = q.status));
  if (q.ppeItemId) (parts.push('a.ppe_item_id = :ppeItemId'), (replacements.ppeItemId = q.ppeItemId));
  if (q.from) (parts.push('a.issue_date >= :from::date'), (replacements.from = q.from));
  if (q.to) (parts.push(`a.issue_date < :to::date + interval '1 day'`), (replacements.to = q.to));
  if (q.q) {
    parts.push(`(e."worksNumber" ILIKE :q OR concat(e."firstName", ' ', e."lastName") ILIKE :q OR p.name ILIKE :q OR p.item_code ILIKE :q)`);
    replacements.q = likeTerm(q.q);
  }
  const [r] = await select<Record<string, string>>(
    `WITH ${PRICE_CTE}
     SELECT COUNT(DISTINCT a.employee_id) AS employees,
            COALESCE(SUM(a.quantity), 0) AS units,
            COUNT(*) FILTER (WHERE a.status = 'active') AS active,
            COUNT(*) FILTER (WHERE ${awaitingRenewal('a', 'e')} AND ${DUE} >= NOW() AND ${DUE} < NOW() + make_interval(days => :expiring)) AS expiring,
            COUNT(*) FILTER (WHERE ${awaitingRenewal('a', 'e')} AND ${DUE} < NOW()) AS overdue,
            COALESCE(SUM(${allocationCost('a', 'pr')}), 0) AS cost
     FROM allocations a
     JOIN ppe_items p ON p.id = a.ppe_item_id
     JOIN employees e ON e.id = a.employee_id
     JOIN sections s ON s.id = e."sectionId"
     LEFT JOIN price pr ON pr.ppe_item_id = a.ppe_item_id
     ${parts.length ? `WHERE ${parts.join(' AND ')}` : ''}`,
    { ...replacements, expiring: EXPIRING_DAYS }
  );
  return {
    employees: Number(r?.employees ?? 0),
    units: Number(r?.units ?? 0),
    active: Number(r?.active ?? 0),
    expiringDays: EXPIRING_DAYS,
    expiring: Number(r?.expiring ?? 0),
    overdue: Number(r?.overdue ?? 0),
    totalCost: Math.round(Number(r?.cost ?? 0) * 100) / 100,
  };
};

const SUMMARY_SORT = {
  employee: 'e."lastName" :dir, e."firstName" :dir',
  active: 'active :dir',
  issued: 'issued :dir',
  nextDue: 'next_due :dir NULLS LAST',
} as const;

/** Each employee in scope with what they hold now, everything ever issued and their next renewal (v1 summaries). */
export const employeeSummaries = async (auth: AuthContext, q: EmployeeSummaryQuery) => {
  const { parts, replacements } = employeeFilters(scopeOf(auth), q);
  parts.push('e."isActive" IS NOT FALSE');
  if (q.q) {
    parts.push(`(e."worksNumber" ILIKE :q OR concat(e."firstName", ' ', e."lastName") ILIKE :q)`);
    replacements.q = likeTerm(q.q);
  }
  const where = `WHERE ${parts.join(' AND ')}`;
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';
  const order = (q.sort ? SUMMARY_SORT[q.sort] : SUMMARY_SORT.employee.replaceAll(':dir', 'ASC')).replaceAll(':dir', dir);
  const rows = await select<{
    id: string;
    works_number: string;
    first_name: string;
    last_name: string;
    section_id: string;
    section_name: string;
    job_title: string | null;
    active: string;
    issued: string;
    next_due: Date | null;
  }>(
    `SELECT e.id, e."worksNumber" AS works_number, e."firstName" AS first_name, e."lastName" AS last_name,
            s.id AS section_id, s.name AS section_name, COALESCE(jt.name, e."jobTitle") AS job_title,
            COUNT(a.id) FILTER (WHERE a.status = 'active') AS active,
            COALESCE(SUM(a.quantity), 0) AS issued,
            MIN(${DUE}) FILTER (WHERE ${awaitingRenewal('a', 'e')}) AS next_due
     FROM employees e
     JOIN sections s ON s.id = e."sectionId"
     LEFT JOIN job_titles jt ON jt.id = e."jobTitleId"
     LEFT JOIN allocations a ON a.employee_id = e.id
     LEFT JOIN ppe_items p ON p.id = a.ppe_item_id
     ${where}
     GROUP BY e.id, s.id, jt.name
     ORDER BY ${order}, e.id
     LIMIT :limit OFFSET :offset`,
    { ...replacements, ...pageWindow(q) }
  );
  const [c] = await select<{ n: string }>(
    `SELECT COUNT(*) AS n FROM employees e JOIN sections s ON s.id = e."sectionId" ${where}`,
    replacements
  );
  return {
    rows: rows.map((r) => ({
      employee: {
        id: r.id,
        worksNumber: r.works_number,
        name: `${r.first_name} ${r.last_name}`.trim(),
        section: { id: r.section_id, name: r.section_name },
        jobTitle: r.job_title,
      },
      active: Number(r.active),
      issued: Number(r.issued),
      nextDue: r.next_due ? new Date(r.next_due).toISOString() : null,
      daysUntilDue: r.next_due ? Math.ceil((new Date(r.next_due).getTime() - Date.now()) / DAY_MS) : null,
    })),
    count: Number(c?.n ?? 0),
  };
};

/*
 * Compliance: what an employee's PPE matrix (section plus job title) requires against what they hold.
 * A required item is current when its latest issue is not yet due for renewal, expired when it is,
 * and missing when it was never issued.
 */
const complianceCte = (where: string) => `
  WITH emp AS (
    SELECT e.id, e."worksNumber" AS works_number, e."firstName" AS first_name, e."lastName" AS last_name,
           e."sectionId" AS section_id, e."jobTitleId" AS job_title_id, e."isActive", s.name AS section_name,
           COALESCE(jt.name, e."jobTitle") AS job_title
    FROM employees e
    JOIN sections s ON s.id = e."sectionId"
    LEFT JOIN job_titles jt ON jt.id = e."jobTitleId"
    ${where}
  ), req AS (
    SELECT emp.id AS employee_id, m.ppe_item_id FROM emp JOIN section_ppe_matrix m ON m.section_id = emp.section_id AND m.is_active
    UNION
    SELECT emp.id, j.ppe_item_id FROM emp JOIN job_title_ppe_matrix j ON j."jobTitleId" = emp.job_title_id AND j.is_active
  ), held AS (
    SELECT DISTINCT ON (a.employee_id, a.ppe_item_id) a.employee_id, a.ppe_item_id, ${DUE} AS due
    FROM allocations a
    JOIN ppe_items p ON p.id = a.ppe_item_id
    JOIN req r ON r.employee_id = a.employee_id AND r.ppe_item_id = a.ppe_item_id
    WHERE a.status IN ('active', 'expired')
    ORDER BY a.employee_id, a.ppe_item_id, a.issue_date DESC, a.created_at DESC
  ), per AS (
    SELECT emp.*,
           COUNT(r.ppe_item_id) AS required,
           COUNT(*) FILTER (WHERE h.due >= NOW()) AS current,
           COUNT(*) FILTER (WHERE r.ppe_item_id IS NOT NULL AND h.employee_id IS NULL) AS missing,
           COUNT(*) FILTER (WHERE h.due < NOW()) AS expired
    FROM emp
    LEFT JOIN req r ON r.employee_id = emp.id
    LEFT JOIN held h ON h.employee_id = r.employee_id AND h.ppe_item_id = r.ppe_item_id
    GROUP BY emp.id, emp.works_number, emp.first_name, emp.last_name, emp.section_id, emp.job_title_id, emp."isActive", emp.section_name, emp.job_title
  ), rated AS (
    SELECT per.*,
           CASE WHEN required = 0 THEN NULL ELSE ROUND(100.0 * current / required) END AS rate,
           CASE WHEN required = 0 THEN 'no-matrix' WHEN current = required THEN 'full' WHEN current = 0 THEN 'none' ELSE 'partial' END AS level
    FROM per
  )`;

const COMPLIANCE_SORT = {
  rate: 'rate :dir NULLS LAST',
  employee: 'last_name :dir, first_name :dir',
  missing: 'missing :dir',
  expired: 'expired :dir',
} as const;

export const compliance = async (auth: AuthContext, q: ComplianceQuery) => {
  const { parts, replacements } = employeeFilters(scopeOf(auth), q);
  parts.push('e."isActive" IS NOT FALSE');
  if (q.q) {
    parts.push(`(e."worksNumber" ILIKE :q OR concat(e."firstName", ' ', e."lastName") ILIKE :q)`);
    replacements.q = likeTerm(q.q);
  }
  const cte = complianceCte(`WHERE ${parts.join(' AND ')}`);
  const levelWhere = q.level ? 'WHERE level = :level' : '';
  const dir = q.order === 'desc' ? 'DESC' : 'ASC';
  // Worst first by default, so the people needing PPE are at the top
  const order = (q.sort ? COMPLIANCE_SORT[q.sort] : COMPLIANCE_SORT.rate).replaceAll(':dir', q.sort ? dir : 'ASC');
  const [rows, [summary]] = await Promise.all([
    select<Record<string, string | number | null>>(
      `${cte} SELECT * FROM rated ${levelWhere} ORDER BY ${order}, id LIMIT :limit OFFSET :offset`,
      { ...replacements, level: q.level, ...pageWindow(q) }
    ),
    select<Record<string, string | null>>(
      `${cte} SELECT COUNT(*) FILTER (WHERE ${q.level ? 'level = :level' : 'TRUE'}) AS total,
                     ROUND(AVG(rate)) AS average,
                     COUNT(*) FILTER (WHERE level = 'full') AS full,
                     COUNT(*) FILTER (WHERE level = 'partial') AS partial,
                     COUNT(*) FILTER (WHERE level = 'none') AS none,
                     COUNT(*) FILTER (WHERE level = 'no-matrix') AS no_matrix
              FROM rated`,
      { ...replacements, level: q.level }
    ),
  ]);
  return {
    rows: rows.map((r) => ({
      employee: {
        id: r.id as string,
        worksNumber: r.works_number as string,
        name: `${r.first_name} ${r.last_name}`.trim(),
        section: { id: r.section_id as string, name: r.section_name as string },
        jobTitle: (r.job_title as string | null) ?? null,
      },
      required: Number(r.required),
      current: Number(r.current),
      missing: Number(r.missing),
      expired: Number(r.expired),
      rate: r.rate === null ? null : Number(r.rate),
      level: r.level as 'full' | 'partial' | 'none' | 'no-matrix',
    })),
    count: Number(summary?.total ?? 0),
    summary: {
      averageRate: summary?.average === null || summary?.average === undefined ? null : Number(summary.average),
      full: Number(summary?.full ?? 0),
      partial: Number(summary?.partial ?? 0),
      none: Number(summary?.none ?? 0),
      noMatrix: Number(summary?.no_matrix ?? 0),
    },
  };
};

/**
 * Columns and people for the historical-issue spreadsheet: the PPE in the chosen employees' matrices
 * (section and job title) and the employees themselves, as v1's template offered.
 */
export const importTemplate = async (auth: AuthContext, q: TemplateQuery) => {
  const { parts, replacements } = employeeFilters(scopeOf(auth), q);
  parts.push('e."isActive" IS NOT FALSE');
  if (q.jobTitleId) (parts.push('e."jobTitleId" = :jobTitleId'), (replacements.jobTitleId = q.jobTitleId));
  const where = `WHERE ${parts.join(' AND ')}`;
  const [employees, items] = await Promise.all([
    select<{ works_number: string; first_name: string; last_name: string; section_name: string }>(
      `SELECT e."worksNumber" AS works_number, e."firstName" AS first_name, e."lastName" AS last_name, s.name AS section_name
       FROM employees e JOIN sections s ON s.id = e."sectionId" ${where}
       ORDER BY s.name, e."lastName", e."firstName" LIMIT 2000`,
      replacements
    ),
    select<{ name: string; item_code: string | null }>(
      `SELECT DISTINCT p.name, p.item_code FROM employees e
       JOIN sections s ON s.id = e."sectionId"
       JOIN LATERAL (
         SELECT m.ppe_item_id FROM section_ppe_matrix m WHERE m.section_id = e."sectionId" AND m.is_active
         UNION
         SELECT j.ppe_item_id FROM job_title_ppe_matrix j WHERE j."jobTitleId" = e."jobTitleId" AND j.is_active
       ) req ON TRUE
       JOIN ppe_items p ON p.id = req.ppe_item_id AND p.is_active IS NOT FALSE
       ${where}
       ORDER BY p.name`,
      replacements
    ),
  ]);
  return {
    employees: employees.map((e) => ({ worksNumber: e.works_number, firstName: e.first_name, lastName: e.last_name, section: e.section_name })),
    items: items.map((i) => ({ name: i.name, itemCode: i.item_code })),
  };
};
