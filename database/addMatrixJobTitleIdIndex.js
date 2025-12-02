const { sequelize } = require('./db');

async function addJobTitleIdIndex() {
  try {
    console.log('🔄 Adding index on jobTitleId column in job_title_ppe_matrix...\n');

    // Check if index already exists
    const [existing] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'job_title_ppe_matrix' 
      AND indexname = 'idx_matrix_job_title_id';
    `);

    if (existing.length > 0) {
      console.log('ℹ️  Index idx_matrix_job_title_id already exists\n');
    } else {
      // Create index on jobTitleId
      await sequelize.query(`
        CREATE INDEX idx_matrix_job_title_id ON job_title_ppe_matrix("jobTitleId");
      `);
      console.log('✅ Created index idx_matrix_job_title_id on jobTitleId\n');
    }

    console.log('✅ Index migration complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addJobTitleIdIndex();
