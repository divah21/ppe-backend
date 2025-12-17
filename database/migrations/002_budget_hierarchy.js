/**
 * Migration: Budget Hierarchy System
 * 
 * This migration:
 * 1. Creates company_budgets table for organization-wide annual PPE budgets
 * 2. Adds new columns to budgets table for hierarchy support
 *    - company_budget_id (FK to company_budgets)
 *    - allocated_amount (amount allocated from company budget)
 *    - total_spent (calculated from allocations)
 *    - month (for monthly budget breakdowns)
 * 
 * Run: node database/migrations/002_budget_hierarchy.js
 */

const { sequelize } = require('../db');
const { QueryTypes } = require('sequelize');

async function up() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting migration: Budget Hierarchy System...\n');

    // Step 1: Create company_budgets table
    console.log('1. Creating company_budgets table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS company_budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fiscal_year INTEGER NOT NULL UNIQUE,
        total_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
        allocated_to_departments DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
        start_date DATE,
        end_date DATE,
        notes TEXT,
        created_by_id UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });
    console.log('   ✓ company_budgets table created\n');

    // Step 2: Create index on fiscal_year
    console.log('2. Creating index on fiscal_year...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_company_budgets_fiscal_year 
      ON company_budgets(fiscal_year);
    `, { transaction });
    console.log('   ✓ Index created\n');

    // Step 3: Add company_budget_id column to budgets table
    console.log('3. Adding company_budget_id to budgets table...');
    await sequelize.query(`
      ALTER TABLE budgets 
      ADD COLUMN IF NOT EXISTS company_budget_id UUID REFERENCES company_budgets(id) ON DELETE SET NULL;
    `, { transaction });
    console.log('   ✓ company_budget_id column added\n');

    // Step 4: Add allocated_amount column to budgets table
    console.log('4. Adding allocated_amount to budgets table...');
    await sequelize.query(`
      ALTER TABLE budgets 
      ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(15,2) DEFAULT 0;
    `, { transaction });
    console.log('   ✓ allocated_amount column added\n');

    // Step 5: Add total_spent column to budgets table
    console.log('5. Adding total_spent to budgets table...');
    await sequelize.query(`
      ALTER TABLE budgets 
      ADD COLUMN IF NOT EXISTS total_spent DECIMAL(15,2) DEFAULT 0;
    `, { transaction });
    console.log('   ✓ total_spent column added\n');

    // Step 6: Add month column to budgets table
    console.log('6. Adding month column to budgets table...');
    await sequelize.query(`
      ALTER TABLE budgets 
      ADD COLUMN IF NOT EXISTS month INTEGER CHECK (month >= 1 AND month <= 12);
    `, { transaction });
    console.log('   ✓ month column added\n');

    // Step 7: Create index on company_budget_id
    console.log('7. Creating index on budgets.company_budget_id...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_company_budget_id 
      ON budgets(company_budget_id);
    `, { transaction });
    console.log('   ✓ Index created\n');

    // Step 8: Migrate existing budget data
    console.log('8. Migrating existing budget data...');
    // Copy total_budget to allocated_amount for existing records
    const updateResult = await sequelize.query(`
      UPDATE budgets 
      SET allocated_amount = COALESCE(total_budget, 0)
      WHERE allocated_amount IS NULL OR allocated_amount = 0;
    `, { transaction });
    console.log('   ✓ Existing budgets updated with allocated_amount\n');

    // Step 9: Calculate and update total_spent from allocations for each department budget
    console.log('9. Calculating total_spent from allocations...');
    await sequelize.query(`
      UPDATE budgets b
      SET total_spent = COALESCE((
        SELECT SUM(a.total_cost)
        FROM allocations a
        JOIN employees e ON a.employee_id = e.id
        JOIN sections s ON e."sectionId" = s.id
        WHERE s.department_id = b.department_id
        AND EXTRACT(YEAR FROM a.issue_date) = b.fiscal_year
      ), 0);
    `, { transaction });
    console.log('   ✓ total_spent calculated from allocations\n');

    await transaction.commit();
    console.log('✅ Migration completed successfully!\n');

    // Print summary
    console.log('Summary of changes:');
    console.log('-------------------');
    console.log('1. Created company_budgets table for organization-wide budgets');
    console.log('2. Added company_budget_id FK to budgets table');
    console.log('3. Added allocated_amount column to budgets table');
    console.log('4. Added total_spent column to budgets table');
    console.log('5. Added month column to budgets table');
    console.log('6. Migrated existing budget data');
    console.log('\nNext steps:');
    console.log('- Create a company budget for the current fiscal year');
    console.log('- Allocate budget to departments from the company budget');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    throw error;
  }
}

async function down() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Rolling back migration: Budget Hierarchy System...\n');

    // Remove columns from budgets table
    console.log('1. Removing columns from budgets table...');
    await sequelize.query(`
      ALTER TABLE budgets 
      DROP COLUMN IF EXISTS month,
      DROP COLUMN IF EXISTS total_spent,
      DROP COLUMN IF EXISTS allocated_amount,
      DROP COLUMN IF EXISTS company_budget_id;
    `, { transaction });
    console.log('   ✓ Columns removed\n');

    // Drop company_budgets table
    console.log('2. Dropping company_budgets table...');
    await sequelize.query(`
      DROP TABLE IF EXISTS company_budgets CASCADE;
    `, { transaction });
    console.log('   ✓ Table dropped\n');

    await transaction.commit();
    console.log('✅ Rollback completed successfully!\n');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
}

// Run migration
const args = process.argv.slice(2);
if (args.includes('--down') || args.includes('-d')) {
  down()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  up()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { up, down };
