import { QueryTypes } from 'sequelize';
import { ROLES, type AuthContext, type Role } from '../../core/auth';
import { sequelize } from '../../core/db';
import { badRequest } from '../../core/errors';
import { likeTerm } from '../../core/http';
import { COST_SQL, RENEWAL_SQL, REQUEST_DEPARTMENT, REQUEST_SECTION, filterSql, scopeOf, scopeSql, type Scope } from '../dashboard/scope';
import type {
  AllocationsReportQuery,
  EmployeesReportQuery,
  FailuresReportQuery,
  MatrixReportQuery,
  PpeCardsReportQuery,
  RequestsReportQuery,
  StockReportQuery,
} from './schemas';
import { DATE_FMT, MONEY_FMT, type Cell, type Column, type Sheet } from './xlsx';
import { ppeHeldSql } from '../employees/service';

/** Larger exports time out in the browser and in Excel; ask for narrower filters instead. */
export const MAX_ROWS = 50_000;

const WHOLE_MINE: readonly Role[] = [ROLES.ADMIN, ROLES.STORES, ROLES.SHEQ];
const MANAGERS: readonly Role[] = [...WHOLE_MINE, ROLES.HOD, ROLES.DEPARTMENT_REP];
// Section reps export their own section's issues, requests and PPE cards, as they could in v1
const ALL_ROLES: readonly Role[] = [...MANAGERS, ROLES.SECTION_REP];

export const REPORTS = [
  {
    key: 'allocations',
    title: 'Allocations',
    description: 'PPE issued to each employee with dates, sizes, renewals and cost.',
    filters: ['departmentId', 'sectionId', 'q', 'status', 'from', 'to'],
    roles: ALL_ROLES,
  },
  {
    key: 'requests',
    title: 'Requests',
    description: 'PPE requests with their items, status and who raised them.',
    filters: ['departmentId', 'sectionId', 'status', 'requestType', 'from', 'to'],
    roles: ALL_ROLES,
  },
  {
    key: 'stock',
    title: 'Stock',
    description: 'Stock on hand by item, size and location with value and low-stock flags.',
    filters: ['category', 'location', 'lowOnly'],
    roles: WHOLE_MINE,
  },
  {
    key: 'matrix',
    title: 'PPE matrix',
    description: 'Required PPE by job title and by section, one sheet each.',
    filters: ['departmentId', 'category'],
    roles: WHOLE_MINE,
  },
  {
    key: 'ppe-cards',
    title: 'Employee PPE cards',
    description: 'Each employee’s required PPE with last issue, next renewal and what is overdue.',
    filters: ['departmentId', 'sectionId', 'q'],
    roles: ALL_ROLES,
  },
  {
    key: 'employees',
    title: 'Employees',
    description: 'Employees with their section, job title, contact details and the PPE they hold.',
    filters: ['departmentId', 'sectionId', 'q', 'status'],
    roles: ALL_ROLES,
  },
  {
    key: 'failures',
    title: 'Failure reports',
    description: 'PPE failures with the employee, item, environment, brand, severity, SHEQ decision and outcome.',
    filters: ['departmentId', 'sectionId', 'q', 'status', 'severity', 'from', 'to'],
    roles: ALL_ROLES,
  },
] as const;

export type ReportKey = (typeof REPORTS)[number]['key'];

export const reportRoles = (key: ReportKey) => REPORTS.find((r) => r.key === key)!.roles as Role[];

export const listReports = (auth: AuthContext) =>
  REPORTS.filter((r) => r.roles.includes(auth.role)).map(({ roles: _roles, ...r }) => r);

const select = <T extends object>(sql: string, replacements: Record<string, unknown>) =>
  sequelize.query<T>(sql, { replacements, type: QueryTypes.SELECT });

const capped = <T>(rows: T[]) => {
  if (rows.length > MAX_ROWS) {
    throw badRequest(`This report has more than ${MAX_ROWS.toLocaleString('en-ZA')} rows. Narrow the filters and try again.`);
  }
  return rows;
};

const fullName = (first?: string | null, last?: string | null) => [first, last].filter(Boolean).join(' ') || 'Unknown';
const money = (v: unknown) => (v === null || v === undefined ? null : Math.round(Number(v) * 100) / 100);
const date = (v: Date | string | null) => (v ? new Date(v) : null);
const fmtDay = (d: string) => d.split('-').reverse().join('/');

const groupBy = <T, K>(items: T[], key: (item: T) => K) => {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const list = map.get(key(item));
    if (list) list.push(item);
    else map.set(key(item), [item]);
  }
  return map;
};

export const generatedBy = (auth: AuthContext) =>
  auth.user.employee ? fullName(auth.user.employee.firstName, auth.user.employee.lastName) : (auth.user.username as string);

