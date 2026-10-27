import { Router } from 'express';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { costCentreBody, costCentreListQuery, costCentreOptionsQuery } from './schemas';
import {
  costCentreOptions,
  createCostCentre,
  deleteCostCentre,
  getCostCentre,
  listCostCentres,
  updateCostCentre,
} from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(costCentreListQuery, req.query);
    const { rows, count } = await listCostCentres(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/options',
  route(async (req, res) =>
    ok(res, await costCentreOptions(getAuth(req), parse(costCentreOptionsQuery, req.query).departmentId))
  )
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getCostCentre(getAuth(req), parse(uuidParam, req.params).id)))
);

router.post(
  '/',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => ok(res, await createCostCentre(getAuth(req), parse(costCentreBody, req.body)), 201))
);

router.put(
  '/:id',
  requireRole(ROLES.ADMIN),
  route(async (req, res) =>
    ok(res, await updateCostCentre(getAuth(req), parse(uuidParam, req.params).id, parse(costCentreBody, req.body)))
  )
);

router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => {
    await deleteCostCentre(parse(uuidParam, req.params).id);
    res.status(204).end();
  })
);

export default defineModule({ path: '/cost-centers', router });
