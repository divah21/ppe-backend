import { Router } from 'express';
import { audit, skipAudit } from '../../core/audit';
import { authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { CATALOGUE_EDITORS } from './policy';
import { importPpeItems } from './import';
import { ppeItemBody, ppeItemImportBody, ppeItemListQuery, ppeItemOptionsQuery, replacementFrequencyBody } from './schemas';
import {
  catalogueSummary,
  createPpeItem,
  getPpeItem,
  listPpeItems,
  ppeCategories,
  ppeItemOptions,
  ppeItemSizes,
  setPpeItemActive,
  setReplacementFrequency,
  updatePpeItem,
} from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(ppeItemListQuery, req.query);
    const { rows, count } = await listPpeItems(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/options',
  route(async (req, res) => ok(res, await ppeItemOptions(parse(ppeItemOptionsQuery, req.query))))
);

router.get(
  '/summary',
  route(async (_req, res) => ok(res, await catalogueSummary()))
);

router.get(
  '/categories',
  route(async (req, res) => ok(res, await ppeCategories(getAuth(req))))
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getPpeItem(getAuth(req), parse(uuidParam, req.params).id)))
);

router.get(
  '/:id/sizes',
  route(async (req, res) => ok(res, await ppeItemSizes(getAuth(req), parse(uuidParam, req.params).id)))
);

router.post(
  '/',
  requireRole(...CATALOGUE_EDITORS),
  route(async (req, res) => ok(res, await createPpeItem(getAuth(req), parse(ppeItemBody, req.body)), 201))
);

router.post(
  '/import',
  requireRole(...CATALOGUE_EDITORS),
  route(async (req, res) => {
    const input = parse(ppeItemImportBody, req.body);
    const report = await importPpeItems(input);
    if (input.dryRun || report.errors.length) skipAudit(req);
    else await audit(req, 'BULK_IMPORT', 'PPEItem', null, { created: report.created, updated: report.updated });
    return ok(res, report, input.dryRun || report.errors.length ? 200 : 201);
  })
);

router.put(
  '/replacement-frequency',
  requireRole(...CATALOGUE_EDITORS),
  route(async (req, res) => ok(res, await setReplacementFrequency(parse(replacementFrequencyBody, req.body))))
);

router.put(
  '/:id',
  requireRole(...CATALOGUE_EDITORS),
  route(async (req, res) =>
    ok(res, await updatePpeItem(getAuth(req), parse(uuidParam, req.params).id, parse(ppeItemBody, req.body)))
  )
);

router.post(
  '/:id/deactivate',
  requireRole(...CATALOGUE_EDITORS),
  route(async (req, res) => ok(res, await setPpeItemActive(getAuth(req), parse(uuidParam, req.params).id, false)))
);

router.post(
  '/:id/activate',
  requireRole(...CATALOGUE_EDITORS),
  route(async (req, res) => ok(res, await setPpeItemActive(getAuth(req), parse(uuidParam, req.params).id, true)))
);

export default defineModule({ path: '/ppe-items', router });