/** Header lines describing the scope and filters, with names instead of ids. */
const describe = async (
  auth: AuthContext,
  scope: Scope,
  f: { departmentId?: string; sectionId?: string; from?: string; to?: string; extra?: string[] }
) => {
  const lines: string[] = [];
  // Names are looked up within the caller's scope, so a filter id from elsewhere never reveals one
  const inDepartment = scopeSql(scope, 'sec.id', 'd.id');
  const inSection = scopeSql(scope, 'sec.id', 'sec.department_id');
  const nameOf = async (table: 'departments' | 'sections', id: string) =>
    (
      await select<{ name: string }>(
        table === 'departments'
          ? `SELECT d.name FROM departments d LEFT JOIN sections sec ON sec.department_id = d.id WHERE d.id = :id AND ${inDepartment.sql} LIMIT 1`
          : `SELECT sec.name FROM sections sec WHERE sec.id = :id AND ${inSection.sql}`,
        { ...inDepartment.replacements, id }
      )
    )[0]?.name ?? 'Outside your scope';
  if (scope.kind !== 'mine') lines.push(`Scope: ${await nameOf(scope.kind === 'department' ? 'departments' : 'sections', scope.id)}`);
  if (f.departmentId) lines.push(`Department: ${await nameOf('departments', f.departmentId)}`);
  if (f.sectionId) lines.push(`Section: ${await nameOf('sections', f.sectionId)}`);
  if (f.from || f.to) lines.push(`Period: ${f.from ? fmtDay(f.from) : 'start'} to ${f.to ? fmtDay(f.to) : 'today'}`);
  lines.push(...(f.extra ?? []));
  lines.push(`Generated: ${new Date().toLocaleString('en-ZA')} by ${generatedBy(auth)}`);
  return lines;
};

/** Blanks repeated identity columns so each person's lines read as one group. */
const groupRows = (rows: Array<Record<string, Cell>>, groupKey: (i: number) => string, identity: string[]) => {
  let prev: string | null = null;
  rows.forEach((row, i) => {
    const key = groupKey(i);
    if (key === prev) for (const col of identity) row[col] = '';
    prev = key;
  });
  return rows;
};

const dateRangeSql = (column: string, q: { from?: string; to?: string }, parts: string[]) => {
  if (q.from) parts.push(`${column} >= CAST(:from AS date)`);
  if (q.to) parts.push(`${column} < CAST(:to AS date) + 1`);
};

// ---------------------------------------------------------------------------------------------

const ALLOCATION_COLUMNS: Column[] = [
  { header: 'Employee', key: 'employee', width: 26 },
  { header: 'Works No.', key: 'worksNumber', width: 13 },
  { header: 'Section', key: 'section', width: 22 },
  { header: 'Department', key: 'department', width: 22 },
  { header: 'Item', key: 'item', width: 30 },
  { header: 'Item code', key: 'itemCode', width: 14 },
  { header: 'Category', key: 'category', width: 16 },
  { header: 'Qty', key: 'quantity', width: 7, align: 'center' },
  { header: 'Size', key: 'size', width: 9, align: 'center' },
  { header: 'Status', key: 'status', width: 11, align: 'center' },
  { header: 'Date issued', key: 'issueDate', width: 13, numFmt: DATE_FMT },
  { header: 'Next renewal', key: 'renewal', width: 13, numFmt: DATE_FMT },
  { header: 'Unit cost', key: 'unitCost', width: 12, align: 'right', numFmt: MONEY_FMT },
  { header: 'Total cost', key: 'totalCost', width: 12, align: 'right', numFmt: MONEY_FMT },
];

export const allocationsReport = async (auth: AuthContext, q: AllocationsReportQuery): Promise<Sheet[]> => {
  const scope = scopeOf(auth);
  const f = filterSql(scope, q, 'sec.id', 'sec.department_id');
  const parts = [f.sql];
  if (q.employeeId) parts.push('e.id = :employeeId');
  if (q.status) parts.push('a.status::text = :status');
  if (q.ppeItemId) parts.push('a.ppe_item_id = :ppeItemId');
  // Same search as the Issued list: employee, works number, item name or code
  if (q.q) parts.push(`(e."firstName" || ' ' || e."lastName" ILIKE :term OR e."worksNumber" ILIKE :term OR p.name ILIKE :term OR p.item_code ILIKE :term)`);
  dateRangeSql('a.issue_date', q, parts);

  const rows = capped(
    await select<Record<string, any>>(
      `SELECT e.id AS employee_id, e."firstName" AS first_name, e."lastName" AS last_name, e."worksNumber" AS works_number,
              sec.name AS section, d.name AS department, p.name AS item, COALESCE(p.item_code, p.item_ref_code) AS item_code,
              p.category, a.quantity, a.size, a.status, a.issue_date, ${RENEWAL_SQL('a', 'p')} AS renewal,
              a.unit_cost, ${COST_SQL('a')} AS total_cost
       FROM allocations a
       JOIN employees e ON e.id = a.employee_id
       JOIN sections sec ON sec.id = e."sectionId"
       LEFT JOIN departments d ON d.id = sec.department_id
       LEFT JOIN ppe_items p ON p.id = a.ppe_item_id
       WHERE ${parts.join(' AND ')}
       ORDER BY e."firstName", e."lastName", e.id, a.issue_date DESC
       LIMIT :limit`,
      { ...f.replacements, ...q, term: q.q ? likeTerm(q.q) : null, limit: MAX_ROWS + 1 }
    )
  );

  const data = rows.map((r) => ({
    employee: fullName(r.first_name, r.last_name),
    worksNumber: r.works_number,
    section: r.section,
    department: r.department ?? '',
    item: r.item ?? 'Unknown item',
    itemCode: r.item_code ?? '',
    category: r.category ?? '',
    quantity: Number(r.quantity),
    size: r.size ?? '',
    status: r.status,
    issueDate: date(r.issue_date),
    renewal: date(r.renewal),
    unitCost: money(r.unit_cost),
    totalCost: money(r.total_cost),
  }));
  const total = data.reduce((s, r) => s + (r.totalCost ?? 0), 0);
  return [
    {
      name: 'Allocations',
      title: 'Employee Allocations Report',
      infoLines: await describe(auth, scope, { ...q, extra: q.status ? [`Status: ${q.status}`] : [] }),
      columns: ALLOCATION_COLUMNS,
      rows: groupRows(data, (i) => rows[i]!.employee_id, ['employee', 'worksNumber', 'section', 'department']),
      totalLabel: `Total allocations: ${data.length}   |   Total cost: ${total.toFixed(2)}`,
    },
  ];
};

