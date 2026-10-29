import { Router } from 'express';
import { audit } from '../../core/audit';
import { ROLES, authenticate, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { archiveAccessLog, auditStats, listAccessLogs } from './access';
import { accessLogQuery, auditListQuery } from './schemas';
import { auditFacets, getAuditLog, listAuditLogs } from './service';

const router = Router();
router.use(authenticate, requireRole(ROLES.ADMIN));

router.get(
  '/',
  route(async (req, res) => {
    const q = parse(auditListQuery, req.query);
    const { rows, count } = await listAuditLogs(q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/facets',
  route(async (_req, res) => ok(res, await auditFacets()))
);

router.get('/stats', route(async (_req, res) => ok(res, await auditStats())));

router.get(
  '/access',
  route(async (req, res) => {
    const q = parse(accessLogQuery, req.query);
    const { rows, count, truncated } = await listAccessLogs(q);
    return paged(res, rows, count, q, { truncated });
  })
);

router.post(
  '/access/archive',
  route(async (req, res) => {
    const result = await archiveAccessLog();
    await audit(req, 'ARCHIVE', 'AccessLog', null, result);
    return ok(res, result);
  })
);

router.get(
  '/:id',
  route(async (req, res) => ok(res, await getAuditLog(parse(uuidParam, req.params).id)))
);

export default defineModule({ path: '/audit-logs', router });
