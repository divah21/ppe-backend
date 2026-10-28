import { createFixtures } from './helpers';

type Fixtures = ReturnType<typeof createFixtures>;

export const monthsAgo = (months: number, days = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(d.getDate() - days);
  return d;
};

/** PPE items, stock rows and allocations on top of the shared zz- fixtures. */
export const allocationFixtures = (fx: Fixtures) => {
  let n = 0;
  const item = (extra: Record<string, unknown> = {}) =>
    fx.make('PPEItem', { name: `${fx.tag} item ${++n}`, itemCode: `${fx.tag}-I${n}`, itemType: 'PPE', replacementFrequency: 12, ...extra });

  const stock = (ppeItemId: string, quantity: number, extra: Record<string, unknown> = {}) =>
    fx.make('Stock', { ppeItemId, quantity, size: null, ...extra });

  const allocation = (employeeId: string, ppeItemId: string, extra: Record<string, unknown> = {}) =>
    fx.make('Allocation', { employeeId, ppeItemId, quantity: 1, issueDate: new Date(), status: 'active', ...extra });

  return { item, stock, allocation };
};
