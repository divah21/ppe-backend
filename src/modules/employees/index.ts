import { Router } from 'express';
import { audit, skipAudit } from '../../core/audit';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { importEmployees } from './import';
import { EDITOR_ROLES } from './policy';
import { employeeBody, employeeListQuery, employeeOptionsQuery, employeeSummaryQuery, employeeUpdateBody, importBody, transferQuery } from './schemas';
import {
  createEmployee,
  employeeJobTypes,
  employeeLookups,
  employeeSummary,
  employeeOptions,
  getEmployee,
  listEmployees,
  previewTransfer,
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

router.get(
  '/lookups',
  route(async (req, res) => ok(res, await employeeLookups(getAuth(req))))
);

router.post(
  '/import',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => {
    const { rows, ...options } = parse(importBody, req.body);
    const result = await importEmployees(rows, options, getAuth(req).userId);
    if (options.dryRun) skipAudit(req);
    else await audit(req, 'BULK_IMPORT', 'Employee', null, { created: result.created, updated: result.updated, skipped: result.skipped });
    return ok(res, result);
  })
);

router.get(
  '/summary',
  route(async (req, res) => ok(res, await employeeSummary(getAuth(req), parse(employeeSummaryQuery, req.query))))
);

router.get(
  '/job-types',
  route(async (req, res) => ok(res, await employeeJobTypes(getAuth(req))))
);

router.get(
  '/:id/transfer-preview',
  requireRole(...EDITOR_ROLES),
  route(async (req, res) =>
    ok(res, await previewTransfer(getAuth(req), parse(uuidParam, req.params).id, parse(transferQuery, req.query)))
  )
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
  route(async (req, res) => {
    const input = parse(employeeUpdateBody, req.body);
    const { employee, transfer } = await updateEmployee(getAuth(req), parse(uuidParam, req.params).id, input);
    // Replaces the generic UPDATE entry, so it carries the submitted fields too
    if (transfer) await audit(req, 'TRANSFER', 'Employee', employee.id, { ...transfer, changes: input });
    return ok(res, { ...employee, transfer });
  })
);

router.post(
  '/:id/deactivate',
  requireRole(...EDITOR_ROLES),
  route(async (req, res) => {
    const { employee, changed } = await setEmployeeActive(getAuth(req), parse(uuidParam, req.params).id, false);
    if (changed) await audit(req, 'DEACTIVATE', 'Employee', employee.id);
    else skipAudit(req);
    return ok(res, employee);
  })
);

router.post(
  '/:id/activate',
  requireRole(ROLES.ADMIN),
  route(async (req, res) => {
    const { employee, changed } = await setEmployeeActive(getAuth(req), parse(uuidParam, req.params).id, true);
    if (changed) await audit(req, 'ACTIVATE', 'Employee', employee.id);
    else skipAudit(req);
    return ok(res, employee);
  })
);

export default defineModule({ path: '/employees', router });
