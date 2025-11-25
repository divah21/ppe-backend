const { User, Role, Department } = require('../models');

const seedAdditionalUsers = async () => {
  try {
    console.log('Starting additional user seeding...');

    // Get roles
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    const storesRole = await Role.findOne({ where: { name: 'stores' } });
    const sectionRepRole = await Role.findOne({ where: { name: 'section-rep' } });
    const deptRepRole = await Role.findOne({ where: { name: 'department-rep' } });
    const hodRole = await Role.findOne({ where: { name: 'hod-hos' } });
    const sheqRole = await Role.findOne({ where: { name: 'sheq' } });

    // Get departments
    const opsDept = await Department.findOne({ where: { code: 'OPS' } });
    const engDept = await Department.findOne({ where: { code: 'ENG' } });
    const safetyDept = await Department.findOne({ where: { code: 'SAFE' } });

    const newUsers = [
      {
        username: 'hod_ops',
        email: 'hod_ops@ppe-system.com',
        passwordHash: 'HOD@123',
        firstName: 'Operations',
        lastName: 'Head',
        roleId: hodRole?.id,
        departmentId: opsDept?.id
      },
      {
        username: 'dept_rep',
        email: 'dept_rep@ppe-system.com',
        passwordHash: 'DeptRep@123',
        firstName: 'Department',
        lastName: 'Representative',
        roleId: deptRepRole?.id,
        departmentId: engDept?.id
      },
      {
        username: 'section_rep',
        email: 'section_rep@ppe-system.com',
        passwordHash: 'SectionRep@123',
        firstName: 'Section',
        lastName: 'Representative',
        roleId: sectionRepRole?.id,
        departmentId: engDept?.id
      },
      {
        username: 'sheq_officer',
        email: 'sheq_officer@ppe-system.com',
        passwordHash: 'SHEQ@123',
        firstName: 'SHEQ',
        lastName: 'Officer',
        roleId: sheqRole?.id,
        departmentId: safetyDept?.id
      }
    ];

    // Create or update users
    for (const userData of newUsers) {
      const existing = await User.findOne({ where: { username: userData.username } });
      
      if (existing) {
        // Update password
        await existing.update({ passwordHash: userData.passwordHash });
        console.log(`✅ Updated user: ${userData.username}`);
      } else {
        // Create new user
        await User.create(userData, { individualHooks: true });
        console.log(`✅ Created user: ${userData.username}`);
      }
    }

    console.log('\n📊 User Credentials Summary:');
    console.log('   hod_ops / HOD@123 (HOD - Operations)');
    console.log('   dept_rep / DeptRep@123 (Dept Representative)');
    console.log('   section_rep / SectionRep@123 (Section Representative)');
    console.log('   sheq_officer / SHEQ@123 (SHEQ Officer)');
    console.log('   admin / Admin@123 (System Administrator)');
    console.log('   stores_mgr / Stores@123 (Stores Manager)');
    console.log('\n✅ Additional users seeded successfully');

  } catch (error) {
    console.error('❌ Error seeding additional users:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  const { sequelize } = require('./db');
  seedAdditionalUsers()
    .then(() => {
      console.log('User seeding completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedAdditionalUsers;
