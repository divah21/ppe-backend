const { sequelize } = require('./db');

async function addColumns() {
  try {
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
    `);
    console.log('Added department_id column');

    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id);
    `);
    console.log('Added section_id column');

    console.log('Migration complete!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

addColumns();
