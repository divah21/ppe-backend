import { Router } from 'express';
import { authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { CATALOGUE_EDITORS } from './policy';
import { ppeItemBody, ppeItemListQuery, ppeItemOptionsQuery, replacementFrequencyBody } from './schemas';
import {
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
