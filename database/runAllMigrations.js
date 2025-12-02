const { sequelize } = require('./db');

/**
 * Master Migration Runner
 * Runs all migrations in the correct order for setting up a new database
 * or updating an existing one.
 */

async function runAllMigrations() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         PPE System - Database Migration Runner            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const migrations = [
    { name: 'Job Titles Table', file: './addJobTitlesTable.js' },
    { name: 'Matrix IsActive Column', file: './addMatrixIsActiveColumn.js' },
    { name: 'Matrix Job Title Index', file: './addMatrixJobTitleIdIndex.js' },
    { name: 'Variant Fields (PPE Items)', file: './addVariantFields.js' },
    { name: 'Requests Enhancements (SHEQ, Emergency/Visitor)', file: './migrate-requests-enhancements.js' },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    try {
      console.log(`\n📦 Running: ${migration.name}`);
      console.log('━'.repeat(60));
      
      const migrationModule = require(migration.file);
      
      // If the module exports a function, run it
      if (typeof migrationModule === 'function') {
        await migrationModule();
      }
      
      successCount++;
      console.log(`✅ Completed: ${migration.name}\n`);
    } catch (error) {
      failCount++;
      console.error(`❌ Failed: ${migration.name}`);
      console.error(`   Error: ${error.message}\n`);
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   Migration Summary                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`✅ Successful: ${successCount}/${migrations.length}`);
  console.log(`❌ Failed: ${failCount}/${migrations.length}\n`);

  if (failCount === 0) {
    console.log('🎉 All migrations completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: node database/syncTables.js (sync Sequelize models)');
    console.log('   2. Run: node database/seedData.js (seed initial data)');
  } else {
    console.log('⚠️  Some migrations failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllMigrations()
    .then(() => {
      console.log('\n✨ Migration runner completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration runner failed:', error);
      process.exit(1);
    });
}

module.exports = runAllMigrations;
