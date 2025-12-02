const { sequelize } = require('./db');
const { QueryTypes } = require('sequelize');

async function addSheqFields() {
  try {
    console.log('🔄 Adding SHEQ fields to requests table...');

    // Check if columns already exist
    const columns = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'requests' AND column_name IN ('sheq_approval_date', 'sheq_comment', 'sheq_approver_id')`,
      { type: QueryTypes.SELECT }
    );

    const existingColumns = columns.map(col => col.column_name);

    // Add sheq_approval_date if not exists
    if (!existingColumns.includes('sheq_approval_date')) {
      await sequelize.query(
        `ALTER TABLE requests ADD COLUMN sheq_approval_date TIMESTAMP WITH TIME ZONE`,
        { type: QueryTypes.RAW }
      );
      console.log('✅ Added sheq_approval_date column');
    } else {
      console.log('⏭️  sheq_approval_date column already exists');
    }

    // Add sheq_comment if not exists
    if (!existingColumns.includes('sheq_comment')) {
      await sequelize.query(
        `ALTER TABLE requests ADD COLUMN sheq_comment TEXT`,
        { type: QueryTypes.RAW }
      );
      console.log('✅ Added sheq_comment column');
    } else {
      console.log('⏭️  sheq_comment column already exists');
    }

    // Add sheq_approver_id if not exists
    if (!existingColumns.includes('sheq_approver_id')) {
      await sequelize.query(
        `ALTER TABLE requests ADD COLUMN sheq_approver_id UUID REFERENCES users(id)`,
        { type: QueryTypes.RAW }
      );
      console.log('✅ Added sheq_approver_id column');
    } else {
      console.log('⏭️  sheq_approver_id column already exists');
    }

    // Update status enum to include sheq-review if not present
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

    console.log('\n✨ SHEQ fields migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding SHEQ fields:', error);
    process.exit(1);
  }
}

addSheqFields();
