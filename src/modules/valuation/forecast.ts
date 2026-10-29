import { QueryTypes } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { sequelize } from '../../core/db';
import { likeTerm, pageWindow } from '../../core/http';
import { awaitingRenewal, dueSql } from '../allocations/rules';
import { effectiveDepartment } from '../budgets/policy';
import { money, round2 } from '../budgets/spend';
import type { DemandQuery, ForecastQuery, ForecastSummaryQuery } from './schemas';

/*
 * Forecast (v1 /valuation/forecast-90-days): PPE that falls due for renewal within the next `days`
 * will need replacing, by the same rule as the renewals screen. Demand is counted per PPE item,
 * bucketed by when it falls due, compared with the stock on hand across all variants, and charged
 * to the department the employee is in now.
 */
const forecastSql = (auth: AuthContext, f: ForecastSummaryQuery) => {
  const dept = effectiveDepartment(auth, f.departmentId);
  const sql = `WITH stock AS (
      SELECT ppe_item_id, SUM(quantity) AS qty, AVG(unit_price_u_s_d) AS price FROM stocks GROUP BY ppe_item_id
    ),
    renewing AS (
      SELECT a.ppe_item_id, a.quantity, ${dueSql('a', 'p')} AS due_on
      FROM allocations a
      JOIN ppe_items p ON p.id = a.ppe_item_id
      JOIN employees e ON e.id = a.employee_id
      LEFT JOIN sections s ON s.id = e."sectionId"
      WHERE ${awaitingRenewal('a', 'e')}
      ${dept ? 'AND s.department_id = :dept' : ''}
    ),
    due AS (
      SELECT ppe_item_id, quantity, due_on - now() AS left_
      FROM renewing
      WHERE due_on >= now() AND due_on <= now() + make_interval(days => :days)
    ),
    per_item AS (
      SELECT i.id, i.name, i.item_code, i.category,
        SUM(d.quantity) AS required,
        COALESCE(SUM(d.quantity) FILTER (WHERE d.left_ <= interval '30 days'), 0) AS d30,
        COALESCE(SUM(d.quantity) FILTER (WHERE d.left_ > interval '30 days' AND d.left_ <= interval '60 days'), 0) AS d60,
        COALESCE(SUM(d.quantity) FILTER (WHERE d.left_ > interval '60 days' AND d.left_ <= interval '90 days'), 0) AS d90,
        COALESCE(SUM(d.quantity) FILTER (WHERE d.left_ > interval '90 days' AND d.left_ <= interval '180 days'), 0) AS d180,
        COALESCE(SUM(d.quantity) FILTER (WHERE d.left_ > interval '180 days'), 0) AS d365,
        COALESCE(MAX(st.qty), 0) AS current_stock,
        GREATEST(0, SUM(d.quantity) - COALESCE(MAX(st.qty), 0)) AS shortage,
        MAX(st.price) AS price
      FROM due d
      JOIN ppe_items i ON i.id = d.ppe_item_id
      LEFT JOIN stock st ON st.ppe_item_id = i.id
      GROUP BY i.id
    )`;
  return { sql, replacements: { days: f.days, dept } };
};

const SORT = { shortage: 'shortage', required: 'required', name: 'name' } as const;

interface ForecastRow {
  id: string;
  name: string;
  item_code: string | null;
  category: string | null;
  required: string;
  d30: string;
  d60: string;
  d90: string;
  d180: string;
  d365: string;
  current_stock: string;
  shortage: string;
  price: string | null;
}

