const { sequelize } = require('./db');

async function checkIndexes() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'job_title_ppe_matrix'
      ORDER BY indexname;
    `);
    
    console.log('\n=== Indexes on job_title_ppe_matrix ===');
    results.forEach(r => {
      console.log(`\n${r.indexname}:`);
      console.log(`  ${r.indexdef}`);
    });
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkIndexes();
