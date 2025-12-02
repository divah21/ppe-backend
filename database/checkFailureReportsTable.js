const { sequelize } = require('./db');

async function checkTable() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'failure_reports' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 failure_reports table structure:');
    console.log('=====================================\n');
    results.forEach(col => {
      console.log(`${col.column_name.padEnd(25)} ${col.data_type}`);
    });
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTable();