export const listForecast = async (auth: AuthContext, q: ForecastQuery, { count = true } = {}) => {
  const { sql, replacements } = forecastSql(auth, q);
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';
  const order = q.sort ? `${SORT[q.sort]} ${dir}` : 'shortage DESC, required DESC';
  const search = q.q ? 'WHERE name ILIKE :q OR item_code ILIKE :q' : '';
  const term = q.q ? likeTerm(q.q) : undefined;
  const rows = await sequelize.query<ForecastRow>(
    `${sql} SELECT * FROM per_item ${search} ORDER BY ${order}, name ASC, id ASC LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements: { ...replacements, q: term, ...pageWindow(q) } }
  );
  // The count re-runs the whole forecast; callers that only show the top rows skip it
  const [c] = count
    ? await sequelize.query<{ n: string }>(`${sql} SELECT COUNT(*) AS n FROM per_item ${search}`, {
        type: QueryTypes.SELECT,
        replacements: { ...replacements, q: term },
      })
    : [{ n: String(rows.length) }];
  const months = q.days / 30;
  return {
    rows: rows.map((r) => {
      const required = Number(r.required);
      const shortage = Number(r.shortage);
      return {
        ppeItemId: r.id,
        itemName: r.name,
        itemCode: r.item_code,
        category: r.category,
        required,
        dueIn30: Number(r.d30),
        dueIn31To60: Number(r.d60),
        dueIn61To90: Number(r.d90),
        dueIn91To180: Number(r.d180),
        dueIn181To365: Number(r.d365),
        currentStock: Number(r.current_stock),
        shortage,
        avgMonthly: Math.round(required / months),
        unitPrice: money(r.price),
        shortageValue: round2(shortage * money(r.price)),
      };
    }),
    count: Number(c?.n ?? 0),
  };
};

export const forecastSummary = async (auth: AuthContext, f: ForecastSummaryQuery) => {
  const { sql, replacements } = forecastSql(auth, f);
  const [r] = await sequelize.query<Record<string, string | null>>(
    `${sql} SELECT COUNT(*) AS items, COALESCE(SUM(required), 0) AS required, COALESCE(SUM(shortage), 0) AS shortage,
       COUNT(*) FILTER (WHERE shortage > 0) AS short_items, COALESCE(SUM(shortage * COALESCE(price, 0)), 0) AS shortage_value,
       COALESCE(SUM(d30), 0) AS d30, COALESCE(SUM(d60), 0) AS d60, COALESCE(SUM(d90), 0) AS d90,
       COALESCE(SUM(d180), 0) AS d180, COALESCE(SUM(d365), 0) AS d365
     FROM per_item`,
    { type: QueryTypes.SELECT, replacements }
  );
  const n = (k: string) => Number(r?.[k] ?? 0);
  const buckets = [
    { label: '0–30 days', maxDays: 30, quantity: n('d30') },
    { label: '31–60 days', maxDays: 60, quantity: n('d60') },
    { label: '61–90 days', maxDays: 90, quantity: n('d90') },
    { label: '91–180 days', maxDays: 180, quantity: n('d180') },
    { label: '181–365 days', maxDays: 365, quantity: n('d365') },
  ].filter((_, i, all) => i === 0 || all[i - 1]!.maxDays < f.days);
  return {
    days: f.days,
    itemCount: n('items'),
    totalRequired: n('required'),
    totalShortage: n('shortage'),
    itemsWithShortage: n('short_items'),
    shortageValue: money(r?.shortage_value),
    buckets,
  };
};

/* ---------------------------------------------------------------- demand analytics */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * v1 /valuation/analytics/demand-forecast: issue history per item over the last `months`
 * (30-day months, as v1), a trend-adjusted monthly prediction and a 3-month + 20% stock target.
 */
export const listDemand = async (auth: AuthContext, q: DemandQuery) => {
  const dept = effectiveDepartment(auth, q.departmentId);
  const end = new Date();
  const start = new Date(end.getTime() - q.months * 30 * DAY_MS);
  const replacements = { start, end, dept };
  const deptJoin = `JOIN employees e ON e.id = x.employee_id LEFT JOIN sections s ON s.id = e."sectionId"`;
  const deptWhere = dept ? 'AND s.department_id = :dept' : '';

  const [issued, failures, stock] = await Promise.all([
    sequelize.query<{ ppe_item_id: string; month: string; qty: string; n: string; active: string; expired: string }>(
      `SELECT x.ppe_item_id, to_char(x.created_at, 'YYYY-MM') AS month, SUM(x.quantity) AS qty, COUNT(*) AS n,
              COUNT(*) FILTER (WHERE x.status = 'active') AS active, COUNT(*) FILTER (WHERE x.status = 'expired') AS expired
       FROM allocations x ${deptJoin}
       WHERE x.created_at >= :start AND x.created_at <= :end AND x.status IN ('active', 'expired', 'returned') ${deptWhere}
       GROUP BY 1, 2`,
      { type: QueryTypes.SELECT, replacements }
    ),
    sequelize.query<{ ppe_item_id: string; n: string }>(
      `SELECT x.ppe_item_id, COUNT(*) AS n FROM failure_reports x ${deptJoin}
       WHERE x.reported_date >= :start AND x.reported_date <= :end ${deptWhere} GROUP BY 1`,
      { type: QueryTypes.SELECT, replacements }
    ),
    sequelize.query<{ ppe_item_id: string; qty: string; name: string; item_code: string | null; category: string | null }>(
      `SELECT i.id AS ppe_item_id, COALESCE(SUM(st.quantity), 0) AS qty, i.name, i.item_code, i.category
       FROM ppe_items i LEFT JOIN stocks st ON st.ppe_item_id = i.id GROUP BY i.id`,
      { type: QueryTypes.SELECT }
    ),
  ]);

  const items = new Map(stock.map((s) => [s.ppe_item_id, s]));
  const failuresBy = new Map(failures.map((f) => [f.ppe_item_id, Number(f.n)]));
  const byItem = new Map<string, { months: Map<string, number>; qty: number; n: number; active: number; expired: number }>();
  for (const r of issued) {
    const cur = byItem.get(r.ppe_item_id) ?? { months: new Map(), qty: 0, n: 0, active: 0, expired: 0 };
    cur.months.set(r.month, Number(r.qty));
    cur.qty += Number(r.qty);
    cur.n += Number(r.n);
    cur.active += Number(r.active);
    cur.expired += Number(r.expired);
    byItem.set(r.ppe_item_id, cur);
  }

  let rows = [...byItem.entries()].map(([id, d]) => {
    const item = items.get(id);
    const avgMonthly = Math.round(d.qty / q.months);
    const keys = [...d.months.keys()].sort();
    let predicted = avgMonthly;
    if (keys.length >= 3) {
      const recent = keys.slice(-3).map((k) => d.months.get(k)!);
      const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
      const growth = recent[0]! > 0 ? (recent[2]! - recent[0]!) / recent[0]! : 0;
      predicted = Math.max(0, Math.round(avgRecent * (1 + growth)));
    }
    const recommended = Math.round(predicted * 3 * 1.2);
    const currentStock = Number(item?.qty ?? 0);
    const failureCount = failuresBy.get(id) ?? 0;
    return {
      ppeItemId: id,
      itemName: item?.name ?? 'Unknown item',
      itemCode: item?.item_code ?? null,
      category: item?.category ?? null,
      allocationCount: d.n,
      activeAllocations: d.active,
      expiredAllocations: d.expired,
      quantityIssued: d.qty,
      failureCount,
      failureRate: d.n ? round2((failureCount / d.n) * 100) : 0,
      avgMonthlyDemand: avgMonthly,
      predictedMonthlyDemand: predicted,
      recommendedStockLevel: recommended,
      currentStock,
      shortfall: Math.max(0, recommended - currentStock),
      stockStatus: currentStock < recommended ? ('low' as const) : ('adequate' as const),
    };
  });

  if (q.q) {
    const term = q.q.toLowerCase();
    rows = rows.filter((r) => r.itemName.toLowerCase().includes(term) || r.itemCode?.toLowerCase().includes(term));
  }
  const key = { predicted: 'predictedMonthlyDemand', issued: 'quantityIssued', shortfall: 'shortfall', name: 'itemName' } as const;
  const sortKey = key[q.sort ?? 'predicted'];
  const sign = q.sort ? (q.order === 'asc' ? 1 : -1) : -1;
  rows.sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const c = typeof av === 'string' ? av.localeCompare(String(bv)) : Number(av) - Number(bv);
    return sign * c || a.itemName.localeCompare(b.itemName);
  });
  const { limit, offset } = pageWindow(q);
  return { rows: rows.slice(offset, offset + limit), count: rows.length };
};
