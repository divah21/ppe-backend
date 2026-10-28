import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { z } from 'zod';
import { inTransaction, models, type Row } from '../../core/db';
import { parseIssueDate } from '../allocations/import';
import { GENDERS, type StockImportInput } from './schemas';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { validateRequestedSize } = require('../../../middlewares/size_validation') as {
  validateRequestedSize: (item: Row, size: unknown) => Promise<{ valid: boolean; message?: string }>;
};

/** Thrown to roll back a dry run once every row has been checked. */
class DryRun extends Error {}

const text = (max: number) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .pipe(z.string().max(max))
    .nullish()
    .transform((v) => v || null);

const number = (label: string, integer: boolean) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const n = Number(String(v).replace(/[$,\s]/g, ''));
    if (String(v).trim() === '' || !Number.isFinite(n) || n < 0 || (integer && !Number.isInteger(n))) {
      ctx.addIssue({ code: 'custom', message: `${label} must be ${integer ? 'a whole number' : 'a number'} of 0 or more` });
      return z.NEVER;
    }
    return n;
  });

/** One spreadsheet row; checked here so every bad row is reported with its row number. */
const rowSchema = z
  .object({
    itemCode: text(100),
    itemName: text(255),
    // Required: a blank quantity with "replace quantities" would otherwise empty the line
    quantity: number('Quantity', true),
    size: text(50),
    color: text(50),
    gender: text(20).transform((v, ctx) => {
      if (!v) return null;
      const g = v.toLowerCase();
      if ((GENDERS as readonly string[]).includes(g)) return g as (typeof GENDERS)[number];
      ctx.addIssue({ code: 'custom', message: 'Gender is MALE, FEMALE or UNISEX' });
      return z.NEVER;
    }),
    location: text(100).transform((v) => v ?? 'Main Store'),
    binLocation: text(50),
    minLevel: number('Min level', true).nullish().transform((v) => v ?? null),
    unitPriceUSD: number('Unit price', false).nullish().transform((v) => v ?? null),
    stockAccount: text(50),
    batchNumber: text(100),
    expiryDate: text(20).transform((v, ctx) => {
      if (!v) return null;
      const d = parseIssueDate(v);
      if (!d) ctx.addIssue({ code: 'custom', message: 'Expiry date: use YYYY-MM-DD or DD/MM/YYYY' });
      return d;
    }),
  })
  .refine((r) => r.itemCode || r.itemName, { message: 'Give the item code or name' });

export interface ImportedLine {
  row: number;
  stockId: string;
  item: string;
  action: 'created' | 'added' | 'updated';
  previousQuantity: number;
  newQuantity: number;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Receives stock from a spreadsheet (v1 bulk upload). Rows match catalogue items by code, then by
 * name, and lines exactly as a receipt does (same variant, the line holding the batch when one is
 * given). A row for an existing line adds to it, or with updateExisting replaces its quantity and
 * price. All or nothing: with dryRun, or any bad row, everything is rolled back.
 */
export const importStock = async (input: StockImportInput) => {
  const report = {
    dryRun: input.dryRun,
    created: 0,
    added: 0,
    updated: 0,
    units: 0,
    errors: [] as Array<{ row: number; item: string; message: string }>,
    lines: [] as ImportedLine[],
  };
  const items = await models.PPEItem.findAll({
    where: { isActive: { [Op.ne]: false } },
    attributes: ['id', 'name', 'itemCode', 'hasSizeVariants', 'sizeScale', 'availableSizes'],
  });
  const byCode = new Map(items.filter((i) => i.itemCode).map((i) => [norm(i.itemCode), i]));
  const byName = new Map(items.map((i) => [norm(i.name), i]));

  try {
    await inTransaction(async (t: Transaction) => {
      for (const [index, raw] of input.rows.entries()) {
        const row = index + 1;
        const label = String(raw.itemCode ?? raw.itemName ?? 'Unnamed item');
        const parsed = rowSchema.safeParse(raw);
        if (!parsed.success) {
          report.errors.push({ row, item: label, message: parsed.error.issues.map((i) => i.message).join('; ') });
          continue;
        }
        const r = parsed.data;
        const item = (r.itemCode && byCode.get(norm(r.itemCode))) || (r.itemName && byName.get(norm(r.itemName))) || undefined;
        if (!item) {
          report.errors.push({ row, item: label, message: 'No catalogue item has this code or name. Add it to the PPE catalogue first.' });
          continue;
        }
        const sized = await validateRequestedSize(item, r.size);
        if (!sized.valid) {
          report.errors.push({ row, item: label, message: sized.message ?? `Choose a size ${item.name} comes in` });
          continue;
        }
        // Same lock as a receipt, so a concurrent "Receive stock" cannot create a duplicate line
        await models.PPEItem.findByPk(item.id, { attributes: ['id'], transaction: t, lock: t.LOCK.NO_KEY_UPDATE });
        const variant: WhereOptions = { ppeItemId: item.id, size: r.size, color: r.color, gender: r.gender, location: r.location };
        const findLine = (where: WhereOptions) =>
          models.Stock.findOne({ where, order: [['createdAt', 'ASC']], transaction: t, lock: t.LOCK.UPDATE });
        // A batch gets its own line, as receiving does; another line's batch is never overwritten
        const existing = await findLine(r.batchNumber ? { ...variant, batchNumber: r.batchNumber } : variant);

        if (existing) {
          const previous = Number(existing.quantity);
          const replace = input.updateExisting;
          const next = replace ? r.quantity : previous + r.quantity;
          await existing.update(
            {
              quantity: next,
              ...(r.unitPriceUSD !== null ? { unitPriceUSD: r.unitPriceUSD } : {}),
              ...(r.minLevel !== null ? { minLevel: r.minLevel } : {}),
              ...(r.binLocation ? { binLocation: r.binLocation } : {}),
              ...(r.stockAccount ? { stockAccount: r.stockAccount } : {}),
              ...(r.expiryDate ? { expiryDate: r.expiryDate } : {}),
              ...(next > previous ? { lastRestocked: new Date() } : {}),
            },
            { transaction: t }
          );
          report[replace ? 'updated' : 'added'] += 1;
          report.lines.push({ row, stockId: existing.id, item: item.name, action: replace ? 'updated' : 'added', previousQuantity: previous, newQuantity: next });
        } else {
          const created = await models.Stock.create(
            {
              ppeItemId: item.id,
              quantity: r.quantity,
              size: r.size,
              color: r.color,
              gender: r.gender,
              location: r.location,
              binLocation: r.binLocation,
              minLevel: r.minLevel ?? 10,
              unitPriceUSD: r.unitPriceUSD ?? 0,
              stockAccount: r.stockAccount,
              batchNumber: r.batchNumber,
              expiryDate: r.expiryDate,
              lastRestocked: r.quantity > 0 ? new Date() : null,
            },
            { transaction: t }
          );
          report.created += 1;
          report.lines.push({ row, stockId: created.id, item: item.name, action: 'created', previousQuantity: 0, newQuantity: r.quantity });
        }
        report.units += r.quantity;
      }
      if (input.dryRun || report.errors.length) throw new DryRun();
    });
  } catch (err) {
    if (!(err instanceof DryRun)) throw err;
  }
  return report;
};
