const { sequelize } = require('./db');
const { QueryTypes } = require('sequelize');

async function addIsEmergencyVisitorField() {
  try {
    console.log('Starting migration: Add isEmergencyVisitor field to requests table...');

    // Check if column already exists (use snake_case as PostgreSQL stores it)
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'requests' 
      AND column_name = 'is_emergency_visitor';
    `, { type: QueryTypes.SELECT });

    if (columns) {
      console.log('✓ Column is_emergency_visitor already exists. Skipping...');
      return;
    }

    // Add the is_emergency_visitor column (use snake_case for PostgreSQL)
    await sequelize.query(`
      ALTER TABLE requests 
      ADD COLUMN is_emergency_visitor BOOLEAN NOT NULL DEFAULT false;
    `);

    console.log('✓ Added is_emergency_visitor column to requests table');

    // Update existing requests to have is_emergency_visitor = false
    await sequelize.query(`
      UPDATE requests 
      SET is_emergency_visitor = false 
      WHERE is_emergency_visitor IS NULL;
    `);

    console.log('✓ Updated existing records with default value');
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Run migration
addIsEmergencyVisitorField()
  .then(() => {
    console.log('✓ Migration finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  });