// ---------------------------------------------------------------------------------------------

const REQUEST_COLUMNS: Column[] = [
  { header: 'Reference', key: 'reference', width: 11 },
  { header: 'Raised', key: 'createdAt', width: 13, numFmt: DATE_FMT },
  { header: 'Employee', key: 'employee', width: 26 },
  { header: 'Works No.', key: 'worksNumber', width: 13 },
  { header: 'Section', key: 'section', width: 22 },
  { header: 'Department', key: 'department', width: 22 },
  { header: 'Type', key: 'type', width: 13 },
  { header: 'Status', key: 'status', width: 18 },
  { header: 'Items', key: 'itemCount', width: 8, align: 'center' },
  { header: 'Item details', key: 'items', width: 50 },
  { header: 'Raised by', key: 'requestedBy', width: 18 },
  { header: 'Fulfilled', key: 'fulfilledDate', width: 13, numFmt: DATE_FMT },
  { header: 'Rejection reason', key: 'rejectionReason', width: 36 },
];

export const requestsReport = async (auth: AuthContext, q: RequestsReportQuery): Promise<Sheet[]> => {
  const scope = scopeOf(auth);
  const f = filterSql(scope, q, REQUEST_SECTION, REQUEST_DEPARTMENT);
  const parts = [f.sql];
  if (q.status) parts.push('r.status::text = :status');
  if (q.requestType) parts.push('r.request_type::text = :requestType');
  dateRangeSql('r.created_at', q, parts);

  const rows = capped(
    await select<Record<string, any>>(
      `SELECT r.id, r.created_at, r.status, r.request_type, r.fulfilled_date, r.rejection_reason,
              e."firstName" AS first_name, e."lastName" AS last_name, e."worksNumber" AS works_number,
              sec.name AS section, d.name AS department, u.username AS requested_by,
              (SELECT COALESCE(SUM(ri.quantity), 0) FROM request_items ri WHERE ri.request_id = r.id) AS item_count,
              (SELECT string_agg(COALESCE(p.name, 'Unknown item') || ' x' || ri.quantity
                        || COALESCE(' (' || NULLIF(ri.size, '') || ')', ''), '; ' ORDER BY p.name)
                 FROM request_items ri LEFT JOIN ppe_items p ON p.id = ri.ppe_item_id WHERE ri.request_id = r.id) AS items
       FROM requests r
       LEFT JOIN employees e ON e.id = r.employee_id
       LEFT JOIN sections sec ON sec.id = ${REQUEST_SECTION}
       LEFT JOIN departments d ON d.id = ${REQUEST_DEPARTMENT}
       LEFT JOIN users u ON u.id = r.requested_by_id
       WHERE ${parts.join(' AND ')}
       ORDER BY r.created_at DESC
       LIMIT :limit`,
      { ...f.replacements, ...q, limit: MAX_ROWS + 1 }
    )
  );

  const data = rows.map((r) => ({
    reference: String(r.id).slice(0, 8).toUpperCase(),
    createdAt: date(r.created_at),
    employee: r.first_name ? fullName(r.first_name, r.last_name) : 'Visitor / not linked',
    worksNumber: r.works_number ?? '',
    section: r.section ?? '',
    department: r.department ?? '',
    type: r.request_type ?? '',
    status: r.status,
    itemCount: Number(r.item_count),
    items: r.items ?? '',
    requestedBy: r.requested_by ?? '',
    fulfilledDate: date(r.fulfilled_date),
    rejectionReason: r.rejection_reason ?? '',
  }));
  const extra = [q.status && `Status: ${q.status}`, q.requestType && `Type: ${q.requestType}`].filter(Boolean) as string[];
  return [
    {
      name: 'Requests',
      title: 'PPE Requests Report',
      infoLines: await describe(auth, scope, { ...q, extra }),
      columns: REQUEST_COLUMNS,
      rows: data,
      totalLabel: `Total requests: ${data.length}`,
    },
  ];
};

// ---------------------------------------------------------------------------------------------

