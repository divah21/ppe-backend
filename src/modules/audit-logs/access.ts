import fs from 'node:fs';
import path from 'node:path';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../core/db';
import type { AccessLogQuery } from './schemas';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { rotateAccessLog, flushAccessLog } = require('../../../middlewares/audit_middleware') as {
  rotateAccessLog: (o?: { maxBytes?: number; keep?: number }) => Promise<boolean>;
  flushAccessLog: () => Promise<void>;
};

const ACCESS_LOG_FILE = path.join(process.cwd(), 'logs', 'access.log');
/** Only the newest part of the file is read, so a large log never stalls the request */
export const ACCESS_TAIL_BYTES = 8 * 1024 * 1024;

interface AccessEntry {
  timestamp: string;
  method: string;
  url: string;
  userId: string | null;
  username: string;
  role: string | null;
  ipAddress: string | null;
  responseTime: string | null;
}

const readTail = async () => {
  const handle = await fs.promises.open(ACCESS_LOG_FILE, 'r').catch(() => null);
  if (!handle) return { text: '', truncated: false };
  try {
    const { size } = await handle.stat();
    const start = Math.max(0, size - ACCESS_TAIL_BYTES);
    const buffer = Buffer.alloc(size - start);
    await handle.read(buffer, 0, buffer.length, start);
    let text = buffer.toString('utf8');
    // A cut-off first line is dropped
    if (start > 0) text = text.slice(text.indexOf('\n') + 1);
    return { text, truncated: start > 0 };
  } finally {
    await handle.close();
  }
};

const endOfDay = (d: string) => new Date(new Date(`${d}T00:00:00`).getTime() + 86_400_000);

/** Pages people opened (v1 access logs), newest first, from the access log file. */
export const listAccessLogs = async (q: AccessLogQuery) => {
  await flushAccessLog();
  const { text, truncated } = await readTail();
  const from = q.from ? new Date(`${q.from}T00:00:00`).getTime() : null;
  const to = q.to ? endOfDay(q.to).getTime() : null;
  const term = q.q?.toLowerCase();
  const rows: AccessEntry[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let e: AccessEntry;
    try {
      e = JSON.parse(line) as AccessEntry;
    } catch {
      continue;
    }
    const at = Date.parse(e.timestamp);
    if (from !== null && at < from) continue;
    if (to !== null && at >= to) continue;
    if (q.userId && e.userId !== q.userId) continue;
    if (term && !e.url?.toLowerCase().includes(term) && !e.username?.toLowerCase().includes(term)) continue;
    rows.push({
      timestamp: e.timestamp,
      method: e.method,
      url: e.url,
      userId: e.userId ?? null,
      username: e.username,
      role: e.role ?? null,
      ipAddress: e.ipAddress ?? null,
      responseTime: e.responseTime ?? null,
    });
  }
  rows.reverse();
  const offset = (q.page - 1) * q.pageSize;
  return { rows: rows.slice(offset, offset + q.pageSize), count: rows.length, truncated };
};

/** Archives the current access log and starts an empty one (v1 "clear access logs"). */
export const archiveAccessLog = async () => {
  await flushAccessLog();
  // Unlike size rotation, an archive asked for by an admin never prunes older archives
  const archived = await rotateAccessLog({ maxBytes: 1, keep: Number.MAX_SAFE_INTEGER });
  return { archived };
};

/** Figures for the audit screen's cards. */
export const auditStats = async () => {
  const [r] = await sequelize.query<Record<string, string | null>>(
    `SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE created_at >= NOW() - interval '24 hours') AS last_day,
            COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - interval '7 days') AS users_week,
            COUNT(*) FILTER (WHERE action = 'LOGIN' AND created_at >= NOW() - interval '7 days') AS logins_week,
            (SELECT action FROM audit_logs WHERE created_at >= NOW() - interval '7 days' AND action <> 'LOGIN'
              GROUP BY action ORDER BY COUNT(*) DESC, action LIMIT 1) AS top_action
     FROM audit_logs`,
    { type: QueryTypes.SELECT }
  );
  const n = (k: string) => Number(r?.[k] ?? 0);
  return {
    total: n('total'),
    last24Hours: n('last_day'),
    activeUsersLast7Days: n('users_week'),
    signInsLast7Days: n('logins_week'),
    topActionLast7Days: (r?.top_action as string | null) ?? null,
  };
};
