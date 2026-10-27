import { z } from 'zod';

export const dashboardQuery = z.object({
  period: z.enum(['month', 'quarter', 'year']).default('month'),
});

export type DashboardQuery = z.infer<typeof dashboardQuery>;