const STOCK_COLUMNS: Column[] = [
  { header: 'Item', key: 'item', width: 30 },
  { header: 'Item code', key: 'itemCode', width: 14 },
  { header: 'Category', key: 'category', width: 16 },
  { header: 'Size', key: 'size', width: 9, align: 'center' },
  { header: 'Colour', key: 'color', width: 10 },
  { header: 'Location', key: 'location', width: 16 },
  { header: 'Bin', key: 'bin', width: 10 },
  { header: 'On hand', key: 'quantity', width: 10, align: 'right' },
  { header: 'Min level', key: 'minLevel', width: 10, align: 'right' },
  { header: 'Status', key: 'status', width: 13, align: 'center' },
  { header: 'Unit price (USD)', key: 'unitPrice', width: 15, align: 'right', numFmt: MONEY_FMT },
  { header: 'Value (USD)', key: 'value', width: 14, align: 'right', numFmt: MONEY_FMT },
  { header: 'Last restocked', key: 'lastRestocked', width: 14, numFmt: DATE_FMT },
];

export const stockReport = async (auth: AuthContext, q: StockReportQuery): Promise<Sheet[]> => {
  const parts = ['TRUE'];
  if (q.category) parts.push('p.category = :category');
  if (q.location) parts.push('s.location ILIKE :locationTerm');
  if (q.lowOnly) parts.push('s.quantity <= COALESCE(s.min_level, 10)');

  const rows = capped(
    await select<Record<string, any>>(
      `SELECT p.name AS item, COALESCE(p.item_code, p.item_ref_code) AS item_code, p.category, s.size, s.color, s.location,
              s.bin_location, s.quantity, COALESCE(s.min_level, 10) AS min_level, s.unit_price_u_s_d AS unit_price,
              s.quantity * s.unit_price_u_s_d AS value, s.last_restocked
       FROM stocks s JOIN ppe_items p ON p.id = s.ppe_item_id
       WHERE ${parts.join(' AND ')}
       ORDER BY p.category NULLS LAST, p.name, s.size NULLS FIRST, s.location
       LIMIT :limit`,
      { category: q.category ?? null, locationTerm: q.location ? likeTerm(q.location) : null, limit: MAX_ROWS + 1 }
    )
  );

  const data = rows.map((r) => {
    const quantity = Number(r.quantity);
    const minLevel = Number(r.min_level);
    return {
      item: r.item,
      itemCode: r.item_code ?? '',
      category: r.category ?? '',
      size: r.size ?? '',
      color: r.color ?? '',
      location: r.location ?? '',
      bin: r.bin_location ?? '',
      quantity,
      minLevel,
      status: quantity === 0 ? 'Out of stock' : quantity <= minLevel ? 'Low' : 'OK',
      unitPrice: money(r.unit_price),
      value: money(r.value),
      lastRestocked: date(r.last_restocked),
    };
  });
  const units = data.reduce((s, r) => s + r.quantity, 0);
  const value = data.reduce((s, r) => s + (r.value ?? 0), 0);
  const extra = [
    q.category && `Category: ${q.category}`,
    q.location && `Location: ${q.location}`,
    q.lowOnly && 'Only low or out of stock',
  ].filter(Boolean) as string[];
  return [
    {
      name: 'Stock',
      title: 'Stock on Hand Report',
      infoLines: await describe(auth, { kind: 'mine' }, { extra }),
      columns: STOCK_COLUMNS,
      rows: data,
      totalLabel: `Stock lines: ${data.length}   |   Units: ${units}   |   Value (USD): ${value.toFixed(2)}`,
    },
  ];
};

// ---------------------------------------------------------------------------------------------

const MATRIX_ITEM_COLUMNS: Column[] = [
  { header: 'PPE item', key: 'item', width: 30 },
  { header: 'Item code', key: 'itemCode', width: 14 },
  { header: 'Category', key: 'category', width: 16 },
  { header: 'Qty required', key: 'quantity', width: 12, align: 'center' },
  { header: 'Replacement (months)', key: 'frequency', width: 20, align: 'center' },
  { header: 'Mandatory', key: 'mandatory', width: 11, align: 'center' },
];

const matrixRow = (r: Record<string, any>) => ({
  item: r.item,
  itemCode: r.item_code ?? '',
  category: r.category ?? '',
  quantity: Number(r.quantity_required),
  frequency: r.replacement_frequency === null ? '' : Number(r.replacement_frequency),
  mandatory: r.is_mandatory === false ? 'No' : 'Yes',
});

