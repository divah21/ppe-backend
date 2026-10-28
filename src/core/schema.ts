import { QueryTypes } from 'sequelize';
import { sequelize } from './db';

/*
 * Additive schema the v2 API owns. Idempotent; runs on every start.
 *
 * Allocations record the section and department they were issued under, so spend stays with the
 * department that incurred it after an employee moves. A trigger fills them on every insert, so
 * v1 code that creates allocations needs no change. Rows from before this existed are backfilled
 * once, when the columns are added, from the employee's section then (the best record available).
 */
export const ensureTransferSchema = () =>
  sequelize.transaction(async (t) => {
    const run = (sql: string) => sequelize.query(sql, { transaction: t });
    // Fail the start rather than hang behind a long-running query on allocations
    await run(`SET LOCAL lock_timeout = '15s'`);

    // ALTER and CREATE TRIGGER lock the whole table, so they run only the first time
    const [state] = await sequelize.query<{ columns: string; trigger: boolean }>(
      `SELECT (SELECT COUNT(*) FROM information_schema.columns
                WHERE table_name = 'allocations' AND column_name IN ('section_id', 'department_id')) AS columns,
              EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'allocations_issue_scope') AS trigger`,
      { type: QueryTypes.SELECT, transaction: t }
    );
    const firstRun = Number(state?.columns) < 2;
    if (firstRun) {
      await run(`
        ALTER TABLE allocations ADD COLUMN IF NOT EXISTS section_id UUID;
        ALTER TABLE allocations ADD COLUMN IF NOT EXISTS department_id UUID;
        UPDATE allocations a SET section_id = e."sectionId", department_id = s.department_id
          FROM employees e LEFT JOIN sections s ON s.id = e."sectionId"
         WHERE e.id = a.employee_id;
      `);
    }
    await run(`
      CREATE OR REPLACE FUNCTION ppe_allocation_issue_scope() RETURNS trigger AS $$
      BEGIN
        IF NEW.section_id IS NULL THEN
          SELECT e."sectionId" INTO NEW.section_id FROM employees e WHERE e.id = NEW.employee_id;
        END IF;
        -- Visitor issues have no employee: they count against the section that raised the request
        IF NEW.section_id IS NULL AND NEW.request_id IS NOT NULL THEN
          SELECT r.section_id, r.department_id INTO NEW.section_id, NEW.department_id FROM requests r WHERE r.id = NEW.request_id;
        END IF;
        IF NEW.department_id IS NULL THEN
          SELECT s.department_id INTO NEW.department_id FROM sections s WHERE s.id = NEW.section_id;
        END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql;
    `);
    if (!state?.trigger) {
      await run(`
        CREATE TRIGGER allocations_issue_scope BEFORE INSERT ON allocations
          FOR EACH ROW EXECUTE PROCEDURE ppe_allocation_issue_scope();
      `);
    }
    // Visitor requests name the person, who has no employee record
    const [visitor] = await sequelize.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_name = 'requests' AND column_name = 'visitor_name'`,
      { type: QueryTypes.SELECT, transaction: t }
    );
    if (Number(visitor?.n) === 0) {
      await run(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS visitor_name VARCHAR(120), ADD COLUMN IF NOT EXISTS visitor_company VARCHAR(120)`);
    }
    await run(`
      CREATE TABLE IF NOT EXISTS employee_transfers (
        id UUID PRIMARY KEY,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        from_section_id UUID,
        to_section_id UUID,
        from_department_id UUID,
        to_department_id UUID,
        from_job_title_id UUID,
        to_job_title_id UUID,
        from_cost_center_id UUID,
        to_cost_center_id UUID,
        requests_restarted INTEGER NOT NULL DEFAULT 0,
        accounts_moved INTEGER NOT NULL DEFAULT 0,
        changed_by_id UUID,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS employee_transfers_employee_idx ON employee_transfers (employee_id, changed_at DESC);
    `);
  });
