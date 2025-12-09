const { sequelize } = require('./db');
const { QueryTypes } = require('sequelize');

async function addStockIdToFailureReports() {
  try {
    console.log('Adding stockId column to failure_reports table...');

    // Check if column already exists
    const [columns] = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'failure_reports' 
       AND column_name = 'stock_id'`,
      { type: QueryTypes.SELECT }
    );

    if (columns) {
      console.log('✓ stockId column already exists');
      return;
    }

    // Add stockId column
    await sequelize.query(`
      ALTER TABLE failure_reports 
      ADD COLUMN stock_id UUID NULL,
      ADD CONSTRAINT fk_failure_report_stock
        FOREIGN KEY (stock_id) REFERENCES stocks(id)
        ON DELETE SET NULL;
    `);

    console.log('✓ Added stockId column to failure_reports');

    // Add replacementStockId column for tracking the replacement
    const [replacementCol] = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'failure_reports' 
       AND column_name = 'replacement_stock_id'`,
      { type: QueryTypes.SELECT }
    );

    if (!replacementCol) {
      await sequelize.query(`
        ALTER TABLE failure_reports 
        ADD COLUMN replacement_stock_id UUID NULL,
        ADD CONSTRAINT fk_failure_report_replacement_stock
          FOREIGN KEY (replacement_stock_id) REFERENCES stocks(id)
          ON DELETE SET NULL;
      `);

      console.log('✓ Added replacement_stock_id column to failure_reports');
    }

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error adding stockId to failure_reports:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addStockIdToFailureReports()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addStockIdToFailureReports };
