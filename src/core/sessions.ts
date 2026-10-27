import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import { config } from './config';
import { sequelize } from './db';

/*
 * Server-side sessions backing the refresh cookie. The cookie holds "<sessionId>.<secret>";
 * only a hash of the secret is stored. Each refresh rotates the secret, and presenting an
 * old secret for a live session is treated as theft: the session is revoked.
 */

const hash = (secret: string) => createHash('sha256').update(secret).digest('hex');
const newSecret = () => randomBytes(32).toString('base64url');

/** Idempotent bootstrap, mirrored by migration 20261028000000-create-auth-sessions. */
export const ensureSessionTable = () =>
  sequelize.query(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      secret_hash CHAR(64) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      user_agent TEXT,
      ip TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);
  `);

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export const createSession = async (userId: string, meta: SessionMeta) => {
  const id = randomUUID();
  const secret = newSecret();
  await sequelize.query(
    `INSERT INTO auth_sessions (id, user_id, secret_hash, expires_at, user_agent, ip)
     VALUES (:id, :userId, :hash, :expiresAt, :userAgent, :ip)`,
    {
      replacements: {
        id,
        userId,
        hash: hash(secret),
        expiresAt: new Date(Date.now() + config.sessionTtlMs),
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
      },
    }
  );
  return { sessionId: id, refreshToken: `${id}.${secret}` };
};

type RotateResult = { userId: string; sessionId: string; refreshToken: string } | null;

export const rotateSession = async (refreshToken: string): Promise<RotateResult> => {
  const [id, secret] = refreshToken.split('.');
  if (!id || !secret || !/^[0-9a-f-]{36}$/i.test(id)) return null;

  const next = newSecret();
  // Atomic compare-and-swap: only one concurrent refresh with the current secret can win
  const rows = await sequelize.query<{ user_id: string }>(
    `UPDATE auth_sessions SET secret_hash = :next, last_used_at = NOW()
     WHERE id = :id AND secret_hash = :current AND revoked_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    { replacements: { id, next: hash(next), current: hash(secret) }, type: QueryTypes.SELECT }
  );
  const row = rows[0];
  if (row) return { userId: row.user_id, sessionId: id, refreshToken: `${id}.${next}` };

  // Wrong secret for a session that exists: an old token was replayed, so end the session
  await revokeSession(id);
  return null;
};

export const revokeSession = (sessionId: string) =>
  sequelize.query(`UPDATE auth_sessions SET revoked_at = NOW() WHERE id = :sessionId AND revoked_at IS NULL`, {
    replacements: { sessionId },
  });

export const revokeUserSessions = (userId: string, exceptSessionId?: string) =>
  sequelize.query(
    `UPDATE auth_sessions SET revoked_at = NOW()
     WHERE user_id = :userId AND revoked_at IS NULL AND (CAST(:except AS UUID) IS NULL OR id <> CAST(:except AS UUID))`,
    { replacements: { userId, except: exceptSessionId ?? null } }
  );

export const isSessionActive = async (sessionId: string) => {
  const rows = await sequelize.query(
    `SELECT 1 FROM auth_sessions WHERE id = :sessionId AND revoked_at IS NULL AND expires_at > NOW()`,
    { replacements: { sessionId }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
};
