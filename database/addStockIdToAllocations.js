const { sequelize } = require('./db');

async function addStockIdToAllocations() {
  try {
    console.log('🔧 Adding stockId column to allocations table...');

    // Add stockId column
    await sequelize.query(`
      ALTER TABLE allocations 
      ADD COLUMN IF NOT EXISTS stock_id UUID;
    `);

    console.log('✅ Column stock_id added to allocations');

    // Add foreign key constraint
    await sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_allocation_stock'
        ) THEN
          ALTER TABLE allocations
          ADD CONSTRAINT fk_allocation_stock
          FOREIGN KEY (stock_id) REFERENCES stocks(id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    console.log('✅ Foreign key constraint fk_allocation_stock added');

    // Add index for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_allocations_stock_id ON allocations(stock_id);
    `);

    console.log('✅ Index idx_allocations_stock_id created');

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addStockIdToAllocations();
