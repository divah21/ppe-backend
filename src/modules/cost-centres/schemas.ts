import { z } from 'zod';
import { listQuery } from '../../core/http';

export const costCentreListQuery = listQuery(['code', 'name', 'department', 'createdAt'], {
  status: z.enum(['active', 'inactive']).optional(),
  departmentId: z.string().uuid().optional(),
});

export const costCentreOptionsQuery = z.object({
  departmentId: z.string().uuid().optional(),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const costCentreBody = z.object({
  code: z.string({ required_error: 'Enter a code' }).trim().min(1, 'Enter a code').max(50),
  name: z.string({ required_error: 'Enter a name' }).trim().min(2, 'Enter a name').max(100),
  description: optionalText(1000),
  departmentId: z
    .union([z.string().uuid('Choose a department'), z.literal(''), z.null()])
    .optional()
    .transform((v) => v || null),
  isActive: z.boolean().default(true),
});

export type CostCentreListQuery = z.infer<typeof costCentreListQuery>;
export type CostCentreInput = z.infer<typeof costCentreBody>;
