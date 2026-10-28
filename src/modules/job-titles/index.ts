import { Router } from 'express';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { applyCategories, listCategories, suggestCategories } from './categories';
import { categoryMappingBody, jobTitleBody, jobTitleListQuery, jobTitleOptionsQuery } from './schemas';
import { createJobTitle, deleteJobTitle, getJobTitle, jobTitleOptions, listJobTitles, updateJobTitle } from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(jobTitleListQuery, req.query);
    const { rows, count } = await listJobTitles(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/options',
  route(async (req, res) => ok(res, await jobTitleOptions(getAuth(req), parse(jobTitleOptionsQuery, req.query))))
);

router.get('/categories', route(async (_req, res) => ok(res, await listCategories())));

router.post('/categories/suggest', requireRole(ROLES.ADMIN), route(async (_req, res) => ok(res, await suggestCategories())));

router.put(
  '/categories',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => ok(res, await applyCategories(parse(categoryMappingBody, req.body))))
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getJobTitle(getAuth(req), parse(uuidParam, req.params).id)))
);

router.post(
  '/',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => ok(res, await createJobTitle(getAuth(req), parse(jobTitleBody, req.body)), 201))
);

router.put(
  '/:id',
  requireRole(ROLES.ADMIN),
  route(async (req, res) =>
    ok(res, await updateJobTitle(getAuth(req), parse(uuidParam, req.params).id, parse(jobTitleBody, req.body)))
  )
);

router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => {
    await deleteJobTitle(parse(uuidParam, req.params).id);
    res.status(204).end();
  })
);

export default defineModule({ path: '/job-titles', router });
