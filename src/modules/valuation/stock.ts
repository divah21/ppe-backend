import { QueryTypes } from 'sequelize';
import { sequelize } from '../../core/db';
import { likeTerm, pageWindow } from '../../core/http';
import { money, round2 } from '../budgets/spend';
import type { LowStockQuery, StockFilters, StockListQuery } from './schemas';

/** Live value: quantity on hand x unit price (v1's stored total goes stale once stock is issued). */
const VALUE = `COALESCE(st.quantity * st.unit_price_u_s_d, st.total_value_u_s_d, 0)`;

const LOW = `((st.reorder_point IS NOT NULL AND st.quantity <= st.reorder_point)
  OR ((st.reorder_point IS NULL OR st.reorder_point = 0) AND st.min_level IS NOT NULL AND st.quantity <= st.min_level))`;

const filterSql = (f: StockFilters & { q?: string }) => {
  const parts: string[] = [];
  const replacements: Record<string, unknown> = {};
  if (f.category) {
    parts.push('COALESCE(i.category, :uncategorised) = :category');
    replacements.category = f.category;
    replacements.uncategorised = UNCATEGORISED;
  }
  if (f.itemType) {
    parts.push('i.item_type = :itemType');
    replacements.itemType = f.itemType;
  }
  if (f.stockAccount) {
    parts.push('COALESCE(st.stock_account, :unassigned) = :stockAccount');
    replacements.stockAccount = f.stockAccount;
    replacements.unassigned = UNASSIGNED;
  }
  if (f.q) {
    parts.push('(i.name ILIKE :q OR i.item_code ILIKE :q OR i.item_ref_code ILIKE :q)');
    replacements.q = likeTerm(f.q);
  }
  return { where: parts.length ? `WHERE ${parts.join(' AND ')}` : '', replacements };
};

export const UNCATEGORISED = 'Uncategorised';
export const UNASSIGNED = 'Unassigned';

interface StockRow {
  id: string;
  ppe_item_id: string;
  name: string;
  item_code: string | null;
  item_ref_code: string | null;
  category: string | null;
  item_type: string | null;
  unit: string | null;
  size: string | null;
  color: string | null;
  location: string | null;
  stock_account: string | null;
  quantity: number;
  unit_price: string | null;
  value: string;
  min_level: number | null;
  reorder_point: number | null;
  max_level: number | null;
}

const toLine = (r: StockRow) => ({
  stockId: r.id,
  ppeItemId: r.ppe_item_id,
  itemName: r.name,
  itemCode: r.item_code,
  itemRefCode: r.item_ref_code,
  category: r.category ?? UNCATEGORISED,
  itemType: r.item_type,
  unit: r.unit,
  size: r.size,
  color: r.color,
  location: r.location,
  stockAccount: r.stock_account,
  quantity: Number(r.quantity),
  unitPrice: money(r.unit_price),
  value: money(r.value),
});

const LINE_COLUMNS = `st.id, st.ppe_item_id, i.name, i.item_code, i.item_ref_code, i.category, i.item_type, i.unit,
  st.size, st.color, st.location, st.stock_account, st.quantity, st.unit_price_u_s_d AS unit_price, ${VALUE} AS value,
  st.min_level, st.reorder_point, st.max_level`;

const STOCK_SORT = { value: 'value', quantity: 'st.quantity', name: 'i.name', unitPrice: 'unit_price' } as const;

export const listStockValue = async (q: StockListQuery) => {
  const { where, replacements } = filterSql(q);
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';
  const order = q.sort ? `${STOCK_SORT[q.sort]} ${dir} NULLS LAST` : 'value DESC';
  const rows = await sequelize.query<StockRow>(
    `SELECT ${LINE_COLUMNS} FROM stocks st JOIN ppe_items i ON i.id = st.ppe_item_id ${where}
     ORDER BY ${order}, i.name ASC, st.id ASC LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements: { ...replacements, ...pageWindow(q) } }
  );
  const [c] = await sequelize.query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM stocks st JOIN ppe_items i ON i.id = st.ppe_item_id ${where}`,
    { type: QueryTypes.SELECT, replacements }
  );
  return { rows: rows.map(toLine), count: Number(c?.n ?? 0) };
};

interface GroupRow {
  key: string;
  value: string;
  quantity: string;
  lines: string;
}

