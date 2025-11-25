const { sequelize } = require('./db');

const migrateRequestWorkflow = async () => {
  try {
    console.log('Starting request workflow migration...');

    // Step 0: Clean up any leftover old types
    await sequelize.query(`
      DROP TYPE IF EXISTS enum_requests_status_old CASCADE;
    `);

    // Step 1: Drop default value
    await sequelize.query(`
      ALTER TABLE requests 
      ALTER COLUMN status DROP DEFAULT;
    `);

    // Step 2: Drop constraint
    await sequelize.query(`
      ALTER TABLE requests 
      DROP CONSTRAINT IF EXISTS requests_status_check;
    `);

    // Step 3: Rename old enum type
    await sequelize.query(`
      ALTER TYPE enum_requests_status RENAME TO enum_requests_status_old;
    `);

    // Step 4: Create new enum type
    await sequelize.query(`
      CREATE TYPE enum_requests_status AS ENUM (
        'pending',
        'dept-rep-review',
        'hod-review',
        'stores-review',
        'approved',
        'fulfilled',
        'rejected',
        'cancelled'
      );
    `);

    // Step 5: Update column to use new enum
    await sequelize.query(`
      ALTER TABLE requests 
      ALTER COLUMN status TYPE enum_requests_status 
      USING status::text::enum_requests_status;
    `);

    // Step 6: Set default value
    await sequelize.query(`
      ALTER TABLE requests 
      ALTER COLUMN status SET DEFAULT 'pending'::enum_requests_status;
    `);

    // Step 7: Drop old enum type
    await sequelize.query(`
      DROP TYPE enum_requests_status_old;
    `);

    // Add new columns if they don't exist
    await sequelize.query(`
      ALTER TABLE requests 
      ADD COLUMN IF NOT EXISTS section_rep_approval_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS section_rep_comment TEXT,
      ADD COLUMN IF NOT EXISTS fulfilled_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS fulfilled_by_user_id UUID REFERENCES users(id);
    `);

    // Rename completed_date to fulfilled_date if it exists
    await sequelize.query(`
      ALTER TABLE requests 
      DROP COLUMN IF EXISTS completed_date;
    `);

    console.log('✅ Request workflow migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  migrateRequestWorkflow()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateRequestWorkflow;
