import { z } from 'zod';
import { listQuery } from '../../core/http';

export const jobTitleListQuery = listQuery(['name', 'code', 'section', 'department', 'createdAt'], {
  status: z.enum(['active', 'inactive']).optional(),
  departmentId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
});

export const jobTitleOptionsQuery = z.object({
  sectionId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const jobTitleBody = z.object({
  name: z.string({ required_error: 'Enter a name' }).trim().min(2, 'Enter a name').max(100),
  code: optionalText(20),
  description: optionalText(1000),
  sectionId: z.string({ required_error: 'Choose a section' }).uuid('Choose a section'),
  isActive: z.boolean().default(true),
});

export type JobTitleListQuery = z.infer<typeof jobTitleListQuery>;
export type JobTitleInput = z.infer<typeof jobTitleBody>;
