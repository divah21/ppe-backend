import { Router } from 'express';
import { audit } from '../../core/audit';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { importEmployees } from './import';
import { EDITOR_ROLES } from './policy';
import { employeeBody, employeeListQuery, employeeOptionsQuery, importBody } from './schemas';
import {
  createEmployee,
  employeeOptions,
  getEmployee,
  listEmployees,
  setEmployeeActive,
  updateEmployee,
} from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(employeeListQuery, req.query);
    const { rows, count } = await listEmployees(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/options',
  route(async (req, res) => ok(res, await employeeOptions(getAuth(req), parse(employeeOptionsQuery, req.query))))
);

router.post(
  '/import',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => {
    const { rows, dryRun } = parse(importBody, req.body);
    const result = await importEmployees(rows, dryRun);
    if (!dryRun) await audit(req, 'BULK_IMPORT', 'Employee', null, { created: result.created, updated: result.updated });
    return ok(res, result);
  })
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getEmployee(getAuth(req), parse(uuidParam, req.params).id)))
);

router.post(
  '/',
  requireRole(...EDITOR_ROLES),
  route(async (req, res) => ok(res, await createEmployee(getAuth(req), parse(employeeBody, req.body)), 201))
);

router.put(
  '/:id',
  requireRole(...EDITOR_ROLES),
  route(async (req, res) =>
    ok(res, await updateEmployee(getAuth(req), parse(uuidParam, req.params).id, parse(employeeBody, req.body)))
  )
);

router.post(
  '/:id/deactivate',
  requireRole(...EDITOR_ROLES),
  route(async (req, res) => {
    const { employee, changed } = await setEmployeeActive(getAuth(req), parse(uuidParam, req.params).id, false);
    if (changed) await audit(req, 'DEACTIVATE', 'Employee', employee.id);
    return ok(res, employee);
  })
);

router.post(
  '/:id/activate',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => {
    const { employee, changed } = await setEmployeeActive(getAuth(req), parse(uuidParam, req.params).id, true);
    if (changed) await audit(req, 'ACTIVATE', 'Employee', employee.id);
    return ok(res, employee);
  })
);

export default defineModule({ path: '/employees', router });
