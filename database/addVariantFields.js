const { sequelize } = require('./db');
const { QueryTypes } = require('sequelize');

async function addVariantFields() {
  try {
    console.log('Starting migration: Add variant fields to ppe_items...');

    // Add availableSizes column (JSONB array)
    await sequelize.query(`
      ALTER TABLE ppe_items 
      ADD COLUMN IF NOT EXISTS available_sizes JSONB DEFAULT NULL;
    `, { type: QueryTypes.RAW });
    console.log('✓ Added available_sizes column');

    // Add availableColors column (JSONB array)
    await sequelize.query(`
      ALTER TABLE ppe_items 
      ADD COLUMN IF NOT EXISTS available_colors JSONB DEFAULT NULL;
    `, { type: QueryTypes.RAW });
    console.log('✓ Added available_colors column');

    // Add comment for available_sizes
    await sequelize.query(`
      COMMENT ON COLUMN ppe_items.available_sizes IS 'JSON array of available sizes for this item';
    `, { type: QueryTypes.RAW });

    // Add comment for available_colors
    await sequelize.query(`
      COMMENT ON COLUMN ppe_items.available_colors IS 'JSON array of available colors for this item';
    `, { type: QueryTypes.RAW });

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update PPE items with hasSizeVariants=true to set available_sizes array');
    console.log('2. Update PPE items with hasColorVariants=true to set available_colors array');
    console.log('3. Ensure stock records only contain single size/color values');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  addVariantFields()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = addVariantFields;
