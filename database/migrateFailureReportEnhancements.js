const { sequelize } = require('./db');

/**
 * Migration: Enhance Failure Reports Table
 * - Add failureDate column
 * - Add brand column  
 * - Add remarks column
 * - Update failureType enum values
 * - Update status enum values
 */

async function migrateFailureReportEnhancements() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Starting Failure Report enhancements migration...\n');

    // 1. Check if table exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('failure_reports')) {
      console.log('⚠️  failure_reports table does not exist. Creating it...');
      
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS failure_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "employeeId" UUID NOT NULL REFERENCES employees(id),
          "ppeItemId" UUID NOT NULL REFERENCES ppe_items(id),
          "allocationId" UUID REFERENCES allocations(id),
          description TEXT NOT NULL,
          "failureType" VARCHAR(50) DEFAULT 'damage',
          "observedAt" VARCHAR(255),
          "reportedDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "failureDate" TIMESTAMP WITH TIME ZONE,
          brand VARCHAR(255),
          remarks TEXT,
          "reviewedBySHEQ" BOOLEAN DEFAULT false,
          "sheqDecision" TEXT,
          "sheqReviewDate" TIMESTAMP WITH TIME ZONE,
          "actionTaken" TEXT,
          severity VARCHAR(50) DEFAULT 'medium',
          status VARCHAR(50) DEFAULT 'pending',
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      console.log('✅ Created failure_reports table\n');
    } else {
      console.log('✅ failure_reports table exists\n');
    }

    // 2. Check and add missing columns
    const tableDescription = await queryInterface.describeTable('failure_reports');
    
    if (!tableDescription.failureDate) {
      console.log('➕ Adding failureDate column...');
      await sequelize.query(`
        ALTER TABLE failure_reports 
        ADD COLUMN IF NOT EXISTS "failureDate" TIMESTAMP WITH TIME ZONE;
      `);
      console.log('✅ Added failureDate column\n');
    } else {
      console.log('✅ failureDate column already exists\n');
    }

    if (!tableDescription.brand) {
      console.log('➕ Adding brand column...');
      await sequelize.query(`
        ALTER TABLE failure_reports 
        ADD COLUMN IF NOT EXISTS brand VARCHAR(255);
      `);
      console.log('✅ Added brand column\n');
    } else {
      console.log('✅ brand column already exists\n');
    }

    if (!tableDescription.remarks) {
      console.log('➕ Adding remarks column...');
      await sequelize.query(`
        ALTER TABLE failure_reports 
        ADD COLUMN IF NOT EXISTS remarks TEXT;
      `);
      console.log('✅ Added remarks column\n');
    } else {
      console.log('✅ remarks column already exists\n');
    }

    // 3. Update failure_type column to accept new values (already VARCHAR, no constraint needed)
    console.log('✅ failure_type column ready (VARCHAR type)\n');

    // 4. Update status column to accept new values (already VARCHAR, no constraint needed)
    console.log('🔄 Updating status values...');
    await sequelize.query(`
      -- Update existing values to match new enum
      UPDATE failure_reports SET status = 'pending' WHERE status = 'reported';
      UPDATE failure_reports SET status = 'investigating' WHERE status = 'under-review';
      UPDATE failure_reports SET status = 'resolved' WHERE status = 'closed';
    `);
    console.log('✅ Updated status values\n');

    console.log('✅ ========================================');
    console.log('   Migration completed successfully!');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFailureReportEnhancements()
    .then(() => {
      console.log('✅ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateFailureReportEnhancements;
