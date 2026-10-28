import { Router, type Request, type Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { audit } from '../../core/audit';
import { type AuthContext, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, parse, route } from '../../core/http';
import { defineModule } from '../../core/module';
import {
  allocationsReportQuery,
  employeesReportQuery,
  failuresReportQuery,
  matrixReportQuery,
  ppeCardsReportQuery,
  requestsReportQuery,
  stockReportQuery,
} from './schemas';
import {
  allocationsReport,
  employeesReport,
  failuresReport,
  generatedBy,
  listReports,
  matrixReport,
  ppeCardsReport,
  reportOptions,
  reportRoles,
  requestsReport,
  stockReport,
  type ReportKey,
} from './service';
import { streamWorkbook, type Sheet } from './xlsx';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  route(async (req, res) => ok(res, listReports(getAuth(req))))
);

router.get(
  '/options',
  requireRole(...reportRoles('allocations')),
  route(async (req, res) => ok(res, await reportOptions(getAuth(req))))
);

const exportRoute = <S extends ZodTypeAny>(
  key: ReportKey,
  schema: S,
  build: (auth: AuthContext, q: z.infer<S>) => Promise<Sheet[]>
) =>
  router.get(
    `/${key}`,
    requireRole(...reportRoles(key)),
    route(async (req: Request, res: Response) => {
      const auth = getAuth(req);
      const q = parse(schema, req.query);
      const sheets = await build(auth, q);
      await audit(req, 'REPORT_EXPORT', 'Report', null, {
        report: key,
        filters: q,
        rows: sheets.reduce((n, s) => n + s.rows.length, 0),
      });
      const stamp = new Date().toISOString().slice(0, 10);
      await streamWorkbook(res, `${key}_${stamp}.xlsx`, generatedBy(auth), sheets);
    })
  );

exportRoute('employees', employeesReportQuery, employeesReport);
exportRoute('failures', failuresReportQuery, failuresReport);
exportRoute('allocations', allocationsReportQuery, allocationsReport);
exportRoute('requests', requestsReportQuery, requestsReport);
exportRoute('stock', stockReportQuery, stockReport);
exportRoute('matrix', matrixReportQuery, matrixReport);
exportRoute('ppe-cards', ppeCardsReportQuery, ppeCardsReport);

export default defineModule({ path: '/reports', router });
