const { sequelize } = require('./db');

async function migrateFailureReports() {
  try {
    console.log('🔄 Migrating failure_reports table...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Drop the existing table
    console.log('📝 Dropping existing failure_reports table...');
    await sequelize.query(`DROP TABLE IF EXISTS failure_reports CASCADE;`);
    console.log('✅ Table dropped\n');

    // Create the table with correct schema
    console.log('📝 Creating failure_reports table with new schema...');
    await sequelize.query(`
      CREATE TABLE failure_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        ppe_item_id UUID NOT NULL REFERENCES ppe_items(id) ON DELETE CASCADE,
        allocation_id UUID REFERENCES allocations(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        failure_type VARCHAR(50) DEFAULT 'wear',
        observed_at VARCHAR(255),
        reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_by_s_h_e_q BOOLEAN DEFAULT false,
        sheq_decision TEXT,
        sheq_review_date TIMESTAMP,
        action_taken TEXT,
        severity VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'reported',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ failure_reports table created\n');

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateFailureReports();
