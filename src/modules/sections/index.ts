import { Router } from 'express';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { sectionBody, sectionListQuery, sectionOptionsQuery } from './schemas';
import { createSection, deleteSection, getSection, listSections, sectionOptions, updateSection } from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(sectionListQuery, req.query);
    const { rows, count } = await listSections(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/options',
  route(async (req, res) =>
    ok(res, await sectionOptions(getAuth(req), parse(sectionOptionsQuery, req.query).departmentId))
  )
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getSection(getAuth(req), parse(uuidParam, req.params).id)))
);

router.post(
  '/',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => ok(res, await createSection(getAuth(req), parse(sectionBody, req.body)), 201))
);

router.put(
  '/:id',
  requireRole(ROLES.ADMIN),
  route(async (req, res) =>
    ok(res, await updateSection(getAuth(req), parse(uuidParam, req.params).id, parse(sectionBody, req.body)))
  )
);

router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => {
    await deleteSection(parse(uuidParam, req.params).id);
    res.status(204).end();
  })
);

export default defineModule({ path: '/sections', router });
