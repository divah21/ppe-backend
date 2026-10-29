import { z } from 'zod';

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-01-31')
  .refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v), 'Enter a real date');

const id = z.string().uuid('Choose an option from the list').optional();
const text = z.string().trim().max(100).optional();

const range = { from: day.optional(), to: day.optional() };
const validRange = <T extends { from?: string; to?: string }>(q: T) => !q.from || !q.to || q.from <= q.to;
const RANGE_MESSAGE = { message: 'The start date must be on or before the end date', path: ['to'] };

export const ALLOCATION_STATUSES = ['active', 'expired', 'replaced', 'returned'] as const;
export const REQUEST_STATUSES = [
  'pending',
  'sheq-review',
  'dept-rep-review',
  'hod-review',
  'stores-review',
  'approved',
  'partially-fulfilled',
  'fulfilled',
  'rejected',
  'cancelled',
] as const;
export const REQUEST_TYPES = ['new', 'replacement', 'emergency', 'annual'] as const;

export const failuresReportQuery = z
  .object({
    departmentId: id,
    sectionId: id,
    q: text,
    status: z.enum(['pending-sheq-review', 'sheq-approved', 'stores-processing', 'resolved', 'replaced']).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    failureType: z.enum(['damage', 'defect', 'lost', 'wear']).optional(),
    observedAt: text,
    brand: text,
    ...range,
  })
  .refine(validRange, RANGE_MESSAGE);
export type FailuresReportQuery = z.infer<typeof failuresReportQuery>;

export const employeesReportQuery = z.object({
  departmentId: id,
  sectionId: id,
  jobTitleId: id,
  jobType: text,
  q: text,
  status: z.enum(['active', 'inactive']).optional(),
});
export type EmployeesReportQuery = z.infer<typeof employeesReportQuery>;

export const allocationsReportQuery = z
  .object({
    departmentId: id,
    sectionId: id,
    employeeId: id,
    ppeItemId: id,
    q: text,
    status: z.enum(ALLOCATION_STATUSES).optional(),
    ...range,
  })
  .refine(validRange, RANGE_MESSAGE);

export const requestsReportQuery = z
  .object({
    departmentId: id,
    sectionId: id,
    status: z.enum(REQUEST_STATUSES).optional(),
    requestType: z.enum(REQUEST_TYPES).optional(),
    ...range,
  })
  .refine(validRange, RANGE_MESSAGE);

export const stockReportQuery = z.object({
  category: text,
  location: text,
  lowOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const matrixReportQuery = z.object({
  departmentId: id,
  category: text,
});

export const ppeCardsReportQuery = z.object({
  departmentId: id,
  sectionId: id,
  employeeId: id,
  q: text,
});

export const spendingReportQuery = z
  .object({ departmentId: id, sectionId: id, ...range })
  .refine(validRange, RANGE_MESSAGE);
export type SpendingReportQuery = z.infer<typeof spendingReportQuery>;

export const projectedCostReportQuery = z.object({ departmentId: id, sectionId: id });
export type ProjectedCostReportQuery = z.infer<typeof projectedCostReportQuery>;

export const overviewReportQuery = z.object({ period: z.enum(['month', 'quarter', 'year']).default('month') });
export type OverviewReportQuery = z.infer<typeof overviewReportQuery>;

export type AllocationsReportQuery = z.infer<typeof allocationsReportQuery>;
export type RequestsReportQuery = z.infer<typeof requestsReportQuery>;
export type StockReportQuery = z.infer<typeof stockReportQuery>;
export type MatrixReportQuery = z.infer<typeof matrixReportQuery>;
export type PpeCardsReportQuery = z.infer<typeof ppeCardsReportQuery>;
