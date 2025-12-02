const { sequelize } = require('./db');
const { QueryTypes } = require('sequelize');

/**
 * Comprehensive migration for Requests table enhancements
 * This migration includes:
 * 1. SHEQ approval workflow fields
 * 2. Emergency/visitor request support (isEmergencyVisitor field)
 * 3. Make employeeId nullable for guest/visitor requests
 * 4. Ensure requestedById, departmentId, sectionId exist
 */
async function migrateRequestsEnhancements() {
  try {
    console.log('🔄 Starting comprehensive requests table migration...\n');

    // 1. Check if is_emergency_visitor column exists
    const [emergencyVisitorCol] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'requests' 
      AND column_name = 'is_emergency_visitor';
    `, { type: QueryTypes.SELECT });

    if (!emergencyVisitorCol) {
      await sequelize.query(`
        ALTER TABLE requests 
        ADD COLUMN is_emergency_visitor BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log('✅ Added is_emergency_visitor column');
    } else {
      console.log('⏭️  is_emergency_visitor column already exists');
    }

    // 2. Make employee_id nullable (for guest/visitor requests)
    const [employeeIdConstraint] = await sequelize.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'requests' 
      AND column_name = 'employee_id';
    `, { type: QueryTypes.SELECT });

    if (employeeIdConstraint && employeeIdConstraint.is_nullable === 'NO') {
      await sequelize.query(`
        ALTER TABLE requests 
        ALTER COLUMN employee_id DROP NOT NULL;
      `);
      console.log('✅ Made employee_id column nullable');
    } else {
      console.log('⏭️  employee_id is already nullable');
    }

    // 3. Add SHEQ approval fields if they don't exist
    const columns = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'requests' 
       AND column_name IN ('sheq_approval_date', 'sheq_comment', 'sheq_approver_id')`,
      { type: QueryTypes.SELECT }
    );

    const existingColumns = columns.map(col => col.column_name);

    if (!existingColumns.includes('sheq_approval_date')) {
      await sequelize.query(
        `ALTER TABLE requests ADD COLUMN sheq_approval_date TIMESTAMP WITH TIME ZONE`,
        { type: QueryTypes.RAW }
      );
      console.log('✅ Added sheq_approval_date column');
    } else {
      console.log('⏭️  sheq_approval_date column already exists');
    }

    if (!existingColumns.includes('sheq_comment')) {
      await sequelize.query(
        `ALTER TABLE requests ADD COLUMN sheq_comment TEXT`,
        { type: QueryTypes.RAW }
      );
      console.log('✅ Added sheq_comment column');
    } else {
      console.log('⏭️  sheq_comment column already exists');
    }

    if (!existingColumns.includes('sheq_approver_id')) {
      await sequelize.query(
        `ALTER TABLE requests ADD COLUMN sheq_approver_id UUID REFERENCES users(id)`,
        { type: QueryTypes.RAW }
      );
      console.log('✅ Added sheq_approver_id column');
    } else {
      console.log('⏭️  sheq_approver_id column already exists');
    }

    // 4. Update status enum to include sheq-review if not present
    const enumCheck = await sequelize.query(
      `SELECT enumlabel FROM pg_enum 
       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_requests_status')
       AND enumlabel = 'sheq-review'`,
      { type: QueryTypes.SELECT }
    );

    if (enumCheck.length === 0) {
      await sequelize.query(
        `ALTER TYPE enum_requests_status ADD VALUE IF NOT EXISTS 'sheq-review'`,
        { type: QueryTypes.RAW }
      );
      console.log('✅ Added sheq-review to status enum');
    } else {
      console.log('⏭️  sheq-review status already exists in enum');
    }

    // 5. Ensure request_type enum has all values
    const requestTypeEnumCheck = await sequelize.query(
      `SELECT enumlabel FROM pg_enum 
       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_requests_request_type')`,
      { type: QueryTypes.SELECT }
    );

    const existingRequestTypes = requestTypeEnumCheck.map(e => e.enumlabel);
    const requiredTypes = ['new', 'replacement', 'emergency', 'annual'];

    for (const reqType of requiredTypes) {
      if (!existingRequestTypes.includes(reqType)) {
        await sequelize.query(
          `ALTER TYPE enum_requests_request_type ADD VALUE IF NOT EXISTS '${reqType}'`,
          { type: QueryTypes.RAW }
        );
        console.log(`✅ Added ${reqType} to request_type enum`);
      }
    }

    console.log('\n✨ Requests table migration completed successfully!');
    console.log('\n📝 Summary of changes:');
    console.log('   • is_emergency_visitor: Tracks guest/visitor requests');
    console.log('   • employee_id: Now nullable for guest/visitor requests');
    console.log('   • SHEQ fields: Support for SHEQ Manager approval workflow');
    console.log('   • Request types: new, replacement, emergency, annual');
    console.log('   • Status: Added sheq-review for replacement workflow\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrateRequestsEnhancements()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateRequestsEnhancements;
