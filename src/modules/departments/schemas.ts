import { z } from 'zod';
import { listQuery } from '../../core/http';

export const departmentListQuery = listQuery(['name', 'code', 'createdAt'], {
  status: z.enum(['active', 'inactive']).optional(),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const departmentBody = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(100),
  code: optionalText(20),
  description: optionalText(1000),
  isActive: z.boolean().default(true),
});

export type DepartmentInput = z.infer<typeof departmentBody>;
