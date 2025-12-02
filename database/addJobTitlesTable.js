const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

async function addJobTitlesTable() {
  try {
    console.log('🔄 Creating job_titles table and adding jobTitleId to employees...\n');

    // Create job_titles table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS job_titles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE,
        description TEXT,
        "sectionId" UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        "isActive" BOOLEAN DEFAULT true NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_job_title_per_section UNIQUE (name, "sectionId")
      );
    `);
    console.log('✅ Created job_titles table');

    // Check if jobTitleId column exists in employees table
    const [existingColumn] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      AND column_name = 'jobTitleId';
    `);

    if (existingColumn.length === 0) {
      // Add jobTitleId column to employees table
      await sequelize.query(`
        ALTER TABLE employees 
        ADD COLUMN "jobTitleId" UUID REFERENCES job_titles(id) ON DELETE SET NULL;
      `);
      console.log('✅ Added jobTitleId column to employees table');
    } else {
      console.log('ℹ️  jobTitleId column already exists in employees table');
    }

    // Check if jobTitleId column exists in job_title_ppe_matrix table
    const [existingMatrixColumn] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'job_title_ppe_matrix' 
      AND column_name = 'jobTitleId';
    `);

    if (existingMatrixColumn.length === 0) {
      // Add jobTitleId column to job_title_ppe_matrix table
      await sequelize.query(`
        ALTER TABLE job_title_ppe_matrix 
        ADD COLUMN "jobTitleId" UUID REFERENCES job_titles(id) ON DELETE CASCADE;
      `);
      console.log('✅ Added jobTitleId column to job_title_ppe_matrix table');
    } else {
      console.log('ℹ️  jobTitleId column already exists in job_title_ppe_matrix table');
    }

    // Create index for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_job_titles_section 
      ON job_titles("sectionId");
    `);
    console.log('✅ Created index on job_titles(sectionId)');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_job_title 
      ON employees("jobTitleId");
    `);
    console.log('✅ Created index on employees(jobTitleId)');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_matrix_job_title 
      ON job_title_ppe_matrix("jobTitleId");
    `);
    console.log('✅ Created index on job_title_ppe_matrix(jobTitleId)');

    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addJobTitlesTable();
