import cookieParser from 'cookie-parser';
import { Router, type RequestHandler } from 'express';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { config } from './core/config';
import { AppError, errorHandler, notFoundHandler } from './core/errors';
import type { V2Module } from './core/module';
import { ensureSessionTable } from './core/sessions';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cookie auth is only safe if other sites cannot drive it. SameSite=Lax covers most of that;
 * this also rejects state-changing requests whose Origin is not one of ours.
 */
const sameOriginWrites: RequestHandler = (req, _res, next) => {
  const origin = req.get('origin');
  if (SAFE_METHODS.has(req.method) || !origin || config.allowedOrigins.includes(origin)) return next();
  next(new AppError('FORBIDDEN', 'Cross-site request blocked'));
};

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
  router.use(cookieParser());
  router.use(sameOriginWrites);
  router.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));
  for (const mod of loadModules()) router.use(mod.path, mod.router);
  router.use(notFoundHandler);
  router.use(errorHandler);
  return router;
};

/** Schema the v2 API needs before it serves traffic. */
export const prepareV2 = () => ensureSessionTable();
