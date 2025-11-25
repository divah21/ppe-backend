const { sequelize } = require('./db');
const { QueryTypes } = require('sequelize');

async function fixStockSizeData() {
  try {
    console.log('Starting migration: Fix stock size data...\n');

    // 1. Find all stock records with multiple sizes in one field
    const problematicStock = await sequelize.query(`
      SELECT id, ppe_item_id, size, color, quantity, location
      FROM stocks
      WHERE size LIKE '%,%'
      ORDER BY ppe_item_id;
    `, { type: QueryTypes.SELECT });

    console.log(`Found ${problematicStock.length} stock records with multiple sizes`);

    if (problematicStock.length > 0) {
      console.log('\n⚠️  WARNING: These stock records have multiple sizes in one record:');
      problematicStock.forEach(stock => {
        console.log(`  - Stock ID: ${stock.id}`);
        console.log(`    Sizes: ${stock.size}`);
        console.log(`    Quantity: ${stock.quantity} (This needs to be split per size!)`);
        console.log('');
      });

      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('You need to manually split these records. For example:');
      console.log('If a stock record has:');
      console.log('  - size: "L, M, XL, S, 32"');
      console.log('  - quantity: 75');
      console.log('\nYou should create separate records:');
      console.log('  - size: "L",  quantity: 15');
      console.log('  - size: "M",  quantity: 15');
      console.log('  - size: "XL", quantity: 15');
      console.log('  - size: "S",  quantity: 15');
      console.log('  - size: "32", quantity: 15');
      console.log('\n(Distribute the total quantity 75 across the 5 sizes)');
    }

    // 2. Update Knee Pads to have size variants
    const kneePadsResult = await sequelize.query(`
      UPDATE ppe_items
      SET 
        has_size_variants = true,
        size_scale = 'CLOTHING',
        available_sizes = '["32", "34", "36", "38", "40", "42", "44", "46", "48", "50", "XS", "S", "M", "L", "XL", "2XL", "3XL"]'::jsonb
      WHERE name ILIKE '%knee%pad%'
      RETURNING id, name, has_size_variants, size_scale, available_sizes;
    `, { type: QueryTypes.UPDATE });

    if (kneePadsResult[1] > 0) {
      console.log('\n✓ Updated Knee Pads PPE item:');
      console.log('  - has_size_variants: true');
      console.log('  - size_scale: CLOTHING');
      console.log('  - available_sizes: [32-50, XS-3XL]');
    }

    // 3. Show guidance for common PPE items
    console.log('\n📋 Recommended size configurations for common PPE:');
    console.log('');
    console.log('CLOTHING (Overalls, Jackets, Pants, Knee Pads):');
    console.log('  sizeScale: "CLOTHING"');
    console.log('  availableSizes: ["32","34","36","38","40","42","44","46","48","50","XS","S","M","L","XL","2XL","3XL"]');
    console.log('');
    console.log('FOOTWEAR (Boots, Shoes, Gumboots):');
    console.log('  sizeScale: "FOOTWEAR"');
    console.log('  availableSizes: ["4","5","6","7","8","9","10","11","12"]');
    console.log('');
    console.log('GLOVES:');
    console.log('  sizeScale: "GLOVES"');
    console.log('  availableSizes: ["XS","S","M","L","XL","2XL","3XL"]');
    console.log('');
    console.log('NO SIZES (Helmets, Goggles, Earplugs):');
    console.log('  hasSizeVariants: false');
    console.log('  sizeScale: null');
    console.log('  availableSizes: null');
    console.log('  stock.size: null');

    console.log('\n✅ Migration analysis completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  fixStockSizeData()
    .then(() => {
      console.log('\nMigration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = fixStockSizeData;
