/**
 * Quick fix: Add missing columns to company_budgets table
 */
const { sequelize } = require('../db');

async function fix() {
  try {
    console.log('Adding missing columns to company_budgets...');
    await sequelize.query(`
      ALTER TABLE company_budgets 
      ADD COLUMN IF NOT EXISTS start_date DATE,
      ADD COLUMN IF NOT EXISTS end_date DATE;
    `);
    console.log('✅ Columns added successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

fix();
