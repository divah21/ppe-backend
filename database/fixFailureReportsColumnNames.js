const { sequelize } = require('./db');

/**
 * Migration: Fix Failure Reports Column Names
 * - Rename failureDate to failure_date
 * - Rename brand to brand (already correct)
 * - Rename remarks to remarks (already correct)
 * 
 * This ensures all columns follow snake_case convention
 */

async function fixFailureReportsColumnNames() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Starting Failure Reports column name fix migration...\n');

    // Check if table exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('failure_reports')) {
      console.log('❌ failure_reports table does not exist. Skipping migration.');
      process.exit(0);
    }

    // Get current table structure
    const tableDescription = await queryInterface.describeTable('failure_reports');
    console.log('Current columns:', Object.keys(tableDescription));
    console.log('');

    // Rename failureDate to failure_date if it exists
    if (tableDescription.failureDate && !tableDescription.failure_date) {
      console.log('➕ Renaming failureDate to failure_date...');
      await sequelize.query(`
        ALTER TABLE failure_reports 
        RENAME COLUMN "failureDate" TO failure_date;
      `);
      console.log('✅ Renamed failureDate to failure_date\n');
    } else if (tableDescription.failure_date) {
      console.log('✅ failure_date column already exists (correct naming)\n');
    } else {
      console.log('⚠️  Neither failureDate nor failure_date found, creating failure_date...');
      await sequelize.query(`
        ALTER TABLE failure_reports 
        ADD COLUMN IF NOT EXISTS failure_date TIMESTAMP WITH TIME ZONE;
      `);
      console.log('✅ Created failure_date column\n');
    }

    // Check brand column
    if (tableDescription.brand) {
      console.log('✅ brand column exists (already correct naming)\n');
    } else {
      console.log('⚠️  brand column not found, creating it...');
      await sequelize.query(`
        ALTER TABLE failure_reports 
        ADD COLUMN IF NOT EXISTS brand VARCHAR(255);
      `);
      console.log('✅ Created brand column\n');
    }

    // Check remarks column
    if (tableDescription.remarks) {
      console.log('✅ remarks column exists (already correct naming)\n');
    } else {
      console.log('⚠️  remarks column not found, creating it...');
      await sequelize.query(`
        ALTER TABLE failure_reports 
        ADD COLUMN IF NOT EXISTS remarks TEXT;
      `);
      console.log('✅ Created remarks column\n');
    }

    // Verify final structure
    const finalDescription = await queryInterface.describeTable('failure_reports');
    console.log('Final columns:', Object.keys(finalDescription));
    console.log('');

    console.log('✅ Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
fixFailureReportsColumnNames();
