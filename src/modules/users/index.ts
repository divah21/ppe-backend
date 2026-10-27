import { Router, type Response } from 'express';
import { audit } from '../../core/audit';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { createUserBody, employeeOptionsQuery, updateUserBody, userListQuery } from './schemas';
import {
  createUser,
  employeeOptions,
  getUser,
  listUsers,
  resetPassword,
  sectionOptions,
  updateUser,
} from './service';

const router = Router();
router.use(authenticate, requireRole(ROLES.ADMIN));

// Responses carrying a temporary password must not be cached anywhere
const noStore = (res: Response) => res.set('Cache-Control', 'no-store');

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(userListQuery, req.query);
    const { rows, count } = await listUsers(q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/employee-options',
  route(async (req, res) => ok(res, await employeeOptions(parse(employeeOptionsQuery, req.query).q)))
);

router.get(
  '/section-options',
  route(async (_req, res) => ok(res, await sectionOptions()))
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getUser(parse(uuidParam, req.params).id)))
);

router.post(
  '/',
  route(async (req, res) => ok(noStore(res), await createUser(parse(createUserBody, req.body)), 201))
);

router.put(
  '/:id',
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    return ok(res, await updateUser(getAuth(req), id, parse(updateUserBody, req.body)));
  })
);

router.post(
  '/:id/reset-password',
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const result = await resetPassword(getAuth(req), id);
    await audit(req, 'RESET', 'User', id, { action: 'admin_password_reset' });
    return ok(noStore(res), result);
  })
);

export default defineModule({ path: '/users', router });
