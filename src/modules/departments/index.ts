import { Router } from 'express';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { departmentBody, departmentListQuery } from './schemas';
import {
  createDepartment,
  deleteDepartment,
  departmentOptions,
  getDepartment,
  listDepartments,
  updateDepartment,
} from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(departmentListQuery, req.query);
    const { rows, count } = await listDepartments(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/options',
  route(async (req, res) => ok(res, await departmentOptions(getAuth(req))))
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getDepartment(getAuth(req), parse(uuidParam, req.params).id)))
);

router.post(
  '/',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => ok(res, await createDepartment(parse(departmentBody, req.body)), 201))
);

router.put(
  '/:id',
  requireRole(ROLES.ADMIN),
  route(async (req, res) =>
    ok(res, await updateDepartment(getAuth(req), parse(uuidParam, req.params).id, parse(departmentBody, req.body)))
  )
);

router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => {
    await deleteDepartment(parse(uuidParam, req.params).id);
    res.status(204).end();
  })
);

export default defineModule({ path: '/departments', router });
