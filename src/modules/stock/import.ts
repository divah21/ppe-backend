import { Op, fn, col, where as sqlWhere, type Transaction, type WhereOptions } from 'sequelize';
import { inTransaction, models, type Row } from '../../core/db';
import type { StockImportInput } from './schemas';

/** Thrown to roll back a dry run once every row has been checked. */
class DryRun extends Error {}

export interface StockImportIssue {
  row: number;
  item: string;
  message: string;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Same line as the stock screen treats as one: item, size, gender, colour and location. */
const sameLine = (ppeItemId: string, r: { size: string | null; gender: string | null; color: string | null; location: string }): WhereOptions => ({
  ppeItemId,
  size: r.size ?? { [Op.is]: null },
  gender: r.gender ?? { [Op.is]: null },
  color: r.color ?? { [Op.is]: null },
  [Op.and]: [sqlWhere(fn('lower', col('location')), r.location.toLowerCase())],
});

/**
 * Receives stock from a spreadsheet (v1 bulk upload). Rows match catalogue items by code, then by
 * name. A row for a line that already exists adds to it, or with updateExisting replaces its
 * quantity and price. With dryRun everything is checked and rolled back.
 */
export const importStock = async (input: StockImportInput) => {
  const report = {
    dryRun: input.dryRun,
    created: 0,
    added: 0,
    updated: 0,
    units: 0,
    errors: [] as StockImportIssue[],
    lines: [] as Array<{ row: number; item: string; action: 'created' | 'added' | 'updated'; quantity: number }>,
  };
  const items = await models.PPEItem.findAll({ where: { isActive: { [Op.ne]: false } }, attributes: ['id', 'name', 'itemCode', 'hasSizeVariants'] });
  const byCode = new Map(items.filter((i) => i.itemCode).map((i) => [norm(i.itemCode), i]));
  const byName = new Map(items.map((i) => [norm(i.name), i]));

  try {
    await inTransaction(async (t: Transaction) => {
      for (const [index, r] of input.rows.entries()) {
        const row = index + 1;
        const label = r.itemCode ?? r.itemName ?? 'Unnamed item';
        const item: Row | undefined = (r.itemCode && byCode.get(norm(r.itemCode))) || (r.itemName && byName.get(norm(r.itemName))) || undefined;
        if (!item) {
          report.errors.push({ row, item: label, message: 'No catalogue item has this code or name. Add it to the PPE catalogue first.' });
          continue;
        }
        if (item.hasSizeVariants && !r.size) {
          report.errors.push({ row, item: label, message: `${item.name} comes in sizes. Give the size.` });
          continue;
        }
        const line = { size: r.size, gender: r.gender, color: r.color, location: r.location };
        const existing = await models.Stock.findOne({ where: sameLine(item.id, line), transaction: t, lock: t.LOCK.UPDATE });
        if (existing) {
          const replace = input.updateExisting;
          await existing.update(
            {
              quantity: replace ? r.quantity : Number(existing.quantity) + r.quantity,
              ...(r.unitPriceUSD !== null ? { unitPriceUSD: r.unitPriceUSD } : {}),
              ...(r.minLevel !== null ? { minLevel: r.minLevel } : {}),
              ...(r.binLocation ? { binLocation: r.binLocation } : {}),
              ...(r.stockAccount ? { stockAccount: r.stockAccount } : {}),
              ...(r.batchNumber ? { batchNumber: r.batchNumber } : {}),
              ...(r.expiryDate ? { expiryDate: r.expiryDate } : {}),
              lastRestocked: new Date(),
            },
            { transaction: t }
          );
          report[replace ? 'updated' : 'added'] += 1;
          report.lines.push({ row, item: item.name, action: replace ? 'updated' : 'added', quantity: r.quantity });
        } else {
          await models.Stock.create(
            {
              ppeItemId: item.id,
              quantity: r.quantity,
              size: r.size,
              color: r.color,
              gender: r.gender,
              location: r.location,
              binLocation: r.binLocation,
              minLevel: r.minLevel ?? 0,
              unitPriceUSD: r.unitPriceUSD ?? 0,
              stockAccount: r.stockAccount,
              batchNumber: r.batchNumber,
              expiryDate: r.expiryDate,
              lastRestocked: new Date(),
            },
            { transaction: t }
          );
          report.created += 1;
          report.lines.push({ row, item: item.name, action: 'created', quantity: r.quantity });
        }
        report.units += r.quantity;
      }
      // All or nothing: a file with problems changes no stock
      if (input.dryRun || report.errors.length) throw new DryRun();
    });
  } catch (err) {
    if (!(err instanceof DryRun)) throw err;
  }
  return report;
};
