const { sequelize } = require('./db');

async function checkColumns() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'job_title_ppe_matrix' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n=== Columns in job_title_ppe_matrix table ===');
    results.forEach(r => console.log('  -', r.column_name));
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