export const matrixReport = async (auth: AuthContext, q: MatrixReportQuery): Promise<Sheet[]> => {
  const replacements = { departmentId: q.departmentId ?? null, category: q.category ?? null, limit: MAX_ROWS + 1 };
  const category = `COALESCE(NULLIF(m.category, ''), p.category)`;
  const jobTitles = capped(
    await select<Record<string, any>>(
      `SELECT COALESCE(jt.name, m.job_title, 'Unassigned') AS job_title, sec.name AS section, d.name AS department,
              p.name AS item, COALESCE(p.item_code, p.item_ref_code) AS item_code, ${category} AS category,
              m.quantity_required, m.replacement_frequency, m.is_mandatory
       FROM job_title_ppe_matrix m
       JOIN ppe_items p ON p.id = m.ppe_item_id
       LEFT JOIN job_titles jt ON jt.id = m."jobTitleId"
       LEFT JOIN sections sec ON sec.id = jt."sectionId"
       LEFT JOIN departments d ON d.id = sec.department_id
       WHERE m.is_active IS NOT FALSE
         AND (CAST(:departmentId AS uuid) IS NULL OR sec.department_id = CAST(:departmentId AS uuid))
         AND (CAST(:category AS text) IS NULL OR ${category} = :category)
       ORDER BY 1, 6 NULLS LAST, p.name
       LIMIT :limit`,
      replacements
    )
  );
  const sections = capped(
    await select<Record<string, any>>(
      `SELECT sec.name AS section, d.name AS department, p.name AS item, COALESCE(p.item_code, p.item_ref_code) AS item_code,
              p.category, m.quantity_required, m.replacement_frequency, m.is_mandatory
       FROM section_ppe_matrix m
       JOIN ppe_items p ON p.id = m.ppe_item_id
       JOIN sections sec ON sec.id = m.section_id
       LEFT JOIN departments d ON d.id = sec.department_id
       WHERE m.is_active IS NOT FALSE
         AND (CAST(:departmentId AS uuid) IS NULL OR sec.department_id = CAST(:departmentId AS uuid))
         AND (CAST(:category AS text) IS NULL OR p.category = :category)
       ORDER BY d.name NULLS LAST, sec.name, p.category NULLS LAST, p.name
       LIMIT :limit`,
      replacements
    )
  );

  const info = await describe(auth, { kind: 'mine' }, { departmentId: q.departmentId, extra: q.category ? [`Category: ${q.category}`] : [] });
  const jtRows = jobTitles.map((r) => ({ jobTitle: r.job_title, section: r.section ?? '', department: r.department ?? '', ...matrixRow(r) }));
  const secRows = sections.map((r) => ({ section: r.section, department: r.department ?? '', ...matrixRow(r) }));
  return [
    {
      name: 'By job title',
      title: 'PPE Eligibility Matrix — By Job Title',
      infoLines: info,
      columns: [
        { header: 'Job title', key: 'jobTitle', width: 28 },
        { header: 'Section', key: 'section', width: 22 },
        { header: 'Department', key: 'department', width: 22 },
        ...MATRIX_ITEM_COLUMNS,
      ],
      rows: groupRows(jtRows, (i) => jobTitles[i]!.job_title + '|' + jobTitles[i]!.section, ['jobTitle', 'section', 'department']),
      totalLabel: `Total matrix entries: ${jtRows.length}`,
    },
    {
      name: 'By section',
      title: 'PPE Eligibility Matrix — By Section',
      infoLines: info,
      columns: [{ header: 'Section', key: 'section', width: 24 }, { header: 'Department', key: 'department', width: 22 }, ...MATRIX_ITEM_COLUMNS],
      rows: groupRows(secRows, (i) => sections[i]!.section, ['section', 'department']),
      totalLabel: `Total matrix entries: ${secRows.length}`,
    },
  ];
};

// ---------------------------------------------------------------------------------------------

const CARD_COLUMNS: Column[] = [
  { header: 'Employee', key: 'employee', width: 26 },
  { header: 'Works No.', key: 'worksNumber', width: 13 },
  { header: 'Section', key: 'section', width: 22 },
  { header: 'Department', key: 'department', width: 22 },
  { header: 'Job title', key: 'jobTitle', width: 22 },
  { header: 'PPE item', key: 'item', width: 30 },
  { header: 'Category', key: 'category', width: 16 },
  { header: 'Qty required', key: 'required', width: 12, align: 'center' },
  { header: 'Last issued', key: 'lastIssued', width: 13, numFmt: DATE_FMT },
  { header: 'Size', key: 'size', width: 9, align: 'center' },
  { header: 'Next renewal', key: 'renewal', width: 13, numFmt: DATE_FMT },
  { header: 'Status', key: 'status', width: 13, align: 'center' },
];

const DUE_SOON_DAYS = 30;
const MAX_EMPLOYEES = 10_000;

interface MatrixLine {
  ppe_item_id: string;
  item: string;
  category: string | null;
  quantity_required: number;
}

const cardStatus = (renewal: Date | null, issued: boolean) => {
  if (!issued) return 'Not issued';
  if (!renewal) return 'Issued';
  const days = (renewal.getTime() - Date.now()) / 86_400_000;
  return days < 0 ? 'Overdue' : days <= DUE_SOON_DAYS ? 'Due soon' : 'Issued';
};

/**
 * One card per employee: the PPE their matrix requires (section baseline, job title overrides, as
 * v1 validates requests) plus anything else they hold, with the latest issue and renewal of each.
 */
