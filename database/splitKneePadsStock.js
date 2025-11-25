const { sequelize } = require('./db');
const { QueryTypes } = require('sequelize');

async function splitKneePadsStock() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting to split Knee Pads stock record...\n');

    const stockId = '656af754-cfdb-48f1-8f03-02da47f50762';
    const ppeItemId = '2908a9cf-fb55-4635-a317-035368babd65';

    // Get the original stock record
    const [originalStock] = await sequelize.query(`
      SELECT * FROM stocks WHERE id = :stockId
    `, { 
      replacements: { stockId },
      type: QueryTypes.SELECT,
      transaction 
    });

    console.log('Original stock record:');
    console.log(`  Size: ${originalStock.size}`);
    console.log(`  Quantity: ${originalStock.quantity}`);
    console.log(`  Total to distribute: ${originalStock.quantity}\n`);

    // Parse the sizes
    const sizes = originalStock.size.split(',').map(s => s.trim());
    console.log(`Found ${sizes.length} sizes: ${sizes.join(', ')}\n`);

    // Calculate quantity per size (distribute evenly)
    const qtyPerSize = Math.floor(originalStock.quantity / sizes.length);
    const remainder = originalStock.quantity % sizes.length;

    console.log(`Distributing: ${qtyPerSize} per size`);
    if (remainder > 0) {
      console.log(`Remainder: ${remainder} (will add 1 extra to first ${remainder} sizes)\n`);
    }

    // Create separate stock records for each size
    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      const quantity = qtyPerSize + (i < remainder ? 1 : 0);

      await sequelize.query(`
        INSERT INTO stocks (
          id,
          ppe_item_id,
          quantity,
          min_level,
          max_level,
          reorder_point,
          unit_cost,
          unit_price_usd,
          total_value_usd,
          stock_account,
          location,
          bin_location,
          batch_number,
          expiry_date,
          size,
          color,
          last_restocked,
          last_stock_take,
          notes,
          eligible_departments,
          eligible_sections,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          :ppeItemId,
          :quantity,
          :minLevel,
          :maxLevel,
          :reorderPoint,
          :unitCost,
          :unitPriceUSD,
          :totalValueUSD,
          :stockAccount,
          :location,
          :binLocation,
          :batchNumber,
          :expiryDate,
          :size,
          :color,
          :lastRestocked,
          :lastStockTake,
          :notes,
          :eligibleDepartments,
          :eligibleSections,
          NOW(),
          NOW()
        )
      `, {
        replacements: {
          ppeItemId,
          quantity,
          minLevel: Math.ceil(originalStock.min_level / sizes.length),
          maxLevel: originalStock.max_level,
          reorderPoint: originalStock.reorder_point ? Math.ceil(originalStock.reorder_point / sizes.length) : null,
          unitCost: originalStock.unit_cost,
          unitPriceUSD: originalStock.unit_price_usd,
          totalValueUSD: (quantity * parseFloat(originalStock.unit_price_usd)).toFixed(2),
          stockAccount: originalStock.stock_account,
          location: originalStock.location,
          binLocation: originalStock.bin_location,
          batchNumber: originalStock.batch_number,
          expiryDate: originalStock.expiry_date,
          size: size,
          color: originalStock.color,
          lastRestocked: originalStock.last_restocked,
          lastStockTake: originalStock.last_stock_take,
          notes: originalStock.notes,
          eligibleDepartments: originalStock.eligible_departments,
          eligibleSections: originalStock.eligible_sections
        },
        type: QueryTypes.INSERT,
        transaction
      });

      console.log(`✓ Created stock record for size ${size}: quantity = ${quantity}`);
    }

    // Delete the original combined record
    await sequelize.query(`
      DELETE FROM stocks WHERE id = :stockId
    `, {
      replacements: { stockId },
      type: QueryTypes.DELETE,
      transaction
    });

    console.log(`\n✓ Deleted original combined stock record`);

    await transaction.commit();

    console.log('\n✅ Stock split completed successfully!');
    console.log('\nNew stock records created:');
    
    const newStocks = await sequelize.query(`
      SELECT size, quantity, min_level, total_value_usd
      FROM stocks
      WHERE ppe_item_id = :ppeItemId
      ORDER BY size
    `, {
      replacements: { ppeItemId },
      type: QueryTypes.SELECT
    });

    newStocks.forEach(stock => {
      console.log(`  Size ${stock.size.padEnd(3)}: Qty ${stock.quantity.toString().padStart(2)}, Min ${stock.min_level}, Value $${stock.total_value_usd}`);
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Failed to split stock:', error);
    throw error;
  }
}

// Run script
if (require.main === module) {
  splitKneePadsStock()
    .then(() => {
      console.log('\nScript completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = splitKneePadsStock;
