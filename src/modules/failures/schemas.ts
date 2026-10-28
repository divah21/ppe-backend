import { z } from 'zod';
import { listQuery } from '../../core/http';

export const FAILURE_TYPES = ['damage', 'defect', 'lost', 'wear'] as const;
export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export const STATUSES = ['pending-sheq-review', 'sheq-approved', 'stores-processing', 'resolved', 'replaced'] as const;
export type FailureStatus = (typeof STATUSES)[number];

const isoDate = z.string().date('Enter a valid date');

export const failureListQuery = listQuery(['reportedDate', 'failureDate', 'severity', 'status', 'createdAt'], {
  status: z.enum(STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  failureType: z.enum(FAILURE_TYPES).optional(),
  employeeId: z.string().uuid().optional(),
  ppeItemId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type FailureListQuery = z.infer<typeof failureListQuery>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export const failureBody = z.object({
  employeeId: z.string({ required_error: 'Choose an employee' }).uuid('Choose an employee'),
  ppeItemId: z.string({ required_error: 'Choose the PPE item' }).uuid('Choose the PPE item'),
  allocationId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null))
    .transform((v) => v ?? null),
  description: z.string({ required_error: 'Describe the failure' }).trim().min(5, 'Describe the failure in a few words').max(2000),
  failureType: z.enum(FAILURE_TYPES, { errorMap: () => ({ message: 'Choose a failure type' }) }),
  severity: z.enum(SEVERITIES, { errorMap: () => ({ message: 'Choose a severity' }) }).default('medium'),
  failureDate: isoDate
    .refine((d) => new Date(`${d}T00:00:00`) <= endOfToday(), 'The failure date cannot be in the future')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  observedAt: optionalText(255),
  brand: optionalText(255),
  remarks: optionalText(2000),
});
export type FailureInput = z.infer<typeof failureBody>;

export const reviewBody = z.object({
  decision: z.enum(['approve', 'reject'], { errorMap: () => ({ message: 'Approve or reject the report' }) }),
  comment: z.string({ required_error: 'Add a comment for your decision' }).trim().min(3, 'Add a comment for your decision').max(2000),
  actionTaken: optionalText(2000),
});
export type ReviewInput = z.infer<typeof reviewBody>;

export const replaceBody = z.object({
  stockId: z.string({ required_error: 'Choose the stock to issue from' }).uuid('Choose the stock to issue from'),
  quantity: z.coerce.number().int('Enter a whole number').min(1, 'Issue at least 1').max(50, 'Issue at most 50').default(1),
  size: optionalText(50),
  notes: optionalText(1000),
});
export type ReplaceInput = z.infer<typeof replaceBody>;

export const resolveBody = z.object({
  actionTaken: z.string({ required_error: 'Say how the report was resolved' }).trim().min(3, 'Say how the report was resolved').max(2000),
});
export type ResolveInput = z.infer<typeof resolveBody>;

export const optionsQuery = z.object({
  q: z.string().trim().max(100).optional(),
});

export const allocationOptionsQuery = z.object({
  employeeId: z.string().uuid(),
});
