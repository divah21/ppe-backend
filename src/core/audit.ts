import type { Request } from 'express';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { createAuditLog } = require('../../middlewares/audit_middleware');

/**
 * Records a domain event in the audit log. Mutations are otherwise logged generically by the
 * v1 auto-audit middleware; use this for events that need a specific action name. The request
 * is then left out of the generic log, so the event is recorded once.
 */
export const audit = (
  req: Request,
  action: string,
  entityType: string,
  entityId: string | null,
  meta?: Record<string, unknown>,
  userId: string | null = req.auth?.userId ?? null
): Promise<void> => {
  skipAudit(req);
  return createAuditLog(userId, action, entityType, entityId, null, meta ?? null, req);
};

/** Keeps a request that changed nothing (a dry run, a repeated action) out of the generic log. */
export const skipAudit = (req: Request) => {
  (req as Request & { audited?: boolean }).audited = true;
};
