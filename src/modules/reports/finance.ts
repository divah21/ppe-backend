import type { AuthContext } from '../../core/auth';
import { models } from '../../core/db';
import { employeeCosts } from '../budgets/suggested';
import { effectiveDepartment } from '../budgets/policy';
import { dashboardSummary } from '../dashboard/service';
import { scopeOf } from '../dashboard/scope';
import { listSpending } from '../valuation/spending';
import type { OverviewReportQuery, ProjectedCostReportQuery, SpendingReportQuery } from './schemas';
import { MAX_ROWS, capped, describe, generatedBy } from './service';
import { MONEY_FMT, type Column, type Sheet } from './xlsx';

const round2 = (n: number) => Math.round(n * 100) / 100;

const SPEND_SHEETS = [
  { groupBy: 'department', name: 'By department', heading: 'Department', detail: null },
  { groupBy: 'section', name: 'By section', heading: 'Section', detail: 'Department' },
  { groupBy: 'item', name: 'By item', heading: 'Item', detail: 'Item code' },
  { groupBy: 'employee', name: 'By employee', heading: 'Employee', detail: 'Works No.' },
  { groupBy: 'month', name: 'By month', heading: 'Month', detail: null },
] as const;

/** Actual spend on issued PPE, one sheet per grouping (v1 spending and budget tracking report). */
export const spendingReport = async (auth: AuthContext, q: SpendingReportQuery): Promise<Sheet[]> => {
  const scope = scopeOf(auth);
  const filters = { ...q, departmentId: effectiveDepartment(auth, q.departmentId) ?? undefined };
  const infoLines = await describe(auth, scope, q);
  const groups = await Promise.all(
    SPEND_SHEETS.map((s) =>
      listSpending(auth, { ...filters, groupBy: s.groupBy, page: 1, pageSize: MAX_ROWS, order: 'desc' }, { limit: MAX_ROWS + 1, offset: 0 })
    )
  );
  return SPEND_SHEETS.map((s, i) => {
    const rows = capped(groups[i]!.rows);
    const total = rows.reduce((sum, r) => sum + r.spent, 0);
    const columns: Column[] = [
      { header: s.heading, key: 'label', width: 30 },
      ...(s.detail ? [{ header: s.detail, key: 'detail', width: 22 }] : []),
      { header: 'Issues', key: 'issues', width: 10, align: 'right' as const },
      { header: 'Units', key: 'units', width: 10, align: 'right' as const },
      { header: 'People', key: 'people', width: 10, align: 'right' as const },
      { header: 'Spent (USD)', key: 'spent', width: 14, align: 'right' as const, numFmt: MONEY_FMT },
      { header: '% of total', key: 'share', width: 11, align: 'right' as const },
    ];
    return {
      name: s.name,
      title: `PPE Spend ${s.name}`,
      infoLines: [...infoLines, `Total spent: ${round2(total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} USD`],
      columns,
      rows: rows.map((r) => ({
        label: r.label,
        detail: r.sublabel ?? '',
        issues: r.allocationCount,
        units: r.quantity,
        people: r.employeeCount,
        spent: r.spent,
        share: total ? `${Math.round((r.spent / total) * 1000) / 10}%` : '',
      })),
      totalLabel: 'groups',
    };
  });
};

/** What each active employee's PPE should cost for a year according to the matrix (v1 projected cost report). */
export const projectedCostReport = async (auth: AuthContext, q: ProjectedCostReportQuery): Promise<Sheet[]> => {
  const dept = effectiveDepartment(auth, q.departmentId);
  const [all, catalogue, infoLines] = await Promise.all([
    employeeCosts(dept),
    models.PPEItem.findAll({ attributes: ['id', 'name', 'itemCode'] }),
    describe(auth, scopeOf(auth), q),
  ]);
  const costs = capped(q.sectionId ? all.filter((c) => c.sectionId === q.sectionId) : all);
  const names = new Map(catalogue.map((p) => [p.id as string, { name: p.name as string, itemCode: (p.itemCode as string | null) ?? '' }]));
  const total = costs.reduce((sum, c) => sum + c.cost, 0);
  const summary = [...infoLines, `Total: ${round2(total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} USD for ${costs.length} employees`];

  const byItem = new Map<string, { quantity: number; cost: number; people: number }>();
  for (const c of costs) {
    for (const i of c.items) {
      const row = byItem.get(i.ppeItemId) ?? { quantity: 0, cost: 0, people: 0 };
      row.quantity += i.quantity;
      row.cost += i.cost;
      row.people += 1;
      byItem.set(i.ppeItemId, row);
    }
  }

  return [
    {
      name: 'By employee',
      title: 'Projected Annual PPE Cost by Employee',
      infoLines: summary,
      columns: [
        { header: 'Works No.', key: 'worksNumber', width: 13 },
        { header: 'Employee', key: 'employee', width: 26 },
        { header: 'Section', key: 'section', width: 22 },
        { header: 'Job title', key: 'jobTitle', width: 24 },
        { header: 'Items', key: 'items', width: 8, align: 'right' },
        { header: 'Projected cost (USD)', key: 'cost', width: 18, align: 'right', numFmt: MONEY_FMT },
      ],
      rows: [...costs]
        .sort((a, b) => a.sectionName.localeCompare(b.sectionName) || a.name.localeCompare(b.name))
        .map((c) => ({
          worksNumber: c.worksNumber,
          employee: c.name,
          section: c.sectionName,
          jobTitle: c.jobTitle ?? '',
          items: c.items.length,
          cost: round2(c.cost),
        })),
      totalLabel: 'employees',
    },
    {
      name: 'By item',
      title: 'Projected Annual PPE Cost by Item',
      infoLines: summary,
      columns: [
        { header: 'Item', key: 'item', width: 30 },
        { header: 'Item code', key: 'itemCode', width: 14 },
        { header: 'People', key: 'people', width: 9, align: 'right' },
        { header: 'Quantity', key: 'quantity', width: 10, align: 'right' },
        { header: 'Projected cost (USD)', key: 'cost', width: 18, align: 'right', numFmt: MONEY_FMT },
      ],
      rows: [...byItem.entries()]
        .map(([id, r]) => ({ item: names.get(id)?.name ?? 'Unknown item', itemCode: names.get(id)?.itemCode ?? '', ...r, cost: round2(r.cost) }))
        .sort((a, b) => b.cost - a.cost || a.item.localeCompare(b.item)),
      totalLabel: 'items',
    },
  ];
};

