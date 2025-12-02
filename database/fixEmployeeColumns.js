const { sequelize } = require('./db');

async function fixEmployeeColumns() {
  try {
    console.log('🔄 Fixing employee table columns to use camelCase...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check if columns need to be renamed
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      AND column_name IN ('section_id', 'cost_center_id', 'job_title_id', 'works_number', 'employee_id', 'first_name', 'last_name', 'email', 'phone_number', 'job_title', 'job_type', 'date_of_birth', 'date_joined', 'is_active', 'created_at', 'updated_at');
    `);

    console.log('📝 Current columns:', columns.map(c => c.column_name).join(', '));

    // Rename columns from snake_case to camelCase
    if (columns.some(c => c.column_name === 'section_id')) {
      console.log('📝 Renaming section_id to sectionId...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN section_id TO "sectionId";`);
      console.log('✅ Renamed section_id to sectionId\n');
    }

    if (columns.some(c => c.column_name === 'cost_center_id')) {
      console.log('📝 Renaming cost_center_id to costCenterId...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN cost_center_id TO "costCenterId";`);
      console.log('✅ Renamed cost_center_id to costCenterId\n');
    }

    if (columns.some(c => c.column_name === 'job_title_id')) {
      console.log('📝 Renaming job_title_id to jobTitleId...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN job_title_id TO "jobTitleId";`);
      console.log('✅ Renamed job_title_id to jobTitleId\n');
    }

    if (columns.some(c => c.column_name === 'works_number')) {
      console.log('📝 Renaming works_number to worksNumber...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN works_number TO "worksNumber";`);
      console.log('✅ Renamed works_number to worksNumber\n');
    }

    if (columns.some(c => c.column_name === 'employee_id')) {
      console.log('📝 Renaming employee_id to employeeId...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN employee_id TO "employeeId";`);
      console.log('✅ Renamed employee_id to employeeId\n');
    }

    if (columns.some(c => c.column_name === 'first_name')) {
      console.log('📝 Renaming first_name to firstName...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN first_name TO "firstName";`);
      console.log('✅ Renamed first_name to firstName\n');
    }

    if (columns.some(c => c.column_name === 'last_name')) {
      console.log('📝 Renaming last_name to lastName...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN last_name TO "lastName";`);
      console.log('✅ Renamed last_name to lastName\n');
    }

    if (columns.some(c => c.column_name === 'phone_number')) {
      console.log('📝 Renaming phone_number to phoneNumber...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN phone_number TO "phoneNumber";`);
      console.log('✅ Renamed phone_number to phoneNumber\n');
    }

    if (columns.some(c => c.column_name === 'job_title')) {
      console.log('📝 Renaming job_title to jobTitle...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN job_title TO "jobTitle";`);
      console.log('✅ Renamed job_title to jobTitle\n');
    }

    if (columns.some(c => c.column_name === 'job_type')) {
      console.log('📝 Renaming job_type to jobType...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN job_type TO "jobType";`);
      console.log('✅ Renamed job_type to jobType\n');
    }

    if (columns.some(c => c.column_name === 'date_of_birth')) {
      console.log('📝 Renaming date_of_birth to dateOfBirth...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN date_of_birth TO "dateOfBirth";`);
      console.log('✅ Renamed date_of_birth to dateOfBirth\n');
    }

    if (columns.some(c => c.column_name === 'date_joined')) {
      console.log('📝 Renaming date_joined to dateJoined...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN date_joined TO "dateJoined";`);
      console.log('✅ Renamed date_joined to dateJoined\n');
    }

    if (columns.some(c => c.column_name === 'is_active')) {
      console.log('📝 Renaming is_active to isActive...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN is_active TO "isActive";`);
      console.log('✅ Renamed is_active to isActive\n');
    }

    if (columns.some(c => c.column_name === 'created_at')) {
      console.log('📝 Renaming created_at to createdAt...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN created_at TO "createdAt";`);
      console.log('✅ Renamed created_at to createdAt\n');
    }

    if (columns.some(c => c.column_name === 'updated_at')) {
      console.log('📝 Renaming updated_at to updatedAt...');
      await sequelize.query(`ALTER TABLE employees RENAME COLUMN updated_at TO "updatedAt";`);
      console.log('✅ Renamed updated_at to updatedAt\n');
    }

    console.log('✅ All employee columns fixed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

fixEmployeeColumns();