const toGroup = (r: GroupRow) => ({ name: r.key, value: money(r.value), quantity: Number(r.quantity), lineCount: Number(r.lines) });

/** Totals plus value by category and by stock account, for the same filters as the list. */
export const stockValueSummary = async (f: StockFilters) => {
  const { where, replacements } = filterSql(f);
  const from = `FROM stocks st JOIN ppe_items i ON i.id = st.ppe_item_id ${where}`;
  const group = (key: string) =>
    sequelize.query<GroupRow>(
      `SELECT ${key} AS key, SUM(${VALUE}) AS value, SUM(st.quantity) AS quantity, COUNT(*) AS lines ${from}
       GROUP BY 1 ORDER BY value DESC, key ASC`,
      { type: QueryTypes.SELECT, replacements: { ...replacements, uncategorised: UNCATEGORISED, unassigned: UNASSIGNED } }
    );
  const [[totals], categories, accounts] = await Promise.all([
    sequelize.query<{ value: string; quantity: string; lines: string; items: string; low: string; empty: string }>(
      `SELECT COALESCE(SUM(${VALUE}), 0) AS value, COALESCE(SUM(st.quantity), 0) AS quantity, COUNT(*) AS lines,
              COUNT(DISTINCT st.ppe_item_id) AS items,
              COUNT(*) FILTER (WHERE ${LOW}) AS low, COUNT(*) FILTER (WHERE st.quantity <= 0) AS empty ${from}`,
      { type: QueryTypes.SELECT, replacements }
    ),
    group('COALESCE(i.category, :uncategorised)'),
    group('COALESCE(st.stock_account, :unassigned)'),
  ]);
  return {
    totalValue: money(totals?.value),
    totalQuantity: Number(totals?.quantity ?? 0),
    lineCount: Number(totals?.lines ?? 0),
    itemCount: Number(totals?.items ?? 0),
    lowStockCount: Number(totals?.low ?? 0),
    outOfStockCount: Number(totals?.empty ?? 0),
    byCategory: categories.map(toGroup),
    byStockAccount: accounts.map(toGroup),
  };
};

const LOW_SORT = { deficit: 'deficit', quantity: 'st.quantity', name: 'i.name' } as const;

export const listLowStock = async (q: LowStockQuery) => {
  const { where, replacements } = filterSql({ category: q.category, q: q.q });
  const cond = where ? `${where} AND ${LOW}` : `WHERE ${LOW}`;
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';
  const order = q.sort ? `${LOW_SORT[q.sort]} ${dir}` : 'st.quantity ASC';
  const rows = await sequelize.query<StockRow & { deficit: number }>(
    `SELECT ${LINE_COLUMNS}, COALESCE(NULLIF(st.reorder_point, 0), st.min_level) - st.quantity AS deficit
     FROM stocks st JOIN ppe_items i ON i.id = st.ppe_item_id ${cond}
     ORDER BY ${order}, i.name ASC, st.id ASC LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements: { ...replacements, ...pageWindow(q) } }
  );
  const [c] = await sequelize.query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM stocks st JOIN ppe_items i ON i.id = st.ppe_item_id ${cond}`,
    { type: QueryTypes.SELECT, replacements }
  );
  return {
    rows: rows.map((r) => ({
      ...toLine(r),
      reorderPoint: r.reorder_point || r.min_level,
      minLevel: r.min_level,
      maxLevel: r.max_level,
      deficit: Number(r.deficit),
      reorderValue: round2(Math.max(0, Number(r.deficit)) * money(r.unit_price)),
    })),
    count: Number(c?.n ?? 0),
  };
};

/** Values for the category and stock account filters. */
export const stockFilterOptions = async () => {
  const [categories, accounts] = await Promise.all([
    sequelize.query<{ v: string }>(
      `SELECT DISTINCT COALESCE(i.category, :u) AS v FROM stocks st JOIN ppe_items i ON i.id = st.ppe_item_id ORDER BY v`,
      { type: QueryTypes.SELECT, replacements: { u: UNCATEGORISED } }
    ),
    sequelize.query<{ v: string }>(`SELECT DISTINCT COALESCE(stock_account, :u) AS v FROM stocks ORDER BY v`, {
      type: QueryTypes.SELECT,
      replacements: { u: UNASSIGNED },
    }),
  ]);
  return { categories: categories.map((r) => r.v), stockAccounts: accounts.map((r) => r.v) };
};
