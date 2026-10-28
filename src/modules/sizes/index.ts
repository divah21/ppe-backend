import { Router } from 'express';
import { audit, skipAudit } from '../../core/audit';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { CATALOGUE_EDITORS } from '../ppe-items/policy';
import { createSizeScaleBody, replaceSizesBody, sizeScaleImportBody, sizeScaleListQuery, updateSizeScaleBody } from './schemas';
import {
  createSizeScale,
  deleteSizeScale,
  getSizeScale,
  importSizeScales,
  listSizeScales,
  replaceSizes,
  sizeScaleOptions,
  updateSizeScale,
} from './service';

const router = Router();
router.use(authenticate);

router.post(
  '/import',
  requireRole(...CATALOGUE_EDITORS),
  route(async (req, res) => {
    const input = parse(sizeScaleImportBody, req.body);
    const report = await importSizeScales(input);
    if (input.dryRun || report.errors.length) skipAudit(req);
    else await audit(req, 'BULK_IMPORT', 'SizeScale', null, { created: report.created, extended: report.extended, sizesAdded: report.sizesAdded });
    return ok(res, report, input.dryRun || report.errors.length ? 200 : 201);
  })
);

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
