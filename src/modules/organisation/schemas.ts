import { z } from 'zod';

export const ORG_KINDS = ['departments', 'sections', 'job-titles'] as const;
export type OrgKind = (typeof ORG_KINDS)[number];

export const orgKindParam = z.object({ kind: z.enum(ORG_KINDS) });

export const orgImportBody = z.object({
  dryRun: z.boolean().default(true),
  /** Apply the file's filled-in columns to records that already exist, instead of leaving them */
  updateExisting: z.boolean().default(false),
  rows: z.array(z.record(z.unknown())).min(1, 'The file has no rows').max(2000, 'Upload at most 2000 rows at a time'),
});

export type OrgImportInput = z.infer<typeof orgImportBody>;
