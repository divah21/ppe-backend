import { models } from '../src/core/db';
import type { createFixtures } from './helpers';

type Fx = ReturnType<typeof createFixtures>;

const DAY = 24 * 60 * 60 * 1000;
export const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

/** A fiscal year far from real data that no other company budget uses. */
export const freeFiscalYear = async () => {
  for (;;) {
    const year = 2040 + Math.floor(Math.random() * 60);
    if (!(await models.CompanyBudget.count({ where: { fiscalYear: year } }))) return year;
  }
};

/** A PPE item with one priced stock line, tagged so filters isolate it from other test data. */
export const pricedItem = async (fx: Fx, opts: { price: number; quantity: number; minLevel?: number; reorderPoint?: number }) => {
  const item = await fx.make('PPEItem', {
    name: `${fx.tag}-item-${Math.random().toString(36).slice(2, 7)}`,
    itemCode: `${fx.tag}-${Math.random().toString(36).slice(2, 7)}`,
    itemType: 'PPE',
    category: fx.tag,
    isActive: true,
  });
  const stock = await fx.make('Stock', {
    ppeItemId: item.id,
    quantity: opts.quantity,
    unitPriceUSD: opts.price,
    totalValueUSD: 0,
    stockAccount: fx.tag,
    location: `${fx.tag}-store`,
    minLevel: opts.minLevel ?? 0,
    reorderPoint: opts.reorderPoint ?? null,
  });
  return { item, stock };
};

export const allocate = (
  fx: Fx,
  values: { employeeId: string; ppeItemId: string; quantity: number; issueDate: Date; totalCost?: number | null; nextRenewalDate?: Date; status?: string }
) =>
  fx.make('Allocation', {
    status: 'active',
    allocationType: 'replacement',
    totalCost: null,
    replacementFrequency: null,
    ...values,
  });
