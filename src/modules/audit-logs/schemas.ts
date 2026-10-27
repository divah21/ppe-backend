import { z } from 'zod';
import { listQuery } from '../../core/http';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-01-31').refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v), 'Enter a real date');

export const auditListQuery = listQuery(['createdAt', 'action', 'entityType'], {
  userId: z.string().uuid().optional(),
  action: z.string().trim().max(255).optional(),
  entityType: z.string().trim().max(100).optional(),
  from: day.optional(),
  to: day.optional(),
}).refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'The start date must be on or before the end date', path: ['to'] });

export type AuditListQuery = z.infer<typeof auditListQuery>;
