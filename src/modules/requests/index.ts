import { Router } from 'express';
import { audit } from '../../core/audit';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { employeeEligibility, requestCatalogue, searchEmployees } from './eligibility';
import { fulfilRequest, stockOptions, substituteOptions } from './fulfil';
import { notifyHods, notifyIssued, notifyRejected, notifyStores } from './notify';
import {
  approveBody,
  cancelBody,
  createRequestBody,
  employeeIdParam,
  employeeSearchQuery,
  fulfilBody,
  rejectBody,
  requestCountsQuery,
  requestListQuery,
  substituteQuery,
} from './schemas';
import {
  approveRequest,
  cancelRequest,
  countRequests,
  createRequest,
  getRequest,
  listRequests,
  rejectRequest,
  requestSummary,
} from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(requestListQuery, req.query);
    const { rows, count } = await listRequests(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/counts',
  route(async (req, res) => ok(res, await countRequests(getAuth(req), parse(requestCountsQuery, req.query))))
);

router.get(
  '/summary',
  route(async (req, res) => ok(res, await requestSummary(getAuth(req), parse(requestCountsQuery, req.query))))
);

router.get(
  '/employees',
  requireRole(ROLES.SECTION_REP),
  route(async (req, res) => ok(res, await searchEmployees(getAuth(req), parse(employeeSearchQuery, req.query).q)))
);

router.get(
  '/catalogue',
  requireRole(ROLES.SECTION_REP),
  route(async (_req, res) => ok(res, await requestCatalogue()))
);

router.get(
  '/employees/:employeeId/eligibility',
  requireRole(ROLES.SECTION_REP),
  route(async (req, res) =>
    ok(res, await employeeEligibility(getAuth(req), parse(employeeIdParam, req.params).employeeId))
  )
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getRequest(getAuth(req), parse(uuidParam, req.params).id)))
);

router.get(
  '/:id/stock-options',
  requireRole(ROLES.STORES),
  route(async (req, res) => ok(res, await stockOptions(getAuth(req), parse(uuidParam, req.params).id)))
);

router.get(
  '/:id/substitutes',
  requireRole(ROLES.STORES),
  route(async (req, res) =>
    ok(res, await substituteOptions(getAuth(req), parse(uuidParam, req.params).id, parse(substituteQuery, req.query).q))
  )
);

router.post(
  '/',
  requireRole(ROLES.SECTION_REP),
  route(async (req, res) => {
    const auth = getAuth(req);
    const id = await createRequest(auth, parse(createRequestBody, req.body));
    await audit(req, 'REQUEST_CREATED', 'Request', id);
    return ok(res, await getRequest(auth, id), 201);
  })
);

router.post(
  '/:id/approve',
  route(async (req, res) => {
    const auth = getAuth(req);
    const { id } = parse(uuidParam, req.params);
    const { comment } = parse(approveBody, req.body);
    const step = await approveRequest(auth, id, comment);
    await audit(req, 'REQUEST_APPROVED', 'Request', id, { ...step, comment });
    if (step.to === 'hod-review') notifyHods(id);
    if (step.to === 'stores-review') notifyStores(id, auth.userId);
    return ok(res, await getRequest(auth, id));
  })
);

router.post(
  '/:id/reject',
  route(async (req, res) => {
    const auth = getAuth(req);
    const { id } = parse(uuidParam, req.params);
    const { reason } = parse(rejectBody, req.body);
    const step = await rejectRequest(auth, id, reason);
    await audit(req, 'REQUEST_REJECTED', 'Request', id, { ...step, reason });
    notifyRejected(id, auth.userId, reason);
    return ok(res, await getRequest(auth, id));
  })
);

router.post(
  '/:id/cancel',
  requireRole(ROLES.SECTION_REP),
  route(async (req, res) => {
    const auth = getAuth(req);
    const { id } = parse(uuidParam, req.params);
    const { reason } = parse(cancelBody, req.body);
    const step = await cancelRequest(auth, id, reason);
    await audit(req, 'REQUEST_CANCELLED', 'Request', id, { ...step, reason });
    return ok(res, await getRequest(auth, id));
  })
);

router.post(
  '/:id/fulfil',
  requireRole(ROLES.STORES),
  route(async (req, res) => {
    const auth = getAuth(req);
    const { id } = parse(uuidParam, req.params);
    const result = await fulfilRequest(auth, id, parse(fulfilBody, req.body));
    await audit(req, 'REQUEST_FULFILLED', 'Request', id, { from: result.from, to: result.to, issued: result.issued });
    notifyIssued(id, result.issued, result.outstanding);
    return ok(res, await getRequest(auth, id));
  })
);

export default defineModule({ path: '/requests', router });
