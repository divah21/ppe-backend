import { z } from 'zod';
import { listQuery } from '../../core/http';

const year = z.coerce.number().int().min(2000, 'Enter a year from 2000').max(2100, 'Enter a year up to 2100');
const amount = z.coerce
  .number({ invalid_type_error: 'Enter an amount' })
  .finite()
  .min(0, 'Amount cannot be negative')
  .max(999_999_999_999, 'Amount is too large')
  .transform((n) => Math.round(n * 100) / 100);
const positiveAmount = amount.refine((n) => n > 0, 'Enter an amount greater than zero');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');
const notes = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));
const notesPatch = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));

export const yearQuery = z.object({ fiscalYear: year.default(() => new Date().getFullYear()) });

export const companyListQuery = listQuery(['fiscalYear', 'totalBudget', 'createdAt'], {
  status: z.enum(['draft', 'active', 'closed']).optional(),
});

export const companyBody = z
  .object({
    fiscalYear: year,
    totalBudget: positiveAmount,
    suggestedBudget: amount.optional(),
    bufferAmount: amount.optional(),
    status: z.enum(['draft', 'active', 'closed']).default('active'),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    notes,
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export const companyUpdateBody = z
  .object({
    totalBudget: positiveAmount.optional(),
    bufferAmount: amount.optional(),
    status: z.enum(['draft', 'active', 'closed']).optional(),
    notes: notesPatch,
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Nothing to update' });

export const budgetListQuery = listQuery(['fiscalYear', 'allocatedAmount', 'department', 'createdAt'], {
  fiscalYear: year.optional(),
  departmentId: z.string().uuid().optional(),
  status: z.enum(['active', 'expired', 'draft']).optional(),
  period: z.enum(['annual', 'half-year', 'quarterly', 'monthly']).optional(),
});

export const budgetBody = z
  .object({
    departmentId: z.string({ required_error: 'Choose a department' }).uuid('Choose a department'),
    sectionId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
    fiscalYear: year,
    period: z.enum(['annual', 'quarterly', 'monthly']).default('annual'),
    quarter: z.coerce.number().int().min(1).max(4).optional().nullable(),
    month: z.coerce.number().int().min(1).max(12).optional().nullable(),
    allocatedAmount: positiveAmount,
    suggestedAmount: amount.optional(),
    status: z.enum(['active', 'expired', 'draft']).default('active'),
    notes,
  })
  .superRefine((v, ctx) => {
    if (v.period === 'quarterly' && !v.quarter) ctx.addIssue({ code: 'custom', path: ['quarter'], message: 'Choose a quarter' });
    if (v.period === 'monthly' && !v.month) ctx.addIssue({ code: 'custom', path: ['month'], message: 'Choose a month' });
  })
  .transform((v) => ({
    ...v,
    sectionId: v.sectionId ?? null,
    quarter: v.period === 'quarterly' ? (v.quarter ?? null) : null,
    month: v.period === 'monthly' ? (v.month ?? null) : null,
  }));

export const budgetUpdateBody = z
  .object({
    allocatedAmount: positiveAmount.optional(),
    status: z.enum(['active', 'expired', 'draft']).optional(),
    notes: notesPatch,
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Nothing to update' });

export type CompanyInput = z.infer<typeof companyBody>;
export type CompanyUpdate = z.infer<typeof companyUpdateBody>;
export type BudgetInput = z.infer<typeof budgetBody>;
export type BudgetUpdate = z.infer<typeof budgetUpdateBody>;
export type BudgetListQuery = z.infer<typeof budgetListQuery>;
export type CompanyListQuery = z.infer<typeof companyListQuery>;
