const { sequelize } = require('./db');

async function updateFailureStatusEnum() {
  try {
    console.log('🔧 Updating failure_reports status enum...');

    // Drop the old enum type and create new one
    await sequelize.query(`
      -- First, add a temporary column
      ALTER TABLE failure_reports ADD COLUMN IF NOT EXISTS status_new TEXT;
    `);

    console.log('✅ Added temporary status_new column');

    // Map old values to new ones
    await sequelize.query(`
      UPDATE failure_reports
      SET status_new = CASE
        WHEN status = 'pending' THEN 'pending-sheq-review'
        WHEN status = 'investigating' THEN 'sheq-approved'
        WHEN status = 'resolved' THEN 'resolved'
        WHEN status = 'replaced' THEN 'replaced'
        ELSE 'pending-sheq-review'
      END;
    `);

    console.log('✅ Mapped old status values to new values');

    // Drop the old column
    await sequelize.query(`
      ALTER TABLE failure_reports DROP COLUMN status;
    `);

    console.log('✅ Dropped old status column');

    // Rename the new column
    await sequelize.query(`
      ALTER TABLE failure_reports RENAME COLUMN status_new TO status;
    `);

    console.log('✅ Renamed status_new to status');

    // Create the new enum type
    await sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_failure_reports_status_new') THEN
          CREATE TYPE enum_failure_reports_status_new AS ENUM (
            'pending-sheq-review',
            'sheq-approved', 
            'stores-processing',
            'resolved',
            'replaced'
          );
        END IF;
      END $$;
    `);

    console.log('✅ Created new enum type');

    // Convert the column to use the new enum
    await sequelize.query(`
      ALTER TABLE failure_reports 
      ALTER COLUMN status TYPE enum_failure_reports_status_new 
      USING status::text::enum_failure_reports_status_new;
    `);

    console.log('✅ Converted status column to new enum type');

    // Set default value
    await sequelize.query(`
      ALTER TABLE failure_reports 
      ALTER COLUMN status SET DEFAULT 'pending-sheq-review'::enum_failure_reports_status_new;
    `);

    console.log('✅ Set default value for status column');

    // Drop old enum if exists
    await sequelize.query(`
      DROP TYPE IF EXISTS "enum_failure_reports_status" CASCADE;
    `);

    console.log('✅ Dropped old enum type');

    // Rename new enum to standard name
    await sequelize.query(`
      ALTER TYPE enum_failure_reports_status_new RENAME TO "enum_failure_reports_status";
    `);

    console.log('✅ Renamed enum type to standard name');

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('New workflow statuses:');
    console.log('  - pending-sheq-review: Reported by Section Rep, awaiting SHEQ review');
    console.log('  - sheq-approved: Approved by SHEQ, ready for Stores processing');
    console.log('  - stores-processing: Being processed by Stores');
    console.log('  - resolved: Issue resolved');
    console.log('  - replaced: Item replaced');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

updateFailureStatusEnum();
