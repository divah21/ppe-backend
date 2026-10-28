import { z } from 'zod';
import { listQuery } from '../../core/http';

export const MAX_QUANTITY = 999;
export const MAX_MONTHS = 120;
export const MAX_BATCH = 1000;
export const MATRIX_IMPORT_MAX = 5000;

const uuid = z.string().uuid();
const optionalUuid = uuid.optional();

const quantity = z
  .number({ invalid_type_error: 'Enter a quantity' })
  .int('Use a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(MAX_QUANTITY, `Quantity can be at most ${MAX_QUANTITY}`);

const months = z
  .number({ invalid_type_error: 'Enter a number of months' })
  .int('Use a whole number of months')
  .min(1, 'Must be at least 1 month')
  .max(MAX_MONTHS, `Must be at most ${MAX_MONTHS} months`);

const notes = z
  .string()
  .trim()
  .max(1000)
  .nullish()
  .transform((v) => (v === undefined ? undefined : v || null));

const matrixFilters = {
  departmentId: optionalUuid,
  sectionId: optionalUuid,
  ppeItemId: optionalUuid,
  configured: z.enum(['yes', 'no']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
};

export const jobTitleMatrixQuery = listQuery(['name'], { ...matrixFilters, jobTitleId: optionalUuid });
export const sectionMatrixQuery = listQuery(['name'], matrixFilters);

export type JobTitleMatrixQuery = z.infer<typeof jobTitleMatrixQuery>;
export type SectionMatrixQuery = z.infer<typeof sectionMatrixQuery>;

const noDuplicates = <T>(key: (item: T) => string, message: string) => (items: T[], ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    const k = key(item);
    if (seen.has(k)) ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [i] });
    seen.add(k);
  });
};

const jobTitleKey = (e: { jobTitleId: string; ppeItemId: string }) => `${e.jobTitleId}:${e.ppeItemId}`;
const sectionKey = (e: { sectionId: string; ppeItemId: string }) => `${e.sectionId}:${e.ppeItemId}`;

const jobTitleEntry = z.object({
  jobTitleId: uuid,
  ppeItemId: uuid,
  quantityRequired: quantity,
  /** Omitted on an update keeps the current value; on a create (or null) the PPE item's frequency, else 12 months (v1) */
  replacementFrequency: months.nullish(),
  heavyUseFrequency: months.nullish(),
  isMandatory: z.boolean().optional(),
  notes,
});

const sectionEntry = z.object({
  sectionId: uuid,
  ppeItemId: uuid,
  quantityRequired: quantity,
  /** Null: fall back to the PPE item's frequency. Omitted on an update keeps the current value */
  replacementFrequency: months.nullish(),
  isMandatory: z.boolean().optional(),
  notes,
});

const atLeastOne = (b: { upserts: unknown[]; deletes: unknown[] }) => b.upserts.length + b.deletes.length > 0;

export const jobTitleSaveBody = z
  .object({
    upserts: z
      .array(jobTitleEntry)
      .max(MAX_BATCH)
      .default([])
      .superRefine(noDuplicates(jobTitleKey, 'This item appears twice for the same job title')),
    deletes: z
      .array(z.object({ jobTitleId: uuid, ppeItemId: uuid }))
      .max(MAX_BATCH)
      .default([])
      .superRefine(noDuplicates(jobTitleKey, 'This item is removed twice')),
  })
  .refine(atLeastOne, { message: 'There are no changes to save', path: ['upserts'] })
  .superRefine((b, ctx) => {
    const removed = new Set(b.deletes.map(jobTitleKey));
    b.upserts.forEach((e, i) => {
      if (removed.has(jobTitleKey(e))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'An item cannot be saved and removed at once', path: ['upserts', i] });
      }
    });
  });

export const sectionSaveBody = z
  .object({
    upserts: z
      .array(sectionEntry)
      .max(MAX_BATCH)
      .default([])
      .superRefine(noDuplicates(sectionKey, 'This item appears twice for the same section')),
    deletes: z
      .array(z.object({ sectionId: uuid, ppeItemId: uuid }))
      .max(MAX_BATCH)
      .default([])
      .superRefine(noDuplicates(sectionKey, 'This item is removed twice')),
  })
  .refine(atLeastOne, { message: 'There are no changes to save', path: ['upserts'] })
  .superRefine((b, ctx) => {
    const removed = new Set(b.deletes.map(sectionKey));
    b.upserts.forEach((e, i) => {
      if (removed.has(sectionKey(e))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'An item cannot be saved and removed at once', path: ['upserts', i] });
      }
    });
  });

export type JobTitleSaveInput = z.infer<typeof jobTitleSaveBody>;

export const MATRIX_KINDS = ['job-titles', 'sections'] as const;
export type MatrixKind = (typeof MATRIX_KINDS)[number];
export const kindParam = z.object({ kind: z.enum(MATRIX_KINDS) });

export const matrixImportBody = z.object({
  dryRun: z.boolean().default(true),
  /** Remove an owner's items that the file does not list (v1 section upload replaced each section) */
  replace: z.boolean().default(false),
  // A whole department's template can exceed one grid save; the import saves it in one transaction
  rows: z.array(z.record(z.unknown())).min(1, 'The file has no rows').max(MATRIX_IMPORT_MAX, `Upload at most ${MATRIX_IMPORT_MAX} rows at a time`),
});
export type MatrixImportInput = z.infer<typeof matrixImportBody>;

export const matrixCopyBody = z.object({
  fromId: uuid,
  toIds: z.array(uuid).min(1, 'Choose where to copy to').max(200),
  /** Also remove the targets' items the source does not have */
  replace: z.boolean().default(false),
});
export type MatrixCopyInput = z.infer<typeof matrixCopyBody>;
export type SectionSaveInput = z.infer<typeof sectionSaveBody>;

export const eligibilityQuery = z.object({ employeeId: uuid });

export const sectionOptionsQuery = z.object({ departmentId: optionalUuid });
