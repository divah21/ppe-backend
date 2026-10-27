import { z } from 'zod';
import { listQuery } from '../../core/http';

export const REQUEST_STATUSES = [
  'pending-hod-approval',
  'hod-approved',
  'hod-rejected',
  'stores-review',
  'stores-approved',
  'stores-rejected',
  'partially-fulfilled',
  'fulfilled',
  'cancelled',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

const MAX_QTY = 1_000_000;

const twoDecimals = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;

/** A quantity or price with at most two decimals (the columns are NUMERIC(12,2)). */
const amount = (min: 'positive' | 'nonnegative') =>
  z
    .number({ invalid_type_error: 'Enter a number' })
    .finite()
    .max(MAX_QTY, `Must be ${MAX_QTY.toLocaleString('en')} or less`)
    .refine((v) => (min === 'positive' ? v > 0 : v >= 0), min === 'positive' ? 'Must be more than 0' : 'Cannot be negative')
    .refine(twoDecimals, 'Use at most 2 decimal places');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const optionalAmount = amount('nonnegative').nullish().transform((v) => v ?? null);
const optionalLevel = z.number().int('Use a whole number').min(0).max(MAX_QTY).nullish().transform((v) => v ?? null);

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-01-31')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date');

const optionalDate = isoDate.nullish().or(z.literal('')).transform((v) => (v ? v : null));

const uuid = z.string().uuid();

// ---------------------------------------------------------------- items

export const itemListQuery = listQuery(['productCode', 'description', 'category', 'createdAt'], {
  status: z.enum(['active', 'inactive']).optional(),
  category: z.string().trim().max(50).optional(),
});

const itemFields = {
  description: z.string().trim().min(2, 'Enter a description').max(255),
  category: z.string().trim().min(1, 'Enter a category').max(50).transform((v) => v.toUpperCase()),
  stockAccount: optionalText(20),
  unit: z.string().trim().min(1, 'Enter a unit').max(20).default('EA'),
  unitPrice: optionalAmount,
  unitPriceUSD: optionalAmount,
  minLevel: optionalLevel,
  maxLevel: optionalLevel,
  reorderPoint: optionalLevel,
  isActive: z.boolean().default(true),
  notes: optionalText(2000),
};

const levelsInOrder = (v: { minLevel: number | null; maxLevel: number | null }) =>
  v.minLevel === null || v.maxLevel === null || v.maxLevel >= v.minLevel;
const levelsMessage = { message: 'Must be at least the minimum level', path: ['maxLevel'] };

const productCode = z.string().trim().min(1, 'Enter a product code').max(50);

export const itemCreateBody = z.object({ productCode, ...itemFields }).refine(levelsInOrder, levelsMessage);
// Product codes identify items on stock sheets, so they cannot change (as in v1)
export const itemUpdateBody = z.object(itemFields).refine(levelsInOrder, levelsMessage);

export type ItemCreateInput = z.infer<typeof itemCreateBody>;
export type ItemUpdateInput = z.infer<typeof itemUpdateBody>;

export const bulkItemsBody = z
  .object({
    updateExisting: z.boolean().default(false),
    items: z
      .array(
        z.object({
          productCode,
          description: z.string().trim().min(2).max(255),
          category: z.string().trim().max(50).nullish(),
          unit: z.string().trim().max(20).nullish(),
          stockAccount: z.string().trim().max(20).nullish(),
          unitPrice: optionalAmount,
          unitPriceUSD: optionalAmount,
          quantity: optionalAmount,
        })
      )
      .min(1, 'Add at least one item')
      .max(1000, 'Upload at most 1000 items at a time'),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.items.forEach((item, i) => {
      const key = item.productCode.toUpperCase();
      if (seen.has(key)) ctx.addIssue({ code: 'custom', path: ['items', i, 'productCode'], message: 'Duplicate product code' });
      seen.add(key);
    });
  });

export type BulkItemsInput = z.infer<typeof bulkItemsBody>;

// ---------------------------------------------------------------- stock

export const stockListQuery = listQuery(['productCode', 'description', 'quantity', 'totalValueUSD', 'lastRestocked'], {
  category: z.string().trim().max(50).optional(),
  lowStock: z.enum(['true', 'false']).optional(),
});

export const receiveStockBody = z.object({
  consumableItemId: uuid,
  quantity: amount('positive'),
  unitPrice: optionalAmount,
  unitPriceUSD: optionalAmount,
  location: optionalText(100),
  binLocation: optionalText(50),
  batchNumber: optionalText(100),
  expiryDate: optionalDate,
  notes: optionalText(1000),
});

export type ReceiveStockInput = z.infer<typeof receiveStockBody>;

export const adjustStockBody = z
  .object({
    type: z.enum(['add', 'remove', 'set']),
    quantity: amount('nonnegative'),
    reason: z.string().trim().min(3, 'Say why the stock is being adjusted').max(500),
    expectedQuantity: amount('nonnegative').optional(),
  })
  .refine((v) => v.type === 'set' || v.quantity > 0, { message: 'Must be more than 0', path: ['quantity'] });

export type AdjustStockInput = z.infer<typeof adjustStockBody>;

// ---------------------------------------------------------------- requests

export const requestListQuery = listQuery(['requestNumber', 'requestDate', 'status', 'priority', 'totalValueUSD'], {
  status: z.enum(REQUEST_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  sectionId: uuid.optional(),
  departmentId: uuid.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export const createRequestBody = z
  .object({
    sectionId: uuid.optional(),
    priority: z.enum(PRIORITIES).default('normal'),
    requiredByDate: optionalDate,
    purpose: optionalText(1000),
    notes: optionalText(2000),
    items: z
      .array(
        z.object({
          consumableItemId: uuid,
          quantity: amount('positive'),
          remarks: optionalText(500),
        })
      )
      .min(1, 'Add at least one item')
      .max(50, 'A request can have at most 50 items'),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.items.forEach((item, i) => {
      if (seen.has(item.consumableItemId))
        ctx.addIssue({ code: 'custom', path: ['items', i, 'consumableItemId'], message: 'This item is already on the request' });
      seen.add(item.consumableItemId);
    });
  });

export type CreateRequestInput = z.infer<typeof createRequestBody>;

/** Per-line quantities; lines left out take their default (as requested / all outstanding). */
const lineQuantities = z.array(z.object({ id: uuid, quantity: amount('nonnegative') })).max(50).optional();

export const approveRequestBody = z.object({ comments: optionalText(1000), items: lineQuantities });
export const fulfilRequestBody = z.object({
  comments: optionalText(1000),
  items: z
    .array(
      z.object({
        id: uuid,
        quantity: amount('nonnegative'),
        // What the client saw already issued; a mismatch means someone else issued meanwhile
        issued: amount('nonnegative').optional(),
      })
    )
    .max(50)
    .optional(),
});

export const reasonBody = z.object({
  comments: z.string().trim().min(3, 'Give a reason').max(1000),
});

export const cancelBody = z.object({
  comments: optionalText(1000),
});

export type ApproveInput = z.infer<typeof approveRequestBody>;
export type FulfilInput = z.infer<typeof fulfilRequestBody>;

// ---------------------------------------------------------------- allocations

export const allocationListQuery = listQuery(['issueDate', 'quantity', 'totalValueUSD'], {
  consumableItemId: uuid.optional(),
  consumableRequestId: uuid.optional(),
  sectionId: uuid.optional(),
  departmentId: uuid.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