const SPEND_HEADING = { department: 'Department', section: 'Section', category: 'Category' } as const;
const PERIOD_LABEL = { month: 'This month', quarter: 'This quarter', year: 'This year' } as const;

/** The dashboard's figures in a workbook (v1 overview summary report). */
export const overviewReport = async (auth: AuthContext, q: OverviewReportQuery): Promise<Sheet[]> => {
  const d = await dashboardSummary(auth, q);
  const k = d.kpis;
  const period = PERIOD_LABEL[q.period].toLowerCase();
  const figures: Array<[string, number | null]> = [
    ['Employees', k.employees],
    ['Requests awaiting my action', k.awaitingMyAction],
    ['Open requests', k.openRequests],
    [`Requests fulfilled ${period}`, k.fulfilledThisPeriod],
    [`Units issued ${period}`, k.issuedThisPeriod],
    [`Spent ${period} (USD)`, k.spendThisPeriod],
    ['Renewals due in the next 30 days', k.renewalsDue],
    ['Renewals overdue', k.renewalsOverdue],
    ['Low stock lines', k.lowStock],
    ['Out of stock lines', k.outOfStock],
    ['Stock value (USD)', k.stockValue],
    ...(k.budget
      ? ([
          [`Budget FY ${k.budget.fiscalYear} (USD)`, k.budget.allocated],
          [`Spent against budget FY ${k.budget.fiscalYear} (USD)`, k.budget.spent],
          ['Budget used (%)', k.budget.utilisationPercent],
        ] as Array<[string, number]>)
      : []),
  ];
  const infoLines = [
    `Scope: ${d.scope.name}`,
    `Period: ${PERIOD_LABEL[q.period]} (from ${d.period.start.slice(0, 10)})`,
    `Generated: ${new Date().toLocaleString('en-ZA')} by ${generatedBy(auth)}`,
  ];
  const sheets: Sheet[] = [
    {
      name: 'Summary',
      title: 'PPE Overview Summary',
      infoLines,
      columns: [
        { header: 'Figure', key: 'figure', width: 40 },
        { header: 'Value', key: 'value', width: 16, align: 'right' },
      ],
      rows: figures.filter(([, v]) => v !== null).map(([figure, value]) => ({ figure, value })),
      totalLabel: 'figures',
    },
    {
      name: 'Spend',
      title: `PPE Spend ${PERIOD_LABEL[q.period]}`,
      infoLines,
      columns: [
        { header: SPEND_HEADING[d.spendBreakdown.groupBy], key: 'name', width: 32 },
        { header: 'Spent (USD)', key: 'amount', width: 14, align: 'right', numFmt: MONEY_FMT },
      ],
      rows: d.spendBreakdown.rows.map((r) => ({ name: r.name, amount: r.amount })),
      totalLabel: 'groups',
    },
    {
      name: 'Renewals due',
      title: 'Next PPE Renewals',
      infoLines,
      columns: [
        { header: 'Works No.', key: 'worksNumber', width: 13 },
        { header: 'Employee', key: 'employee', width: 26 },
        { header: 'Item', key: 'item', width: 30 },
        { header: 'Due', key: 'due', width: 13 },
        { header: 'Days left', key: 'days', width: 10, align: 'right' },
      ],
      rows: d.renewalsDue.map((r) => ({ worksNumber: r.worksNumber, employee: r.employeeName, item: r.itemName, due: r.dueDate.slice(0, 10), days: r.daysLeft })),
      totalLabel: 'renewals',
    },
  ];
  if (d.lowStock) {
    sheets.push({
      name: 'Low stock',
      title: 'Lowest Stock Lines',
      infoLines,
      columns: [
        { header: 'Item', key: 'item', width: 30 },
        { header: 'Item code', key: 'itemCode', width: 14 },
        { header: 'Size', key: 'size', width: 9, align: 'center' },
        { header: 'On hand', key: 'quantity', width: 10, align: 'right' },
        { header: 'Minimum', key: 'minLevel', width: 10, align: 'right' },
      ],
      rows: d.lowStock.map((r) => ({ item: r.name, itemCode: r.itemCode ?? '', size: r.size ?? '', quantity: r.quantity, minLevel: r.minLevel })),
      totalLabel: 'lines',
    });
  }
  return sheets;
};
