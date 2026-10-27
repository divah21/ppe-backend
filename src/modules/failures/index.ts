import { Router } from 'express';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { audit } from '../../core/audit';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { ACTION_ROLES } from './policy';
import {
  allocationOptionsQuery,
  failureBody,
  failureListQuery,
  optionsQuery,
  replaceBody,
  resolveBody,
  reviewBody,
} from './schemas';
import {
  allocationOptions,
  createFailure,
  employeeOptions,
  failureStats,
  getFailure,
  listFailures,
  ppeItemOptions,
  replaceFailure,
  resolveFailure,
  reviewFailure,
  startProcessing,
  stockOptions,
} from './service';

const ALL_ROLES = Object.values(ROLES);

const router = Router();
router.use(authenticate, requireRole(...ALL_ROLES));

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(failureListQuery, req.query);
    const { rows, count } = await listFailures(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/stats',
  route(async (req, res) => ok(res, await failureStats(getAuth(req))))
);

router.get(
  '/options/employees',
  route(async (req, res) => ok(res, await employeeOptions(getAuth(req), parse(optionsQuery, req.query).q)))
);

router.get(
  '/options/ppe-items',
  route(async (req, res) => ok(res, await ppeItemOptions(parse(optionsQuery, req.query).q)))
);

router.get(
  '/options/allocations',
  route(async (req, res) =>
    ok(res, await allocationOptions(getAuth(req), parse(allocationOptionsQuery, req.query).employeeId))
  )
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getFailure(getAuth(req), parse(uuidParam, req.params).id)))
);

router.get(
  '/:id/stock-options',
  requireRole(...ACTION_ROLES.fulfil),
  route(async (req, res) => ok(res, await stockOptions(getAuth(req), parse(uuidParam, req.params).id)))
);

router.post(
  '/',
  route(async (req, res) => {
    const report = await createFailure(getAuth(req), parse(failureBody, req.body));
    await audit(req, 'FAILURE_REPORTED', 'FailureReport', report.id, { employeeId: report.employee?.id });
    return ok(res, report, 201);
  })
);

router.post(
  '/:id/review',
  requireRole(...ACTION_ROLES.review),
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const input = parse(reviewBody, req.body);
    const report = await reviewFailure(getAuth(req), id, input);
    await audit(req, input.decision === 'approve' ? 'FAILURE_APPROVED' : 'FAILURE_REJECTED', 'FailureReport', id, {
      comment: input.comment,
    });
    return ok(res, report);
  })
);

router.post(
  '/:id/process',
  requireRole(...ACTION_ROLES.fulfil),
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const report = await startProcessing(getAuth(req), id);
    await audit(req, 'FAILURE_PROCESSING', 'FailureReport', id);
    return ok(res, report);
  })
);

router.post(
  '/:id/resolve',
  requireRole(...ACTION_ROLES.fulfil),
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const report = await resolveFailure(getAuth(req), id, parse(resolveBody, req.body));
    await audit(req, 'FAILURE_RESOLVED', 'FailureReport', id);
    return ok(res, report);
  })
);

router.post(
  '/:id/replace',
  requireRole(...ACTION_ROLES.fulfil),
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const input = parse(replaceBody, req.body);
    const result = await replaceFailure(getAuth(req), id, input);
    await audit(req, 'FAILURE_REPLACED', 'FailureReport', id, {
      stockId: input.stockId,
      quantity: input.quantity,
      allocationId: result.allocationId,
    });
    return ok(res, result);
  })
);

export default defineModule({ path: '/failures', router });
