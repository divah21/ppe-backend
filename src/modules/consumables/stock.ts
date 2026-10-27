import type { Transaction } from 'sequelize';
import { models, sequelize, type Row } from '../../core/db';

/*
 * Consumable stock is NUMERIC(12,2) (kg, litres...), so quantities are handled as whole
 * cents in code and only turned back into decimals at the database boundary.
 */

export const toCents = (v: unknown) => Math.round(Number(v ?? 0) * 100);
export const fromCents = (cents: number) => (cents / 100).toFixed(2);
export const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

const Stock = models.ConsumableStock;
const q = (name: string) => sequelize.getQueryInterface().quoteIdentifier(name);
const col = (attr: string) => q(Stock.getAttributes()[attr]!.field!);
const TABLE = q(Stock.getTableName() as string);
const [ID, QTY, PRICE, PRICE_USD, VALUE, VALUE_USD, UPDATED] = [
  'id',
  'quantity',
  'unitPrice',
  'unitPriceUSD',
  'totalValue',
  'totalValueUSD',
  'updatedAt',
].map(col);

/**
 * Applies a signed change (in cents) only if the result stays >= 0, so concurrent issues
 * cannot oversell, and keeps the stored stock values in step. Returns the new quantity
 * in cents, or null when there is not enough stock (or the row is gone).
 */
export const changeConsumableStock = async (stockId: string, deltaCents: number, transaction: Transaction) => {
  if (!Number.isInteger(deltaCents)) throw new RangeError(`Invalid stock change: ${deltaCents}`);
  const next = `(${QTY} + CAST(:delta AS NUMERIC))`;
  const [rows] = await sequelize.query(
    `UPDATE ${TABLE}
     SET ${QTY} = ${next},
         ${VALUE} = ROUND(${next} * ${PRICE}, 2),
         ${VALUE_USD} = ROUND(${next} * ${PRICE_USD}, 2),
         ${UPDATED} = NOW()
     WHERE ${ID} = :stockId AND ${next} >= 0
     RETURNING ${QTY} AS quantity`,
    { replacements: { stockId, delta: fromCents(deltaCents) }, transaction }
  );
  const row = (rows as Array<{ quantity: string }>)[0];
  return row ? toCents(row.quantity) : null;
};

/**
 * The stock record for an item, locked for this transaction. v1 keeps one record per item;
 * if older data has several, the oldest is the one stores works from.
 */
export const lockStockRow = (consumableItemId: string, transaction: Transaction): Promise<Row | null> =>
  Stock.findOne({
    where: { consumableItemId },
    order: [['createdAt', 'ASC']],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
