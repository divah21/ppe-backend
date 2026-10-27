import type { Row } from '../src/core/db';
import type { createFixtures } from './helpers';

type Fixtures = ReturnType<typeof createFixtures>;

/** PPE item, stock and allocation rows for failure report tests (zz- prefixed, cleaned up by fx). */
export const failureFixtures = (fx: Fixtures) => {
  let n = 0;
  const next = () => `${fx.tag}-${++n}`;

  const ppeItem = (extra: Record<string, unknown> = {}) =>
    fx.make('PPEItem', { name: `${fx.tag} item ${next()}`, itemCode: next(), replacementFrequency: 6, ...extra });

  const stock = (ppeItemId: string, quantity: number, extra: Record<string, unknown> = {}) =>
    fx.make('Stock', { ppeItemId, quantity, size: 'L', unitCost: 12.5, unitPriceUSD: 4.25, location: 'Main store', batchNumber: next(), ...extra });

  const allocation = (employee: Row, ppeItemId: string, stockId: string | null, extra: Record<string, unknown> = {}) =>
    fx.make('Allocation', {
      employeeId: employee.id,
      ppeItemId,
      stockId,
      quantity: 1,
      size: 'L',
      issueDate: new Date(),
      allocationType: 'annual',
      status: 'active',
      ...extra,
    });

  return { ppeItem, stock, allocation };
};
