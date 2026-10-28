import type { Transaction } from 'sequelize';
import { sequelize } from '../../core/db';
import { conflict } from '../../core/errors';

/** A table that points at the row: a COUNT query using :id, and how to name what it counts. */
export interface Reference {
  key: string;
  sql: string;
  one: string;
  many: string;
}

/**
 * Throws a 409 naming everything that still uses the row. Call inside the delete transaction,
 * after locking the row, so a reference cannot be added between the check and the delete.
 */
export const assertUnreferenced = async (id: string, refs: Reference[], t: Transaction, describe: (uses: string) => string) => {
  const select = refs.map((r) => `(${r.sql}) AS "${r.key}"`).join(', ');
  const [rows] = (await sequelize.query(`SELECT ${select}`, { replacements: { id }, transaction: t })) as [
    Array<Record<string, string>>,
    unknown,
  ];
  const counts = rows[0] ?? {};
  const used = refs.map((r) => ({ ...r, n: Number(counts[r.key] ?? 0) })).filter((r) => r.n > 0);
  if (used.length === 0) return;
  const parts = used.map((u) => `${u.n} ${u.n === 1 ? u.one : u.many}`);
  throw conflict(describe(parts.join(', ')), Object.fromEntries(used.map((u) => [u.key, u.n])));
};
