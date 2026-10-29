import { QueryTypes, type Transaction } from 'sequelize';
import { sequelize } from '../../core/db';

/**
 * Average known unit price per PPE item, used when an allocation carries no cost (as v1's
 * actual-spending report does).
 */
export const PRICE_CTE = `price AS (
  SELECT ppe_item_id, AVG(unit_price_u_s_d) AS avg_price
  FROM stocks WHERE unit_price_u_s_d IS NOT NULL GROUP BY ppe_item_id
)`;

/** What an allocation cost: its recorded total, else quantity x unit cost, else quantity x average stock price. */
export const allocationCost = (a = 'a', p = 'p') =>
  `COALESCE(NULLIF(${a}.total_cost, 0), NULLIF(${a}.unit_cost, 0) * ${a}.quantity, ${p}.avg_price * ${a}.quantity, 0)`;

export const allocationCostIsEstimated = (a = 'a') => `(NULLIF(${a}.total_cost, 0) IS NULL AND NULLIF(${a}.unit_cost, 0) IS NULL)`;

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const money = (v: unknown) => round2(Number(v ?? 0) || 0);
export const percent = (part: number, whole: number) => (whole > 0 ? round2((part / whole) * 100) : 0);

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d = 1) => `${y}-${pad(m)}-${pad(d)}`;

/** Adds one day to a YYYY-MM-DD date. */
export const nextDay = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export const prevDay = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

export type Period = 'annual' | 'half-year' | 'quarterly' | 'monthly';

/** [start, endExclusive) of a budget period, as YYYY-MM-DD dates. */
export const periodRange = (b: {
  fiscalYear: number;
  period?: Period | null;
  quarter?: number | null;
  month?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}): { start: string; end: string } => {
  if (b.startDate && b.endDate) return { start: b.startDate, end: nextDay(b.endDate) };
  const y = b.fiscalYear;
  if (b.period === 'quarterly' && b.quarter) {
    const m = (b.quarter - 1) * 3 + 1;
    return { start: iso(y, m), end: b.quarter === 4 ? iso(y + 1, 1) : iso(y, m + 3) };
  }
  if (b.period === 'monthly' && b.month) {
    return { start: iso(y, b.month), end: b.month === 12 ? iso(y + 1, 1) : iso(y, b.month + 1) };
  }
  return { start: iso(y, 1), end: iso(y + 1, 1) };
};

export interface SpendTarget {
  id: string;
  departmentId: string;
  sectionId: string | null;
  start: string;
  end: string;
}

/**
 * Spend per budget: allocations issued in the budget's period under its department (or its
 * section, for section budgets), as recorded at issue, so a transfer does not move past spend.
 * One query for the whole page.
 */
export const spendByBudget = async (targets: SpendTarget[], transaction?: Transaction) => {
  const out = new Map<string, { spent: number; allocationCount: number }>();
  if (!targets.length) return out;
  const rows = await sequelize.query<{ id: string; spent: string; n: string }>(
    `WITH ${PRICE_CTE},
     r AS (
       SELECT * FROM unnest(ARRAY[:ids]::uuid[], ARRAY[:depts]::uuid[], ARRAY[:secs]::uuid[], ARRAY[:starts]::date[], ARRAY[:ends]::date[])
         AS r(id, department_id, section_id, start_on, end_before)
     )
     SELECT r.id, COALESCE(SUM(${allocationCost()}), 0) AS spent, COUNT(a.id) AS n
     FROM r
     LEFT JOIN allocations a ON a.issue_date >= r.start_on AND a.issue_date < r.end_before
       AND (a.section_id = r.section_id OR (r.section_id IS NULL AND a.department_id = r.department_id))
     LEFT JOIN price p ON p.ppe_item_id = a.ppe_item_id
     GROUP BY r.id`,
    {
      type: QueryTypes.SELECT,
      transaction,
      replacements: {
        ids: targets.map((t) => t.id),
        depts: targets.map((t) => t.departmentId),
        secs: targets.map((t) => t.sectionId),
        starts: targets.map((t) => t.start),
        ends: targets.map((t) => t.end),
      },
    }
  );
  for (const r of rows) out.set(r.id, { spent: money(r.spent), allocationCount: Number(r.n) });
  return out;
};

/** Spend per department for a date range, optionally limited to one department. */
export const spendByDepartment = async (range: { start: string; end: string }, departmentId: string | null) => {
  const rows = await sequelize.query<{ department_id: string; spent: string; n: string }>(
    `WITH ${PRICE_CTE}
     SELECT a.department_id, COALESCE(SUM(${allocationCost()}), 0) AS spent, COUNT(a.id) AS n
     FROM allocations a
     LEFT JOIN price p ON p.ppe_item_id = a.ppe_item_id
     WHERE a.issue_date >= :start AND a.issue_date < :end AND a.department_id IS NOT NULL
       ${departmentId ? 'AND a.department_id = :departmentId' : ''}
     GROUP BY a.department_id`,
    { type: QueryTypes.SELECT, replacements: { ...range, departmentId } }
  );
  return new Map(rows.map((r) => [r.department_id, { spent: money(r.spent), allocationCount: Number(r.n) }]));
};

/** Mine-wide spend for a date range (every allocation, as v1 counts it). */
export const totalSpend = async (range: { start: string; end: string }, transaction?: Transaction) => {
  const [row] = await sequelize.query<{ spent: string; n: string }>(
    `WITH ${PRICE_CTE}
     SELECT COALESCE(SUM(${allocationCost()}), 0) AS spent, COUNT(a.id) AS n
     FROM allocations a LEFT JOIN price p ON p.ppe_item_id = a.ppe_item_id
     WHERE a.issue_date >= :start AND a.issue_date < :end`,
    { type: QueryTypes.SELECT, transaction, replacements: range }
  );
  return { spent: money(row?.spent), allocationCount: Number(row?.n ?? 0) };
};
