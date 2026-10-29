import { Router } from 'express';
import { audit, skipAudit } from '../../core/audit';
import { ROLES, authenticate, requireRole } from '../../core/auth';
import { ok, parse, route } from '../../core/http';
import { defineModule } from '../../core/module';
import { importOrganisation } from './import';
import { orgImportBody, orgKindParam } from './schemas';
import { organisationSummary } from './summary';

const router = Router();
router.use(authenticate, requireRole(ROLES.ADMIN));

router.get('/summary', route(async (_req, res) => ok(res, await organisationSummary())));

const ENTITY = { departments: 'Department', sections: 'Section', 'job-titles': 'JobTitle' } as const;

router.post(
  '/import/:kind',
  route(async (req, res) => {
    const { kind } = parse(orgKindParam, req.params);
    const input = parse(orgImportBody, req.body);
    const report = await importOrganisation(kind, input);
    if (input.dryRun || report.errors.length) skipAudit(req);
    else await audit(req, 'BULK_IMPORT', ENTITY[kind], null, { created: report.created, updated: report.updated });
    return ok(res, report, input.dryRun || report.errors.length ? 200 : 201);
  })
);

export default defineModule({ path: '/organisation', router });
