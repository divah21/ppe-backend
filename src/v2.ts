import cookieParser from 'cookie-parser';
import { Router } from 'express';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { ensureIndexes } from '../database/indexes';
import { configError } from './core/config';
import { errorHandler, notFoundHandler } from './core/errors';
import { sequelize } from './core/db';
import { logger } from './core/logger';
import { ensureTransferSchema } from './core/schema';
import type { V2Module } from './core/module';
import { ensureSessionTable, purgeStaleSessions } from './core/sessions';

// Cross-site requests never reach this router: the app-level CORS allowlist rejects any
// Origin it does not know (403), and the session cookies are SameSite=Lax.

const loadModules = (): V2Module[] => {
  const dir = path.join(__dirname, 'modules');
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      /* eslint-disable-next-line @typescript-eslint/no-require-imports */
      const mod: V2Module = require(path.join(dir, entry.name)).default;
      if (!mod?.router || !mod.path?.startsWith('/')) throw new Error(`src/modules/${entry.name} has no default V2Module`);
      return mod;
    })
    .sort((a, b) => b.path.length - a.path.length);
};

export const createV2Router = () => {
  const router = Router();
  if (configError) {
    router.use((_req, res) => {
      res.status(503).json({ error: { code: 'UNAVAILABLE', message: 'This service is not configured yet' } });
    });
    return router;
  }
  router.use(cookieParser());
  // Readiness, not just liveness: the deploy check must fail when Postgres is down
  router.get('/health', async (_req, res) => {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000).unref());
    try {
      await Promise.race([sequelize.authenticate(), timeout]);
      res.json({ data: { status: 'ok' } });
    } catch (err) {
      logger.error({ err }, 'v2 health check failed');
      res.status(503).json({ error: { code: 'UNAVAILABLE', message: 'Database unavailable' } });
    }
  });
  for (const mod of loadModules()) router.use(mod.path, mod.router);
  router.use(notFoundHandler);
  router.use(errorHandler);
  return router;
};

/** Schema the v2 API needs before it serves traffic. */
export const prepareV2 = async () => {
  // v1 records transfers too, so this runs even when v2 itself is not configured
  await ensureTransferSchema();
  if (configError) return;
  await ensureSessionTable();
  await ensureIndexes(sequelize);
  await purgeStaleSessions();
};

/** Periodic upkeep for the long-running server (the API is a single PM2 fork). */
export const startV2Maintenance = () => {
  if (configError) return;
  setInterval(
    () => purgeStaleSessions().catch((err) => logger.error({ err }, 'auth session purge failed')),
    6 * 60 * 60 * 1000
  ).unref();
};
