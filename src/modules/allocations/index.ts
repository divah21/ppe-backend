import { Router } from 'express';
import { audit } from '../../core/audit';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { importAllocations } from './import';
import {
  allocationListQuery,
  employeeHistoryQuery,
  employeeParam,
  importBody,
  renewBody,
  renewalsQuery,
  returnBody,
} from './schemas';
import {
  employeeHistory,
  filterOptions,
  getAllocation,
  listAllocations,
  renewAllocation,
  renewalsDue,
  returnAllocation,
} from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(allocationListQuery, req.query);
    const { rows, count } = await listAllocations(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/filter-options',
  route(async (req, res) => ok(res, await filterOptions(getAuth(req))))
);

router.get(
  '/renewals-due',
  route(async (req, res) => {
    const q = parse(renewalsQuery, req.query);
    const { rows, count, summary } = await renewalsDue(getAuth(req), q);
    const pageCount = Math.max(1, Math.ceil(count / q.pageSize));
    return res.json({ data: rows, meta: { page: q.page, pageSize: q.pageSize, total: count, pageCount, summary } });
  })
);

router.get(
  '/employee/:employeeId',
  route(async (req, res) => {
    const { employeeId } = parse(employeeParam, req.params);
    const q = parse(employeeHistoryQuery, req.query);
    const { rows, count, employee, summary } = await employeeHistory(getAuth(req), employeeId, q);
    const pageCount = Math.max(1, Math.ceil(count / q.pageSize));
    return res.json({ data: rows, meta: { page: q.page, pageSize: q.pageSize, total: count, pageCount, employee, summary } });
  })
);

router.post(
  '/import',
  requireRole(ROLES.STORES),
  route(async (req, res) => {
    const input = parse(importBody, req.body);
    const report = await importAllocations(getAuth(req), input);
    if (!input.dryRun) await audit(req, 'BULK_IMPORT', 'Allocation', null, { summary: report.summary });
    return ok(res, report, input.dryRun ? 200 : 201);
  })
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getAllocation(getAuth(req), parse(uuidParam, req.params).id)))
);

router.post(
  '/:id/return',
  requireRole(ROLES.STORES),
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const input = parse(returnBody, req.body);
    const { allocation, restocked } = await returnAllocation(getAuth(req), id, input);
    await audit(req, 'RETURN', 'Allocation', id, { condition: input.condition, reason: input.reason, restocked });
    return ok(res, { ...allocation, restocked });
  })
);

router.post(
  '/:id/renew',
  requireRole(ROLES.STORES),
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const allocation = await renewAllocation(getAuth(req), id, parse(renewBody, req.body));
    await audit(req, 'RENEW', 'Allocation', allocation.id, { replaces: id, quantity: allocation.quantity });
    return ok(res, allocation, 201);
  })
);

export default defineModule({ path: '/allocations', router });
