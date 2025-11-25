const { sequelize } = require('./db');
const models = require('../models');

const syncDatabase = async (options = {}) => {
  try {
    console.log('🔄 Starting database synchronization...\n');
    
    // Sync all models - creates new tables
    await sequelize.sync(options);
    
    console.log('\n✅ Database synchronized successfully!');
    console.log('\n📊 Models synced:');
    console.log('   - Roles');
    console.log('   - Users');
    console.log('   - Departments');
    console.log('   - Sections');
    console.log('   - Employees');
    console.log('   - PPE Items');
    console.log('   - Stocks');
    console.log('   - Requests');
    console.log('   - Request Items');
    console.log('   - Allocations');
    console.log('   - Budgets');
    console.log('   - Failure Reports');
    console.log('   - Audit Logs');
    console.log('   - Documents');
    console.log('   - Forecasts');
    
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