export const ppeCardsReport = async (auth: AuthContext, q: PpeCardsReportQuery): Promise<Sheet[]> => {
  const scope = scopeOf(auth);
  const f = filterSql(scope, q, 'sec.id', 'sec.department_id');
  const parts = [f.sql, 'e."isActive" IS NOT FALSE'];
  if (q.employeeId) parts.push('e.id = :employeeId');
  if (q.q) parts.push(`(e."firstName" || ' ' || e."lastName" ILIKE :term OR e."worksNumber" ILIKE :term)`);

  const employees = await select<Record<string, any>>(
    `SELECT e.id, e."firstName" AS first_name, e."lastName" AS last_name, e."worksNumber" AS works_number,
            e."sectionId" AS section_id, COALESCE(jt."ppeCategoryId", e."jobTitleId") AS matrix_job_title_id,
            COALESCE(jt.name, e."jobTitle") AS job_title, sec.name AS section, d.name AS department
     FROM employees e
     JOIN sections sec ON sec.id = e."sectionId"
     LEFT JOIN departments d ON d.id = sec.department_id
     LEFT JOIN job_titles jt ON jt.id = e."jobTitleId"
     WHERE ${parts.join(' AND ')}
     ORDER BY sec.name, e."firstName", e."lastName", e.id
     LIMIT :limit`,
    { ...f.replacements, ...q, term: q.q ? likeTerm(q.q) : null, limit: MAX_EMPLOYEES + 1 }
  );
  if (employees.length > MAX_EMPLOYEES) {
    throw badRequest(`More than ${MAX_EMPLOYEES.toLocaleString('en-ZA')} employees match. Choose a department or section.`);
  }

  const ids = employees.map((e) => e.id as string);
  const sectionIds = [...new Set(employees.map((e) => e.section_id as string))];
  const jobTitleIds = [...new Set(employees.map((e) => e.matrix_job_title_id as string | null).filter((x): x is string => !!x))];
  const none = ['00000000-0000-0000-0000-000000000000'];

  const [sectionLines, jobTitleLines, held] = await Promise.all([
    select<MatrixLine & { section_id: string }>(
      `SELECT m.section_id, m.ppe_item_id, p.name AS item, p.category, m.quantity_required
       FROM section_ppe_matrix m JOIN ppe_items p ON p.id = m.ppe_item_id
       WHERE m.is_active IS NOT FALSE AND m.section_id IN (:sectionIds)`,
      { sectionIds: sectionIds.length ? sectionIds : none }
    ),
    select<MatrixLine & { job_title_id: string }>(
      `SELECT m."jobTitleId" AS job_title_id, m.ppe_item_id, p.name AS item, COALESCE(NULLIF(m.category, ''), p.category) AS category,
              m.quantity_required
       FROM job_title_ppe_matrix m JOIN ppe_items p ON p.id = m.ppe_item_id
       WHERE m.is_active IS NOT FALSE AND m."jobTitleId" IN (:jobTitleIds)`,
      { jobTitleIds: jobTitleIds.length ? jobTitleIds : none }
    ),
    select<{ employee_id: string; ppe_item_id: string; item: string | null; category: string | null; issue_date: Date; size: string | null; renewal: Date | null }>(
      `SELECT DISTINCT ON (a.employee_id, a.ppe_item_id) a.employee_id, a.ppe_item_id, p.name AS item, p.category,
              a.issue_date, a.size, ${RENEWAL_SQL('a', 'p')} AS renewal
       FROM allocations a LEFT JOIN ppe_items p ON p.id = a.ppe_item_id
       WHERE a.status = 'active' AND a.employee_id = ANY(string_to_array(:ids, ',')::uuid[])
       ORDER BY a.employee_id, a.ppe_item_id, a.issue_date DESC`,
      // One array literal, not an IN list of up to 10k bound values
      { ids: ids.join(',') }
    ),
  ]);

  const bySection = groupBy(sectionLines, (l) => l.section_id);
  const byJobTitle = groupBy(jobTitleLines, (l) => l.job_title_id);
  const heldBy = groupBy(held, (h) => h.employee_id);

  const rows: Array<Record<string, Cell>> = [];
  const groups: string[] = [];
  const counts = { overdue: 0, due: 0, missing: 0 };
  for (const e of employees) {
    const required = new Map<string, MatrixLine>();
    for (const l of bySection.get(e.section_id) ?? []) required.set(l.ppe_item_id, l);
    for (const l of byJobTitle.get(e.matrix_job_title_id) ?? []) required.set(l.ppe_item_id, l);
    const holding = new Map((heldBy.get(e.id) ?? []).map((h) => [h.ppe_item_id, h]));

    const lines = [
      ...[...required.values()].map((l) => ({ id: l.ppe_item_id, item: l.item, category: l.category, required: Number(l.quantity_required) as Cell })),
      ...[...holding.values()]
        .filter((h) => !required.has(h.ppe_item_id))
        .map((h) => ({ id: h.ppe_item_id, item: h.item ?? 'Unknown item', category: h.category, required: 'Additional' as Cell })),
    ].sort((a, b) => (a.category ?? '').localeCompare(b.category ?? '') || a.item.localeCompare(b.item));

    const identity = {
      employee: fullName(e.first_name, e.last_name),
      worksNumber: e.works_number,
      section: e.section,
      department: e.department ?? '',
      jobTitle: e.job_title ?? '',
    };
    if (lines.length === 0) {
      rows.push({ ...identity, item: 'No PPE matrix defined', category: '', required: '', lastIssued: null, size: '', renewal: null, status: '' });
      groups.push(e.id);
      continue;
    }
    for (const line of lines) {
      const h = holding.get(line.id);
      const renewal = h ? date(h.renewal) : null;
      const status = cardStatus(renewal, !!h);
      if (status === 'Overdue') counts.overdue++;
      else if (status === 'Due soon') counts.due++;
      else if (status === 'Not issued') counts.missing++;
      rows.push({
        ...identity,
        item: line.item,
        category: line.category ?? '',
        required: line.required,
        lastIssued: h ? date(h.issue_date) : null,
        size: h?.size ?? '',
        renewal,
        status,
      });
      groups.push(e.id);
    }
  }
  capped(rows);

  return [
    {
      name: 'PPE cards',
      title: 'Employee PPE Cards',
      infoLines: await describe(auth, scope, q),
      columns: CARD_COLUMNS,
      rows: groupRows(rows, (i) => groups[i]!, ['employee', 'worksNumber', 'section', 'department', 'jobTitle']),
      totalLabel: `Employees: ${employees.length}   |   Overdue: ${counts.overdue}   |   Due within ${DUE_SOON_DAYS} days: ${counts.due}   |   Not issued: ${counts.missing}`,
    },
  ];
};

