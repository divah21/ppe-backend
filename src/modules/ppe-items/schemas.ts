import { z } from 'zod';
import { listQuery } from '../../core/http';

export const ITEM_TYPES = ['PPE', 'CONSUMABLE', 'EQUIPMENT', 'LABORATORY'] as const;
export const TARGET_GENDERS = ['MALE', 'FEMALE', 'UNISEX'] as const;

export const ppeItemListQuery = listQuery(['name', 'itemCode', 'category', 'replacementFrequency', 'stockOnHand', 'createdAt'], {
  category: z.string().trim().max(100).optional(),
  itemType: z.enum(ITEM_TYPES).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sizeScale: z.string().trim().max(50).optional(),
});

export const ppeItemOptionsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  itemType: z.enum(ITEM_TYPES).optional(),
  category: z.string().trim().max(100).optional(),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const months = z.coerce
  .number({ invalid_type_error: 'Enter a number of months' })
  .int('Use whole months')
  .min(1, 'Must be at least 1 month')
  .max(120, 'Must be 120 months or less');

const valueList = (max: number) =>
  z
    .array(z.string().trim().min(1).max(max))
    .max(100)
    .nullish()
    .transform((v) => (v && v.length ? [...new Set(v)] : null));

export const ppeItemBody = z
  .object({
    name: z.string().trim().min(2, 'Enter a name').max(255),
    itemCode: z.string().trim().min(1, 'Enter an item code').max(50),
    itemRefCode: optionalText(50),
    productName: optionalText(255),
    itemType: z.enum(ITEM_TYPES).default('PPE'),
    category: z.string().trim().min(1, 'Choose a category').max(100),
    description: optionalText(2000),
    unit: z
      .string()
      .trim()
      .max(50)
      .nullish()
      .transform((v) => v || 'EA'),
    replacementFrequency: months,
    heavyUseFrequency: months.nullish().transform((v) => v ?? null),
    isMandatory: z.boolean().default(true),
    accountCode: optionalText(50),
    accountDescription: optionalText(255),
    supplier: optionalText(255),
    hasSizeVariants: z.boolean().default(false),
    hasColorVariants: z.boolean().default(false),
    sizeScale: optionalText(50),
    availableSizes: valueList(50),
    availableColors: valueList(50),
    targetGender: z.enum(TARGET_GENDERS).default('UNISEX'),
  })
  .superRefine((v, ctx) => {
    if (v.heavyUseFrequency && v.heavyUseFrequency > v.replacementFrequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['heavyUseFrequency'],
        message: 'Heavy-use replacement cannot be later than the standard replacement',
      });
    }
    if (v.hasSizeVariants && !v.sizeScale) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sizeScale'], message: 'Choose the size scale this item comes in' });
    }
  })
  .transform((v) => ({
    ...v,
    sizeScale: v.hasSizeVariants ? v.sizeScale : null,
    availableSizes: v.hasSizeVariants ? v.availableSizes : null,
    availableColors: v.hasColorVariants ? v.availableColors : null,
  }));

/** v1 rule: applies to active PPE-type items, narrowed by category and/or ids when given. */
export const replacementFrequencyBody = z.object({
  replacementFrequency: months,
  category: z.string().trim().min(1).max(100).optional(),
  itemIds: z.array(z.string().uuid()).min(1).max(500).optional(),
});

export type PpeItemInput = z.infer<typeof ppeItemBody>;
export type ReplacementFrequencyInput = z.infer<typeof replacementFrequencyBody>;
