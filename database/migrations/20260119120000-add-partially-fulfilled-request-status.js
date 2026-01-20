"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add the new enum value if it doesn't already exist
    return queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_requests_status' AND e.enumlabel = 'partially-fulfilled'
        ) THEN
          ALTER TYPE "enum_requests_status" ADD VALUE 'partially-fulfilled';
        END IF;
      END$$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Removing enum values requires recreating the type without the value.
    // This operation will fail if there are rows using the value.
    return queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_requests_status' AND e.enumlabel = 'partially-fulfilled'
        ) THEN
          ALTER TYPE enum_requests_status RENAME TO enum_requests_status_old;
          CREATE TYPE enum_requests_status AS ENUM('pending','dept-rep-review','hod-review','stores-review','approved','fulfilled','rejected','cancelled','sheq-review');
          ALTER TABLE requests ALTER COLUMN status TYPE enum_requests_status USING (status::text)::enum_requests_status;
          DROP TYPE enum_requests_status_old;
        END IF;
      END$$;
    `);
  }
};
