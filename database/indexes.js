'use strict';

// Secondary indexes for the large tables. Postgres does not index foreign keys, and
// sequelize.sync never added these, so scope joins and date filters scanned whole tables.
const INDEXES = [
  ['request_items_request_idx', 'request_items (request_id)'],
  ['allocations_employee_item_issue_idx', 'allocations (employee_id, ppe_item_id, issue_date DESC)'],
  ['allocations_ppe_item_idx', 'allocations (ppe_item_id)'],
  ['allocations_issue_date_idx', 'allocations (issue_date)'],
  ['allocations_request_idx', 'allocations (request_id)'],
  ['allocations_request_item_idx', 'allocations (request_item_id)'],
  ['allocations_department_issue_idx', 'allocations (department_id, issue_date)'],
  ['allocations_section_issue_idx', 'allocations (section_id, issue_date)'],
  ['requests_employee_idx', 'requests (employee_id)'],
  ['requests_created_idx', 'requests (created_at DESC, id DESC)'],
  ['requests_status_idx', 'requests (status)'],
  ['requests_section_idx', 'requests (section_id)'],
  ['requests_department_idx', 'requests (department_id)'],
  ['audit_logs_created_idx', 'audit_logs (created_at DESC, id DESC)'],
  ['audit_logs_user_idx', 'audit_logs (user_id)'],
  ['audit_logs_entity_idx', 'audit_logs (entity_type, entity_id)'],
  ['employees_section_idx', 'employees ("sectionId")'],
  ['sections_department_idx', 'sections (department_id)'],
  ['failure_reports_employee_idx', 'failure_reports (employee_id)'],
  ['failure_reports_reported_idx', 'failure_reports (reported_date)'],
];

/**
 * Idempotent. Each index is built CONCURRENTLY, one statement at a time and outside any
 * transaction, so live tables keep taking writes. A failed concurrent build leaves an
 * INVALID index that IF NOT EXISTS would skip forever, so those are dropped first.
 * Failures are logged, never thrown: a missing index must not stop the API starting.
 */
const ensureIndexes = async (sequelize) => {
  for (const [name, definition] of INDEXES) {
    try {
      const [invalid] = await sequelize.query(
        `SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
         WHERE c.relname = :name AND NOT i.indisvalid`,
        { replacements: { name } }
      );
      if (invalid.length) await sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS ${name}`);
      await sequelize.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON ${definition}`);
    } catch (error) {
      console.warn(`Could not create index ${name}: ${error.message}`);
    }
  }
};

module.exports = { INDEXES, ensureIndexes };
