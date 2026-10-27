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
      previous_hash CHAR(64),
      rotated_at TIMESTAMPTZ,
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

// Two tabs refreshing at once both send the same cookie; the loser is not a thief
const RACE_GRACE_SECONDS = 30;

type RotateResult =
  | { kind: 'rotated'; userId: string; sessionId: string; refreshToken: string }
  /** Lost a concurrent refresh; the winner's response already updated the shared cookie jar */
  | { kind: 'raced'; userId: string; sessionId: string }
  | null;

export const rotateSession = async (refreshToken: string): Promise<RotateResult> => {
  const [id, secret] = refreshToken.split('.');
  if (!id || !secret || !/^[0-9a-f-]{36}$/i.test(id)) return null;

  const next = newSecret();
  const current = hash(secret);
  // Atomic compare-and-swap: only one refresh with the current secret can win
  const [rotated] = await sequelize.query<{ user_id: string }>(
    `UPDATE auth_sessions
     SET previous_hash = secret_hash, secret_hash = :next, rotated_at = NOW(), last_used_at = NOW()
     WHERE id = :id AND secret_hash = :current AND revoked_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    { replacements: { id, next: hash(next), current }, type: QueryTypes.SELECT }
  );
  if (rotated) return { kind: 'rotated', userId: rotated.user_id, sessionId: id, refreshToken: `${id}.${next}` };

  const [raced] = await sequelize.query<{ user_id: string }>(
    `SELECT user_id FROM auth_sessions
     WHERE id = :id AND previous_hash = :current AND rotated_at > NOW() - make_interval(secs => :grace)
       AND revoked_at IS NULL AND expires_at > NOW()`,
    { replacements: { id, current, grace: RACE_GRACE_SECONDS }, type: QueryTypes.SELECT }
  );
  if (raced) return { kind: 'raced', userId: raced.user_id, sessionId: id };

  // An older secret for a live session: the token was copied and replayed, so end the session
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