// ---------------------------------------------------------------------------------------------

/** Pickers for the report filters, limited to what the user may report on. */
export const reportOptions = async (auth: AuthContext) => {
  const scope = scopeOf(auth);
  const f = filterSql(scope, {}, 'sec.id', 'sec.department_id');
  const [departments, sections, categories, locations] = await Promise.all([
    select<{ id: string; name: string }>(
      `SELECT DISTINCT d.id, d.name FROM departments d JOIN sections sec ON sec.department_id = d.id
       WHERE ${f.sql} AND d.is_active IS NOT FALSE ORDER BY d.name`,
      f.replacements
    ),
    select<{ id: string; name: string; department_id: string }>(
      `SELECT sec.id, sec.name, sec.department_id FROM sections sec WHERE ${f.sql} AND sec.is_active IS NOT FALSE ORDER BY sec.name`,
      f.replacements
    ),
    WHOLE_MINE.includes(auth.role)
      ? select<{ category: string }>(`SELECT DISTINCT category FROM ppe_items WHERE category IS NOT NULL AND category <> '' ORDER BY category`, {})
      : Promise.resolve([]),
    WHOLE_MINE.includes(auth.role)
      ? select<{ location: string }>(`SELECT DISTINCT location FROM stocks WHERE location IS NOT NULL AND location <> '' ORDER BY location`, {})
      : Promise.resolve([]),
  ]);
  return {
    departments,
    sections: sections.map((s) => ({ id: s.id, name: s.name, departmentId: s.department_id })),
    categories: categories.map((c) => c.category),
    locations: locations.map((l) => l.location),
  };
};

// ---------------------------------------------------------------------------------------------

const EMPLOYEE_COLUMNS: Column[] = [
  { header: 'Works no.', key: 'worksNumber', width: 12 },
  { header: 'Employee', key: 'employee', width: 26 },
  { header: 'Section', key: 'section', width: 22 },
  { header: 'Department', key: 'department', width: 20 },
  { header: 'Job title', key: 'jobTitle', width: 22 },
  { header: 'Job type', key: 'jobType', width: 10 },
  { header: 'Gender', key: 'gender', width: 9 },
  { header: 'Email', key: 'email', width: 26 },
  { header: 'Phone', key: 'phone', width: 14 },
  { header: 'Date joined', key: 'joined', width: 13, numFmt: DATE_FMT },
  { header: 'Status', key: 'status', width: 10, align: 'center' },
  { header: 'PPE held', key: 'held', width: 10, align: 'right' },
];

/** The employee list, scoped as the Employees page is. */
export const employeesReport = async (auth: AuthContext, q: EmployeesReportQuery): Promise<Sheet[]> => {
  const scope = scopeOf(auth);
  const f = filterSql(scope, q, 'sec.id', 'sec.department_id');
  const parts = [f.sql];
  // The same filters as the Employees list, so an export is what the list shows
  if (q.status) parts.push(q.status === 'active' ? 'e."isActive"' : 'e."isActive" = FALSE');
  if (q.jobTitleId) parts.push('e."jobTitleId" = :jobTitleId');
  if (q.jobType) parts.push('UPPER(TRIM(e."jobType")) = UPPER(:jobType)');
  if (q.q) parts.push(`(e."firstName" || ' ' || e."lastName" ILIKE :term OR e."worksNumber" ILIKE :term)`);
  const rows = capped(
    await select<Record<string, any>>(
      `SELECT e."worksNumber" AS works_number, e."firstName" AS first_name, e."lastName" AS last_name, sec.name AS section,
              d.name AS department, COALESCE(jt.name, e."jobTitle") AS job_title, e."jobType" AS job_type, e.gender, e.email,
              e."phoneNumber" AS phone, e."dateJoined" AS joined, e."isActive" AS active,
              ${ppeHeldSql('e')} AS held
       FROM employees e
       JOIN sections sec ON sec.id = e."sectionId"
       LEFT JOIN departments d ON d.id = sec.department_id
       LEFT JOIN job_titles jt ON jt.id = e."jobTitleId"
       WHERE ${parts.join(' AND ')}
       ORDER BY sec.name, e."lastName", e."firstName"
       LIMIT :limit`,
      { ...f.replacements, jobTitleId: q.jobTitleId, jobType: q.jobType, term: q.q ? likeTerm(q.q) : null, limit: MAX_ROWS + 1 }
    )
  );
  const data = rows.map((r) => ({
    worksNumber: r.works_number,
    employee: fullName(r.first_name, r.last_name),
    section: r.section,
    department: r.department ?? '',
    jobTitle: r.job_title ?? '',
    jobType: r.job_type ?? '',
    gender: r.gender ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    joined: date(r.joined),
    status: r.active ? 'Active' : 'Inactive',
    held: Number(r.held),
  }));
  return [
    {
      name: 'Employees',
      title: 'Employees Report',
      infoLines: await describe(auth, scope, {
        ...q,
        extra: [q.status && `Status: ${q.status}`, q.jobType && `Job type: ${q.jobType}`].filter(Boolean) as string[],
      }),
      columns: EMPLOYEE_COLUMNS,
      rows: data,
      totalLabel: `Employees: ${data.length}   |   Active: ${data.filter((r) => r.status === 'Active').length}`,
    },
  ];
};

