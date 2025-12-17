/**
 * Migration: Refactor User-Employee Relationship
 * 
 * This migration:
 * 1. Adds employeeId FK and roleId to users table
 * 2. Adds gender and contractType columns to employees table
 * 3. Removes redundant columns from users table
 * 4. Links existing users to employees where possible (via worksNumber match)
 * 
 * Run: node database/migrations/001_user_employee_refactor.js
 */

const { sequelize } = require('../db');
const { QueryTypes } = require('sequelize');

async function up() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting migration: User-Employee Refactor...\n');

    // Step 1: Add new columns to employees table
    console.log('1. Adding gender and contractType to employees...');
    await sequelize.query(`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "contractType" VARCHAR(50);
    `, { transaction });
    console.log('   ✓ Done\n');

    // Step 2: Add employeeId column to users table
    console.log('2. Adding employeeId to users table...');
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS employee_id UUID UNIQUE REFERENCES employees(id);
    `, { transaction });
    console.log('   ✓ Done\n');

    // Step 3: Add roleId if not exists (it should exist but just in case)
    console.log('3. Ensuring roleId exists on users table...');
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);
    `, { transaction });
    console.log('   ✓ Done\n');

    // Step 4: Try to link existing users to employees via worksNumber
    console.log('4. Attempting to link existing users to employees...');
    const result = await sequelize.query(`
      UPDATE users u
      SET employee_id = e.id
      FROM employees e
      WHERE u.works_number = e."worksNumber"
      AND u.employee_id IS NULL
      AND u.works_number IS NOT NULL
      RETURNING u.id, u.username, e."worksNumber";
    `, { transaction, type: QueryTypes.SELECT });
    console.log(`   ✓ Linked ${result.length} users to employees\n`);

    // Step 5: Report which columns can be safely removed
    console.log('5. The following columns on users table are now redundant:');
    console.log('   - first_name (use employee.firstName)');
    console.log('   - last_name (use employee.lastName)');
    console.log('   - email (use employee.email)');
    console.log('   - phone (use employee.phoneNumber)');
    console.log('   - works_number (use employee.worksNumber)');
    console.log('   - department_id (use employee.section.departmentId)');
    console.log('   - section_id (use employee.sectionId)');
    console.log('\n   NOTE: We will NOT drop these columns automatically.');
    console.log('   Run the dropRedundantColumns function manually after verifying data.\n');

    await transaction.commit();
    console.log('✅ Migration completed successfully!\n');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

async function dropRedundantColumns() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Dropping redundant columns from users table...\n');
    console.log('⚠️  WARNING: This is irreversible! Make sure you have backed up your data.\n');

    // Check if any users exist without employee links
    const [orphanedUsers] = await sequelize.query(`
      SELECT id, username, first_name, last_name, email 
      FROM users 
      WHERE employee_id IS NULL
    `, { transaction });

    if (orphanedUsers.length > 0) {
      console.log('⚠️  Found users without employee links:');
      orphanedUsers.forEach(u => {
        console.log(`   - ${u.username} (${u.first_name} ${u.last_name})`);
      });
      console.log('\n   These users will lose their personal data if you proceed.');
      console.log('   Consider creating employee records for them first, or');
      console.log('   these might be system admin accounts that don\'t need employee links.\n');
    }

    // Drop columns
    await sequelize.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS first_name,
      DROP COLUMN IF EXISTS last_name,
      DROP COLUMN IF EXISTS email,
      DROP COLUMN IF EXISTS phone,
      DROP COLUMN IF EXISTS works_number,
      DROP COLUMN IF EXISTS department_id,
      DROP COLUMN IF EXISTS section_id;
    `, { transaction });

    await transaction.commit();
    console.log('✅ Redundant columns dropped successfully!\n');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Failed to drop columns:', error.message);
    throw error;
  }
}

async function down() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Rolling back migration...\n');

    // Re-add columns to users table
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS works_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id),
      ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id);
    `, { transaction });

    // Copy data back from employees
    await sequelize.query(`
      UPDATE users u
      SET 
        first_name = e."firstName",
        last_name = e."lastName",
        email = e.email,
        phone = e."phoneNumber",
        works_number = e."worksNumber",
        section_id = e."sectionId"
      FROM employees e
      WHERE u.employee_id = e.id;
    `, { transaction });

    // Update department_id from section
    await sequelize.query(`
      UPDATE users u
      SET department_id = s."departmentId"
      FROM sections s
      WHERE u.section_id = s.id;
    `, { transaction });

    await transaction.commit();
    console.log('✅ Rollback completed!\n');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'up') {
    up()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (command === 'down') {
    down()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (command === 'drop-redundant') {
    dropRedundantColumns()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    console.log('Usage: node 001_user_employee_refactor.js [up|down|drop-redundant]');
    process.exit(1);
  }
}

module.exports = { up, down, dropRedundantColumns };
