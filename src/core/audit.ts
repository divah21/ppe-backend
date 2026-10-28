import type { Request } from 'express';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { createAuditLog } = require('../../middlewares/audit_middleware');

/**
 * Records a domain event in the audit log. Mutations are already logged generically
 * by the v1 auto-audit middleware; use this for events that need a specific action name.
 */
export const audit = (
  req: Request,
  action: string,
  entityType: string,
  entityId: string | null,
  meta?: Record<string, unknown>,
  userId: string | null = req.auth?.userId ?? null
): Promise<void> => createAuditLog(userId, action, entityType, entityId, null, meta ?? null, req);
