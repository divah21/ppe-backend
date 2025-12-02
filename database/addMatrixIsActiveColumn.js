const { sequelize } = require('./db');
const { QueryTypes } = require('sequelize');

async function addIsActiveColumn() {
  try {
    console.log('🔄 Adding is_active column to job_title_ppe_matrix table...');

    // Check if column already exists
    const columns = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'job_title_ppe_matrix' 
       AND column_name = 'is_active'`,
      { type: QueryTypes.SELECT }
    );

    if (columns.length > 0) {
      console.log('⏭️  is_active column already exists');
    } else {
      // Add is_active column
      await sequelize.query(
        `ALTER TABLE job_title_ppe_matrix 
         ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL`
      );
      console.log('✅ Added is_active column');

      // Set all existing records to active
      await sequelize.query(
        `UPDATE job_title_ppe_matrix 
         SET is_active = true 
         WHERE is_active IS NULL`
      );
      console.log('✅ Set all existing records to active');
    }

    console.log('✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addIsActiveColumn();
