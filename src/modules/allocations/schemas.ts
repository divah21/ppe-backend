import { z } from 'zod';
import { listQuery } from '../../core/http';

export const ALLOCATION_STATUSES = ['active', 'expired', 'replaced', 'returned'] as const;
export const RETURN_CONDITIONS = ['good', 'fair', 'poor', 'damaged', 'lost'] as const;
/** Returned in one of these conditions, the item goes back on the shelf (v1 rule) */
export const RESTOCK_CONDITIONS: ReadonlySet<string> = new Set(['good', 'fair']);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Enter a valid date');

const scopeFilters = {
  departmentId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  ppeItemId: z.string().uuid().optional(),
};

export const allocationListQuery = listQuery(['issueDate', 'dueDate', 'status', 'quantity', 'employee', 'item'], {
  ...scopeFilters,
  status: z.enum(ALLOCATION_STATUSES).optional(),
  employeeId: z.string().uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
}).refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'The start date must be before the end date', path: ['to'] });

export type AllocationListQuery = z.infer<typeof allocationListQuery>;

export const employeeHistoryQuery = listQuery(['issueDate', 'dueDate', 'status', 'item'], {
  status: z.enum(ALLOCATION_STATUSES).optional(),
});

export const employeeParam = z.object({ employeeId: z.string().uuid() });

const flag = z
  .enum(['true', 'false'])
  .default('true')
  .transform((v) => v === 'true');

export const renewalsQuery = listQuery(['dueDate', 'employee', 'items'], {
  ...scopeFilters,
  days: z.coerce.number().int().min(1).max(365).default(30),
  includeOverdue: flag,
});

export type RenewalsQuery = z.infer<typeof renewalsQuery>;

export const returnBody = z.object({
  condition: z.enum(RETURN_CONDITIONS, { message: 'Choose the condition of the returned item' }),
  reason: z.string().trim().max(500, 'Keep the reason under 500 characters').optional().transform((v) => v || null),
});

export type ReturnInput = z.infer<typeof returnBody>;

export const renewBody = z.object({
  quantity: z.number().int('Enter a whole number').min(1, 'Enter at least 1').max(1000).optional(),
  size: z.string().trim().min(1).max(50).optional(),
});

export type RenewInput = z.infer<typeof renewBody>;

const importItem = z.object({
  itemName: z.string().trim().min(1, 'Enter the item name').max(255),
  issueDate: z.string().trim().min(1, 'Enter the issue date').max(20),
  quantity: z.coerce.number().int().min(1).max(1000),
  size: z.string().trim().max(50).optional(),
});

export const importBody = z.object({
  dryRun: z.boolean().default(true),
  defaultSectionId: z.string().uuid().optional(),
  allocations: z
    .array(
      z.object({
        firstName: z.string().trim().min(1, 'Enter the first name').max(100),
        lastName: z.string().trim().min(1, 'Enter the last name').max(100),
        worksNumber: z.string().trim().max(50).optional(),
        jobType: z.string().trim().max(50).optional(),
        ppeItems: z.array(importItem).min(1, 'Add at least one item').max(50),
      })
    )
    .min(1, 'Add at least one row')
    .max(500, 'Import at most 500 people at a time'),
});

export type ImportInput = z.infer<typeof importBody>;
