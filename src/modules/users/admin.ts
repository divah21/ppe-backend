import { QueryTypes } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { inTransaction, models, sequelize } from '../../core/db';
import { conflict, notFound } from '../../core/errors';
import { assertUnreferenced, type Reference } from '../sections/references';

/** Counts for the users screen's cards. */
export const userSummary = async () => {
  const [r] = await sequelize.query<Record<string, string>>(
    `SELECT COUNT(*) FILTER (WHERE is_active) AS active,
            COUNT(*) FILTER (WHERE NOT is_active) AS inactive,
            COUNT(*) FILTER (WHERE is_active AND last_login IS NULL) AS never,
            COUNT(*) FILTER (WHERE is_active AND last_login >= NOW() - interval '30 days') AS recent,
            COUNT(*) FILTER (WHERE is_active AND must_change_password) AS must_change,
            COUNT(*) FILTER (WHERE is_active AND employee_id IS NULL) AS standalone
     FROM users`,
    { type: QueryTypes.SELECT }
  );
  const n = (k: string) => Number(r?.[k] ?? 0);
  return {
    active: n('active'),
    inactive: n('inactive'),
    neverSignedIn: n('never'),
    signedInLast30Days: n('recent'),
    mustChangePassword: n('must_change'),
    withoutEmployee: n('standalone'),
  };
};

// Deleting would blank the user out of these records (or fail), so any of them blocks it
const REFERENCES: Reference[] = [
  { key: 'requests', sql: 'SELECT COUNT(*) FROM requests WHERE requested_by_id = :id', one: 'request raised', many: 'requests raised' },
  {
    key: 'approvals',
    sql: `SELECT COUNT(*) FROM requests WHERE :id IN (section_rep_approver_id, dept_rep_approver_id, hod_approver_id, stores_approver_id, rejected_by_id, fulfilled_by_user_id)`,
    one: 'request decision',
    many: 'request decisions',
  },
  { key: 'issues', sql: 'SELECT COUNT(*) FROM allocations WHERE issued_by_id = :id', one: 'PPE issue', many: 'PPE issues' },
  { key: 'audit', sql: 'SELECT COUNT(*) FROM audit_logs WHERE user_id = :id', one: 'audit log entry', many: 'audit log entries' },
  { key: 'budgets', sql: 'SELECT COUNT(*) FROM company_budgets WHERE created_by_id = :id', one: 'company budget', many: 'company budgets' },
  {
    key: 'consumableRequests',
    sql: 'SELECT COUNT(*) FROM consumable_requests WHERE :id IN (requested_by_id, hod_approver_id, stores_approver_id)',
    one: 'consumable request',
    many: 'consumable requests',
  },
  {
    key: 'consumableIssues',
    sql: 'SELECT COUNT(*) FROM consumable_allocations WHERE :id IN (issued_by_id, received_by_id)',
    one: 'consumable issue',
    many: 'consumable issues',
  },
  { key: 'documents', sql: 'SELECT COUNT(*) FROM documents WHERE uploaded_by_id = :id', one: 'document', many: 'documents' },
];

/**
 * Deletes an account that was never used, such as one made by mistake (v1 permanent delete). An
 * account with any history is deactivated instead, so who did what stays on record.
 */
export const deleteUser = async (auth: AuthContext, id: string) =>
  inTransaction(async (t) => {
    if (id === auth.userId) throw conflict('You cannot delete your own account');
    const row = await models.User.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!row) throw notFound('User');
    if (row.lastLogin) throw conflict('This account has been used to sign in. Deactivate it instead so its history stays on record.');
    await assertUnreferenced(id, REFERENCES, t, (uses) => `This account has ${uses}. Deactivate it instead so its history stays on record.`);
    await row.destroy({ transaction: t });
  });
