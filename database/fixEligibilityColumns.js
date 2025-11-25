const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

async function fixEligibilityColumns() {
  try {
    console.log('Checking and fixing eligibility columns...\n');

    // Drop the incorrectly named columns if they exist
    await sequelize.query(`
      ALTER TABLE stocks 
      DROP COLUMN IF EXISTS "eligibleDepartments",
      DROP COLUMN IF EXISTS "eligibleSections";
    `);
    console.log('✓ Dropped any incorrectly named columns');

    // Add the correctly named columns
    await sequelize.query(`
      ALTER TABLE stocks 
      ADD COLUMN IF NOT EXISTS eligible_departments UUID[],
      ADD COLUMN IF NOT EXISTS eligible_sections UUID[];
    `);
    console.log('✓ Added eligible_departments column');
    console.log('✓ Added eligible_sections column');

    // Verify columns exist
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stocks' 
      AND column_name IN ('eligible_departments', 'eligible_sections')
      ORDER BY column_name;
    `);

    console.log('\n📊 Verification:');
    results.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n✅ Eligibility columns fixed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

fixEligibilityColumns()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
