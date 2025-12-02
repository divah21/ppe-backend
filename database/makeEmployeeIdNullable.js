const { sequelize } = require('./db');
const { QueryTypes } = require('sequelize');

async function makeEmployeeIdNullable() {
  try {
    console.log('Starting migration: Make employee_id nullable in requests table...');

    // Check current constraint
    const [constraint] = await sequelize.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'requests' 
      AND column_name = 'employee_id';
    `, { type: QueryTypes.SELECT });

    if (constraint && constraint.is_nullable === 'YES') {
      console.log('✓ Column employee_id is already nullable. Skipping...');
      return;
    }

    // Make employee_id nullable
    await sequelize.query(`
      ALTER TABLE requests 
      ALTER COLUMN employee_id DROP NOT NULL;
    `);

    console.log('✓ Made employee_id column nullable in requests table');
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Run migration
makeEmployeeIdNullable()
  .then(() => {
    console.log('✓ Migration finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  });
