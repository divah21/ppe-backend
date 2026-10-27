import { z } from 'zod';
import { logger } from './logger';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

const parsed = schema.safeParse(process.env);

/**
 * When the environment is unusable, v2 refuses to serve (503) instead of running with a weak
 * secret, while v1 keeps working. deploy.ps1 checks the same rules before deploying.
 */
export const configError = parsed.success
  ? null
  : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');

if (configError) logger.error({ configError }, 'v2 API disabled: invalid environment');

const env = parsed.success ? parsed.data : schema.parse({ ...process.env, JWT_SECRET: 'x'.repeat(32) });

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  jwtSecret: env.JWT_SECRET,
  accessTokenTtlSec: env.ACCESS_TOKEN_TTL_MIN * 60,
  sessionTtlMs: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  cookieSecure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
} as const;
