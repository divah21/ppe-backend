import { z } from 'zod';
import { listQuery } from '../../core/http';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');
const text = z.string().trim().min(1).max(100).optional();

const stockFilters = {
  category: text,
  itemType: z.enum(['PPE', 'CONSUMABLE', 'EQUIPMENT', 'LABORATORY']).optional(),
  stockAccount: text,
};

export const stockFilterQuery = z.object(stockFilters);
export const stockListQuery = listQuery(['value', 'quantity', 'name', 'unitPrice'], stockFilters);
export const lowStockQuery = listQuery(['deficit', 'quantity', 'name'], { category: text });

const range = {
  from: isoDate.optional(),
  to: isoDate.optional(),
  departmentId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
};
const checkRange = (v: { from?: string; to?: string }) => !v.from || !v.to || v.from <= v.to;
const rangeIssue = { message: 'The end date must be on or after the start date', path: ['to'] };

export const spendingQuery = listQuery(['spent', 'label', 'allocationCount'], {
  ...range,
  groupBy: z.enum(['department', 'section', 'item', 'month']).default('department'),
}).refine(checkRange, rangeIssue);

export const spendingTotalsQuery = z.object(range).refine(checkRange, rangeIssue);

const forecastFilters = {
  days: z.coerce.number().int().min(1).max(365).default(90),
  departmentId: z.string().uuid().optional(),
};
export const forecastQuery = listQuery(['shortage', 'required', 'name'], forecastFilters);
export const forecastSummaryQuery = z.object(forecastFilters);

export const demandQuery = listQuery(['predicted', 'issued', 'shortfall', 'name'], {
  months: z.coerce.number().int().min(1).max(36).default(12),
  departmentId: z.string().uuid().optional(),
});

export type StockFilters = z.infer<typeof stockFilterQuery>;
export type StockListQuery = z.infer<typeof stockListQuery>;
export type LowStockQuery = z.infer<typeof lowStockQuery>;
export type SpendingQuery = z.infer<typeof spendingQuery>;
export type SpendingTotalsQuery = z.infer<typeof spendingTotalsQuery>;
export type ForecastQuery = z.infer<typeof forecastQuery>;
export type ForecastSummaryQuery = z.infer<typeof forecastSummaryQuery>;
export type DemandQuery = z.infer<typeof demandQuery>;
