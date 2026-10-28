import { z } from 'zod';
import { listQuery } from '../../core/http';

export const stockListQuery = listQuery(['quantity', 'item', 'value'], {
  category: z.string().trim().max(100).optional(),
  ppeItemId: z.string().uuid().optional(),
  size: z.string().trim().max(50).optional(),
  lowStock: z.enum(['true', 'false']).optional(),
});
export type StockListQuery = z.infer<typeof stockListQuery>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const level = z.number().int().min(0).max(1_000_000);
const money = z.number().min(0).max(1_000_000_000);

export const GENDERS = ['male', 'female', 'unisex'] as const;

export const stockCreateBody = z
  .object({
    ppeItemId: z.string().uuid('Choose a PPE item'),
    quantity: z.number().int('Enter a whole number').min(0, 'Quantity cannot be negative').max(1_000_000),
    size: optionalText(50),
    color: optionalText(50),
    gender: z.enum(GENDERS).nullish().transform((v) => v ?? null),
    location: optionalText(100).transform((v) => v ?? 'Main Store'),
    binLocation: optionalText(50),
    minLevel: level.nullish(),
    maxLevel: level.nullish(),
    reorderPoint: level.nullish(),
    unitPriceUSD: money,
    unitCost: money.nullish(),
    supplier: optionalText(255),
    batchNumber: optionalText(100),
    expiryDate: z.coerce.date().nullish(),
    stockAccount: optionalText(50),
    notes: optionalText(2000),
    // The quantity the client showed for the matching line (0 when none); guards against a resubmitted receipt
    expectedQuantity: z.number().int().min(0).optional(),
  })
  .refine((v) => v.maxLevel == null || v.minLevel == null || v.maxLevel >= v.minLevel, {
    path: ['maxLevel'],
    message: 'Maximum level must be at least the minimum level',
  });
export type StockCreateInput = z.infer<typeof stockCreateBody>;

/** v1's adjustment reasons, kept with the free-text note */
export const ADJUST_REASONS = ['restock', 'damage', 'return', 'expired', 'theft', 'stocktake', 'transfer', 'correction', 'other'] as const;

export const adjustBody = z.object({
  reasonCode: z.enum(ADJUST_REASONS).optional(),
  delta: z
    .number()
    .int('Enter a whole number')
    .min(-1_000_000)
    .max(1_000_000)
    .refine((v) => v !== 0, 'Enter a change other than zero'),
  reason: z.string().trim().min(3, 'Give a reason for this adjustment').max(500),
  expectedQuantity: z.number().int().min(0).optional(),
});
export type AdjustInput = z.infer<typeof adjustBody>;

export const bulkTopupBody = z.object({
  items: z
    .array(
      z.object({
        stockId: z.string().uuid(),
        quantity: z.number().int('Enter a whole number').min(1, 'Enter at least 1').max(1_000_000),
        expectedQuantity: z.number().int().min(0).optional(),
        /** Overrides the batch reason for this line (top-up from a spreadsheet) */
        reason: z.string().trim().max(500).optional(),
      })
    )
    .min(1, 'Choose at least one stock line')
    .max(200)
    .refine((items) => new Set(items.map((i) => i.stockId)).size === items.length, 'Each stock line can appear only once'),
  reason: z.string().trim().max(500).optional().transform((v) => v || 'Bulk top-up'),
});
export type BulkTopupInput = z.infer<typeof bulkTopupBody>;

export const stockUpdateBody = z
  .object({
    size: optionalText(50),
    color: optionalText(50),
    gender: z.enum(GENDERS).nullish().transform((v) => v ?? null),
    location: optionalText(100).transform((v) => v ?? 'Main Store'),
    binLocation: optionalText(50),
    minLevel: level.nullish(),
    maxLevel: level.nullish(),
    reorderPoint: level.nullish(),
    unitPriceUSD: money,
    supplier: optionalText(255),
    batchNumber: optionalText(100),
    expiryDate: z.coerce.date().nullish(),
    stockAccount: optionalText(50),
    notes: optionalText(2000),
  })
  .refine((v) => v.maxLevel == null || v.minLevel == null || v.maxLevel >= v.minLevel, {
    path: ['maxLevel'],
    message: 'Maximum level must be at least the minimum level',
  });
export type StockUpdateInput = z.infer<typeof stockUpdateBody>;

const importGender = z
  .string()
  .trim()
  .toLowerCase()
  .nullish()
  .transform((v, ctx) => {
    if (!v) return null;
    if ((GENDERS as readonly string[]).includes(v)) return v as (typeof GENDERS)[number];
    ctx.addIssue({ code: 'custom', message: 'Gender is MALE, FEMALE or UNISEX' });
    return z.NEVER;
  });

export const stockImportBody = z.object({
  dryRun: z.boolean().default(true),
  /** Replace the quantity and price of lines that already exist, instead of adding to them */
  updateExisting: z.boolean().default(false),
  rows: z
    .array(
      z
        .object({
          itemCode: optionalText(100),
          itemName: optionalText(255),
          quantity: z.coerce.number().int('Enter a whole number').min(0).max(1_000_000),
          size: optionalText(50),
          color: optionalText(50),
          gender: importGender,
          location: optionalText(100).transform((v) => v ?? 'Main Store'),
          binLocation: optionalText(50),
          minLevel: z.coerce.number().int().min(0).max(1_000_000).nullish().transform((v) => v ?? null),
          unitPriceUSD: z.coerce.number().min(0).max(1_000_000_000).nullish().transform((v) => v ?? null),
          stockAccount: optionalText(50),
          batchNumber: optionalText(100),
          expiryDate: z.coerce.date().nullish().transform((v) => v ?? null),
        })
        .refine((r) => r.itemCode || r.itemName, { message: 'Give the item code or name', path: ['itemCode'] })
    )
    .min(1, 'The file has no rows')
    .max(2000, 'Upload at most 2000 rows at a time'),
});
export type StockImportInput = z.infer<typeof stockImportBody>;

export const shortfallQuery = z.object({ q: z.string().trim().max(100).optional() });
