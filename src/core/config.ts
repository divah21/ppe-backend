import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  // Refuse to start rather than run with a weak or missing secret
  throw new Error(`Invalid environment for /api/v2:\n${issues}`);
}

const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  jwtSecret: env.JWT_SECRET,
  allowedOrigins: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  accessTokenTtlSec: env.ACCESS_TOKEN_TTL_MIN * 60,
  sessionTtlMs: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  cookieSecure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
} as const;
