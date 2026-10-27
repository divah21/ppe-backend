import { z } from 'zod';
import { listQuery } from '../../core/http';

export const sectionListQuery = listQuery(['name', 'code', 'department', 'createdAt'], {
  status: z.enum(['active', 'inactive']).optional(),
  departmentId: z.string().uuid().optional(),
});

export const sectionOptionsQuery = z.object({
  departmentId: z.string().uuid().optional(),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const sectionBody = z.object({
  name: z.string({ required_error: 'Enter a name' }).trim().min(2, 'Enter a name').max(100),
  code: optionalText(20),
  description: optionalText(1000),
  departmentId: z.string({ required_error: 'Choose a department' }).uuid('Choose a department'),
  isActive: z.boolean().default(true),
});

export type SectionListQuery = z.infer<typeof sectionListQuery>;
export type SectionInput = z.infer<typeof sectionBody>;