// ---------------------------------------------------------------------------------------------

const FAILURE_COLUMNS: Column[] = [
  { header: 'Reported', key: 'reported', width: 12, numFmt: DATE_FMT },
  { header: 'Failure date', key: 'failed', width: 12, numFmt: DATE_FMT },
  { header: 'Works no.', key: 'worksNumber', width: 12 },
  { header: 'Employee', key: 'employee', width: 24 },
  { header: 'Section', key: 'section', width: 20 },
  { header: 'Job title', key: 'jobTitle', width: 20 },
  { header: 'PPE item', key: 'item', width: 26 },
  { header: 'Date issued', key: 'issued', width: 12, numFmt: DATE_FMT },
  { header: 'Type', key: 'type', width: 10 },
  { header: 'Severity', key: 'severity', width: 10, align: 'center' },
  { header: 'Environment', key: 'environment', width: 18 },
  { header: 'Brand', key: 'brand', width: 14 },
  { header: 'Description', key: 'description', width: 40 },
  { header: 'SHEQ decision', key: 'decision', width: 30 },
  { header: 'Status', key: 'status', width: 16 },
  { header: 'Remarks', key: 'remarks', width: 30 },
];

/** Failure reports with everything v1's CSV carried, scoped as the failures page is. */
export const failuresReport = async (auth: AuthContext, q: FailuresReportQuery): Promise<Sheet[]> => {
  const scope = scopeOf(auth);
  const f = filterSql(scope, q, 'sec.id', 'sec.department_id');
  const parts = [f.sql];
  if (q.status) parts.push('fr.status::text = :status');
  if (q.severity) parts.push('fr.severity::text = :severity');
  if (q.failureType) parts.push('fr.failure_type::text = :failureType');
  if (q.observedAt) parts.push('fr.observed_at ILIKE :observedAt');
  if (q.brand) parts.push('fr.brand ILIKE :brand');
  if (q.q) parts.push(`(e."firstName" || ' ' || e."lastName" ILIKE :term OR e."worksNumber" ILIKE :term OR p.name ILIKE :term OR fr.description ILIKE :term)`);
  dateRangeSql('fr.reported_date', q, parts);
  const rows = capped(
    await select<Record<string, any>>(
      `SELECT fr.reported_date, fr.failure_date, e."worksNumber" AS works_number, e."firstName" AS first_name, e."lastName" AS last_name,
              sec.name AS section, COALESCE(jt.name, e."jobTitle") AS job_title, p.name AS item, a.issue_date,
              fr.failure_type, fr.severity, fr.observed_at, fr.brand, fr.description, fr.sheq_decision, fr.status, fr.remarks
       FROM failure_reports fr
       JOIN employees e ON e.id = fr.employee_id
       LEFT JOIN sections sec ON sec.id = e."sectionId"
       LEFT JOIN job_titles jt ON jt.id = e."jobTitleId"
       LEFT JOIN ppe_items p ON p.id = fr.ppe_item_id
       LEFT JOIN allocations a ON a.id = fr.allocation_id
       WHERE ${parts.join(' AND ')}
       ORDER BY fr.reported_date DESC
       LIMIT :limit`,
      {
        ...f.replacements,
        status: q.status,
        severity: q.severity,
        failureType: q.failureType,
        observedAt: q.observedAt ? likeTerm(q.observedAt) : null,
        brand: q.brand ? likeTerm(q.brand) : null,
        term: q.q ? likeTerm(q.q) : null,
        limit: MAX_ROWS + 1,
      }
    )
  );
  const data = rows.map((r) => ({
    reported: date(r.reported_date),
    failed: date(r.failure_date),
    worksNumber: r.works_number,
    employee: fullName(r.first_name, r.last_name),
    section: r.section ?? '',
    jobTitle: r.job_title ?? '',
    item: r.item ?? '',
    issued: date(r.issue_date),
    type: r.failure_type ?? '',
    severity: r.severity ?? '',
    environment: r.observed_at ?? '',
    brand: r.brand ?? '',
    description: r.description ?? '',
    decision: r.sheq_decision ?? '',
    status: r.status ?? '',
    remarks: r.remarks ?? '',
  }));
  return [
    {
      name: 'Failures',
      title: 'PPE Failure Reports',
      infoLines: await describe(auth, scope, {
        ...q,
        extra: [q.status && `Status: ${q.status}`, q.severity && `Severity: ${q.severity}`].filter(Boolean) as string[],
      }),
      columns: FAILURE_COLUMNS,
      rows: data,
      totalLabel: `Failure reports: ${data.length}`,
    },
  ];
};
