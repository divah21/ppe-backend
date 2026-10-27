import { z } from 'zod';
import { listQuery } from '../../core/http';
import { REQUEST_STATUSES, REQUEST_TYPES, VIEWS } from './workflow';

const filters = {
  view: z.enum(VIEWS).default('all'),
  status: z.enum(REQUEST_STATUSES).optional(),
  type: z.enum(REQUEST_TYPES).optional(),
  departmentId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
};

export const requestListQuery = listQuery(['createdAt', 'updatedAt', 'status', 'requestType'], filters);
export type RequestListQuery = z.infer<typeof requestListQuery>;

export const requestCountsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  ...filters,
});
export type RequestCountsQuery = z.infer<typeof requestCountsQuery>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const createRequestBody = z.object({
  employeeId: z.string().uuid('Choose an employee'),
  requestType: z.enum(REQUEST_TYPES).default('replacement'),
  comment: optionalText(1000),
  items: z
    .array(
      z.object({
        ppeItemId: z.string().uuid('Choose a PPE item'),
        quantity: z.coerce.number().int('Enter a whole number').min(1, 'Enter at least 1').max(100, 'Enter 100 or fewer'),
        size: optionalText(50),
        reason: optionalText(500),
      })
    )
    .min(1, 'Add at least one item')
    .max(50, 'Add 50 items or fewer'),
});
export type CreateRequestInput = z.infer<typeof createRequestBody>;

export const approveBody = z.object({ comment: optionalText(1000) });

export const rejectBody = z.object({
  reason: z.string({ required_error: 'Give a reason' }).trim().min(1, 'Give a reason').max(1000),
});

export const cancelBody = z.object({ reason: optionalText(1000) });

export const fulfilBody = z.object({
  items: z
    .array(
      z.object({
        requestItemId: z.string().uuid(),
        stockId: z.string().uuid('Choose a stock line'),
        quantity: z.coerce.number().int('Enter a whole number').min(1, 'Enter at least 1').max(1000),
        /** What the client saw already issued on the item; a mismatch means someone issued meanwhile */
        issued: z.number().int().min(0).optional(),
      })
    )
    .min(1, 'Issue at least one item')
    .max(100),
  note: optionalText(1000),
});
export type FulfilInput = z.infer<typeof fulfilBody>;

export const employeeSearchQuery = z.object({ q: z.string().trim().max(100).optional() });
export const employeeIdParam = z.object({ employeeId: z.string().uuid() });
