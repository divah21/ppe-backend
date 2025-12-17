const { sequelize } = require('./db');
const models = require('../models');
const bcrypt = require('bcryptjs');

// Default roles configuration
const DEFAULT_ROLES = [
  { name: 'admin', description: 'System Administrator - Full access to all features' },
  { name: 'stores', description: 'Stores Department - Manage stock and fulfill requests' },
  { name: 'section-rep', description: 'Section Representative - Create requests for section employees' },
  { name: 'department-rep', description: 'Department Representative - Oversee department PPE' },
  { name: 'hod', description: 'Head of Department/Section - Approve requests and view reports' },
  { name: 'sheq', description: 'SHEQ Officer - Safety compliance and audits' },
];

// Default admin user configuration
const DEFAULT_ADMIN = {
  username: 'sysadmin',
  password: 'Admin@123', // Should be changed on first login
  roleName: 'admin',
};

/**
 * Seed default roles
 */
const seedRoles = async () => {
  console.log('🔧 Checking roles...');
  
  for (const roleData of DEFAULT_ROLES) {
    const [role, created] = await models.Role.findOrCreate({
      where: { name: roleData.name },
      defaults: roleData,
    });
    
    if (created) {
      console.log(`   ✅ Created role: ${role.name}`);
    } else {
      console.log(`   ℹ️  Role exists: ${role.name}`);
    }
  }
};

/**
 * Seed default admin user
 */
const seedAdminUser = async () => {
  console.log('🔧 Checking admin user...');
  
  // Find admin role
  const adminRole = await models.Role.findOne({ where: { name: DEFAULT_ADMIN.roleName } });
  if (!adminRole) {
    console.log('   ❌ Admin role not found, skipping admin user creation');
    return;
  }
  
  // Check if any admin user exists
  const existingAdmin = await models.User.findOne({
    where: { roleId: adminRole.id },
  });
  
  if (existingAdmin) {
    console.log(`   ℹ️  Admin user already exists: ${existingAdmin.username}`);
    return;
  }
  
  // Create default admin user (no employee link - pure system admin)
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
  
  const adminUser = await models.User.create({
    username: DEFAULT_ADMIN.username,
    passwordHash: hashedPassword,
    roleId: adminRole.id,
    employeeId: null, // System admin without employee record
    isActive: true,
  }, {
    hooks: false, 
  });
  
  console.log(`   ✅ Created admin user: ${adminUser.username}`);
  console.log(`   ⚠️  Default password: ${DEFAULT_ADMIN.password} (CHANGE THIS IMMEDIATELY!)`);
};

const syncDatabase = async (options = {}) => {
  try {
    console.log('🔄 Starting database synchronization...\n');
    await sequelize.sync(options);
    
    // Seed default data after sync
    console.log('\n📦 Seeding default data...');
    await seedRoles();
    await seedAdminUser();
    
    console.log('\n✅ Database sync and seeding complete!');
    return true;
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    throw error;
  }
};

// Run sync if called directly
if (require.main === module) {
  const force = process.argv.includes('--force');
  const alter = process.argv.includes('--alter');
  
  if (force) {
    console.warn('⚠️  WARNING: Running with --force will DROP all tables!');
  }
  
  syncDatabase({ force, alter })
    .then(() => {
      console.log('\n✨ Sync complete!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n💥 Sync failed:', err);
      process.exit(1);
    });
}

module.exports = syncDatabase;
