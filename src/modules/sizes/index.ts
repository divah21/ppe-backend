import { Router } from 'express';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { CATALOGUE_EDITORS } from '../ppe-items/policy';
import { createSizeScaleBody, replaceSizesBody, sizeScaleListQuery, updateSizeScaleBody } from './schemas';
import {
  createSizeScale,
  deleteSizeScale,
  getSizeScale,
  listSizeScales,
  replaceSizes,
  sizeScaleOptions,
  updateSizeScale,
} from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(sizeScaleListQuery, req.query);
    const { rows, count } = await listSizeScales(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/options',
  route(async (_req, res) => ok(res, await sizeScaleOptions()))
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getSizeScale(getAuth(req), parse(uuidParam, req.params).id)))
);

router.post(
  '/',
  requireRole(...CATALOGUE_EDITORS),
  route(async (req, res) => ok(res, await createSizeScale(getAuth(req), parse(createSizeScaleBody, req.body)), 201))
);

router.put(
  '/:id',
  requireRole(...CATALOGUE_EDITORS),
  route(async (req, res) =>
    ok(res, await updateSizeScale(getAuth(req), parse(uuidParam, req.params).id, parse(updateSizeScaleBody, req.body)))
  )
);

router.put(
  '/:id/sizes',
  requireRole(...CATALOGUE_EDITORS),
  route(async (req, res) =>
    ok(res, await replaceSizes(getAuth(req), parse(uuidParam, req.params).id, parse(replaceSizesBody, req.body).sizes))
  )
);

router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => {
    await deleteSizeScale(parse(uuidParam, req.params).id);
    res.status(204).end();
  })
);

export default defineModule({ path: '/size-scales', router });
