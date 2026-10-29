import type { AuthContext } from '../../core/auth';
import type { DepartmentBudgetQuery } from './schemas';
import { budgetSummary } from './service';

type Row = Awaited<ReturnType<typeof budgetSummary>>['departments'][number];

// Same thresholds as the utilisation badge on screen
const standingOf = (d: Row) =>
  d.allocated <= 0 ? 'no-budget' : d.utilisationPercent > 100 ? 'over' : d.utilisationPercent >= 90 ? 'nearly-spent' : 'on-track';

const SORT: Record<NonNullable<DepartmentBudgetQuery['sort']>, (a: Row, b: Row) => number> = {
  department: (a, b) => a.departmentName.localeCompare(b.departmentName),
  allocated: (a, b) => a.allocated - b.allocated,
  spent: (a, b) => a.spent - b.spent,
  remaining: (a, b) => a.remaining - b.remaining,
  utilisation: (a, b) => a.utilisationPercent - b.utilisationPercent,
};

/** Each department's allocation against spend for the year, as a searchable, sortable page. */
export const departmentBudgets = async (auth: AuthContext, q: DepartmentBudgetQuery) => {
  const { departments } = await budgetSummary(auth, q.fiscalYear);
  const needle = q.q?.toLowerCase();
  const rows = departments
    .map((d) => ({ ...d, standing: standingOf(d) }))
    .filter((d) => (!needle || d.departmentName.toLowerCase().includes(needle)) && (!q.standing || d.standing === q.standing));
  if (q.sort) {
    const cmp = SORT[q.sort];
    rows.sort((a, b) => (q.order === 'asc' ? cmp(a, b) : cmp(b, a)) || a.departmentName.localeCompare(b.departmentName));
  }
  const start = (q.page - 1) * q.pageSize;
  return { rows: rows.slice(start, start + q.pageSize), total: rows.length };
};
