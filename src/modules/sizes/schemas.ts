import { z } from 'zod';
import { listQuery } from '../../core/http';

export const sizeScaleListQuery = listQuery(['name', 'code', 'categoryGroup', 'createdAt'], {
  status: z.enum(['active', 'inactive']).optional(),
  categoryGroup: z.string().trim().max(50).optional(),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const sizeBody = z.object({
  id: z.string().uuid().optional(),
  value: z.string().trim().min(1, 'Enter a size').max(50),
  label: optionalText(50),
  euSize: optionalText(20),
  usSize: optionalText(20),
  ukSize: optionalText(20),
});

const sizeList = z
  .array(sizeBody)
  .max(100, 'A scale can have at most 100 sizes')
  .superRefine((sizes, ctx) => {
    const seenValues = new Map<string, number>();
    const seenIds = new Set<string>();
    sizes.forEach((s, i) => {
      const key = s.value.toLowerCase();
      if (seenValues.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, 'value'], message: `${s.value} is listed twice` });
      }
      seenValues.set(key, i);
      if (s.id) {
        if (seenIds.has(s.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, 'id'], message: 'Duplicate size' });
        seenIds.add(s.id);
      }
    });
  });

const scaleFields = {
  code: z
    .string()
    .trim()
    .min(2, 'Enter a code')
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, - and _ only')
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2, 'Enter a name').max(100),
  categoryGroup: optionalText(50),
  description: optionalText(1000),
  isActive: z.boolean().default(true),
};

export const createSizeScaleBody = z.object({
  ...scaleFields,
  sizes: sizeList.default([]).refine((s) => s.every((x) => !x.id), 'New scales cannot reference existing sizes'),
});

export const updateSizeScaleBody = z.object(scaleFields);

export const replaceSizesBody = z.object({ sizes: sizeList });

export const sizeScaleImportBody = z.object({
  dryRun: z.boolean().default(true),
  /** Add the file's new sizes to scales that already exist (sizes are never removed) */
  updateExisting: z.boolean().default(false),
  rows: z
    .array(
      z.object({
        code: scaleFields.code,
        name: scaleFields.name,
        categoryGroup: optionalText(50),
        description: optionalText(1000),
        sizes: z
          .string()
          .max(2000)
          .transform((v) => [...new Set(v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean))])
          .refine((v) => v.length > 0, 'List at least one size')
          .refine((v) => v.length <= 100, 'A scale can have at most 100 sizes'),
      })
    )
    .min(1, 'The file has no rows')
    .max(200),
});
export type SizeScaleImportInput = z.infer<typeof sizeScaleImportBody>;

export type SizeInput = z.infer<typeof sizeBody>;
export type CreateSizeScaleInput = z.infer<typeof createSizeScaleBody>;
export type UpdateSizeScaleInput = z.infer<typeof updateSizeScaleBody>;
