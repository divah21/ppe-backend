import { QueryTypes } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { sequelize } from '../../core/db';
import { pageWindow } from '../../core/http';
import { effectiveDepartment } from '../budgets/policy';
import { PRICE_CTE, allocationCost, allocationCostIsEstimated, money, nextDay, round2 } from '../budgets/spend';
import type { SpendingQuery, SpendingTotalsQuery } from './schemas';

/** Allocations in range and in the user's scope, each with what it cost. */
const base = (auth: AuthContext, f: SpendingTotalsQuery) => {
  const parts: string[] = [];
  const replacements: Record<string, unknown> = {};
  const dept = effectiveDepartment(auth, f.departmentId);
  if (dept) {
    parts.push('s.department_id = :dept');
    replacements.dept = dept;
  }
  if (f.sectionId) {
    parts.push('s.id = :sectionId');
    replacements.sectionId = f.sectionId;
  }
  if (f.from) {
    parts.push('a.issue_date >= :from');
    replacements.from = f.from;
  }
  if (f.to) {
    parts.push('a.issue_date < :toExclusive');
    replacements.toExclusive = nextDay(f.to);
  }
  const sql = `WITH ${PRICE_CTE}, base AS (
    SELECT a.id, a.quantity, a.employee_id, a.ppe_item_id, a.issue_date,
           s.id AS section_id, s.name AS section_name, d.id AS department_id, d.name AS department_name,
           i.name AS item_name, i.item_code, i.category,
           ${allocationCost()} AS cost, ${allocationCostIsEstimated()} AS estimated
    FROM allocations a
    JOIN employees e ON e.id = a.employee_id
    LEFT JOIN sections s ON s.id = e."sectionId"
    LEFT JOIN departments d ON d.id = s.department_id
    LEFT JOIN ppe_items i ON i.id = a.ppe_item_id
    LEFT JOIN price p ON p.ppe_item_id = a.ppe_item_id
    ${parts.length ? `WHERE ${parts.join(' AND ')}` : ''}
  )`;
  return { sql, replacements };
};

const GROUPS = {
  department: { key: 'department_id', label: `COALESCE(MAX(department_name), 'No department')`, sub: 'NULL' },
  section: { key: 'section_id', label: `COALESCE(MAX(section_name), 'No section')`, sub: 'MAX(department_name)' },
  item: { key: 'ppe_item_id', label: `COALESCE(MAX(item_name), 'Unknown item')`, sub: 'MAX(item_code)' },
  month: { key: `to_char(issue_date, 'YYYY-MM')`, label: `to_char(MIN(issue_date), 'Mon YYYY')`, sub: 'NULL' },
} as const;

const SORT = { spent: 'spent', label: 'label', allocationCount: 'allocations' } as const;

/** Actual PPE spend from issued allocations, grouped by department, section, item or month. */
export const listSpending = async (auth: AuthContext, q: SpendingQuery) => {
  const { sql, replacements } = base(auth, q);
  const g = GROUPS[q.groupBy];
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';
  const order = q.sort ? `${SORT[q.sort]} ${dir}` : q.groupBy === 'month' ? 'key ASC' : 'spent DESC';
  const rows = await sequelize.query<{
    key: string | null;
    label: string;
    sublabel: string | null;
    quantity: string;
    allocations: string;
    employees: string;
    spent: string;
  }>(
    `${sql}
     SELECT ${g.key} AS key, ${g.label} AS label, ${g.sub} AS sublabel, SUM(quantity) AS quantity,
            COUNT(*) AS allocations, COUNT(DISTINCT employee_id) AS employees, SUM(cost) AS spent
     FROM base GROUP BY 1 ORDER BY ${order}, label ASC, key ASC NULLS LAST LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements: { ...replacements, ...pageWindow(q) } }
  );
  const [c] = await sequelize.query<{ n: string }>(`${sql} SELECT COUNT(DISTINCT ${g.key}) + MAX(CASE WHEN ${g.key} IS NULL THEN 1 ELSE 0 END) AS n FROM base`, {
    type: QueryTypes.SELECT,
    replacements,
  });
  return {
    rows: rows.map((r) => ({
      key: r.key,
      label: r.label,
      sublabel: r.sublabel,
      quantity: Number(r.quantity),
      allocationCount: Number(r.allocations),
      employeeCount: Number(r.employees),
      spent: money(r.spent),
    })),
    count: Number(c?.n ?? 0),
  };
};

export const spendingTotals = async (auth: AuthContext, f: SpendingTotalsQuery) => {
  const { sql, replacements } = base(auth, f);
  const [r] = await sequelize.query<{ spent: string; allocations: string; employees: string; estimated: string; quantity: string }>(
    `${sql}
     SELECT COALESCE(SUM(cost), 0) AS spent, COUNT(*) AS allocations, COUNT(DISTINCT employee_id) AS employees,
            COUNT(*) FILTER (WHERE estimated) AS estimated, COALESCE(SUM(quantity), 0) AS quantity
     FROM base`,
    { type: QueryTypes.SELECT, replacements }
  );
  const spent = money(r?.spent);
  const allocations = Number(r?.allocations ?? 0);
  const employees = Number(r?.employees ?? 0);
  return {
    spent,
    allocationCount: allocations,
    employeeCount: employees,
    quantity: Number(r?.quantity ?? 0),
    estimatedCount: Number(r?.estimated ?? 0),
    avgPerEmployee: employees ? round2(spent / employees) : 0,
    avgPerAllocation: allocations ? round2(spent / allocations) : 0,
  };
};
