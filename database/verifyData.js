const { sequelize } = require('./db');
const {
  PPEItem,
  Stock,
  User,
  Department,
  Employee,
  Role,
  Section,
  JobTitlePPEMatrix
} = require('../models');

const verifyData = async () => {
  try {
    console.log('🔍 Verifying database connection and data...\n');
    
    await sequelize.authenticate();
    console.log('✅ Database connected successfully\n');
    
    const stats = {
      roles: await Role.count(),
      users: await User.count(),
      departments: await Department.count(),
      sections: await Section.count(),
      employees: await Employee.count(),
      ppeItems: await PPEItem.count(),
      stock: await Stock.count(),
      jobTitleMatrix: await JobTitlePPEMatrix.count()
    };
    
    console.log('📊 Database Statistics:');
    console.log('========================');
    console.log(`   Roles: ${stats.roles}`);
    console.log(`   Users: ${stats.users}`);
    console.log(`   Departments: ${stats.departments}`);
    console.log(`   Sections: ${stats.sections}`);
    console.log(`   Employees: ${stats.employees}`);
    console.log(`   PPE Items: ${stats.ppeItems}`);
    console.log(`   Stock Records: ${stats.stock}`);
    console.log(`   Job Title Matrix Entries: ${stats.jobTitleMatrix}`);
    console.log('========================\n');
    
    console.log('✅ All data verified successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
};

verifyData();
