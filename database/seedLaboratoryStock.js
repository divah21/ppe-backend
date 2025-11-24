const { sequelize } = require('./db');
const { Stock, PPEItem } = require('../models');

/**
 * Laboratory Stock Valuation Data
 * Import stock with quantities and USD pricing
 */

const laboratoryStockData = [
  {
    itemRefCode: 'LA030301001',
    quantity: 2,
    unit: 'KG',
    unitPriceUSD: 879.24,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA036903001',
    quantity: 3530,
    unit: 'EA',
    unitPriceUSD: 1.15,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA036903002',
    quantity: 6250,
    unit: 'EA',
    unitPriceUSD: 0.35,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA036903003',
    quantity: 47,
    unit: 'KG',
    unitPriceUSD: 224.62,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA036903004',
    quantity: 2,
    unit: 'EA',
    unitPriceUSD: 1180.22,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA042522003',
    quantity: 18,
    unit: 'EA',
    unitPriceUSD: 193.57,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA051901001',
    quantity: 3,
    unit: 'L',
    unitPriceUSD: 29.41,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA052522001',
    quantity: 1850,
    unit: 'KG',
    unitPriceUSD: 3.92,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA052806001',
    quantity: 12.5,
    unit: 'L',
    unitPriceUSD: 9.74,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA052808001',
    quantity: 110,
    unit: 'L',
    unitPriceUSD: 7.67,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA052815001',
    quantity: 12.5,
    unit: 'KG',
    unitPriceUSD: 105.19,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA052832001',
    quantity: 60,
    unit: 'KG',
    unitPriceUSD: 5.98,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA052834001',
    quantity: 1400,
    unit: 'G',
    unitPriceUSD: 1.42,
    stockAccount: '710019',
    location: 'Laboratory Store'
  },
  {
    itemRefCode: 'LA052836001',
    quantity: 250,
    unit: 'KG',
    unitPriceUSD: 2.05,
    stockAccount: '710021',
    location: 'Laboratory Store'
  }
];

async function seedLaboratoryStock() {
  try {
    console.log('🌱 Starting laboratory stock seeding with valuation...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const stockData of laboratoryStockData) {
      try {
        const { itemRefCode, quantity, unitPriceUSD, stockAccount, location } = stockData;

        // Find the PPE item
        const ppeItem = await PPEItem.findOne({
          where: { itemRefCode }
        });

        if (!ppeItem) {
          console.log(`⚠️  PPE item not found for ${itemRefCode} - skipping`);
          errors++;
          continue;
        }

        // Calculate total value
        const totalValueUSD = parseFloat((quantity * unitPriceUSD).toFixed(2));

        // Find or create stock entry
        const [stock, isNew] = await Stock.findOrCreate({
          where: {
            ppeItemId: ppeItem.id,
            location: location || 'Laboratory Store'
          },
          defaults: {
            quantity,
            unitPriceUSD,
            totalValueUSD,
            stockAccount,
            minLevel: Math.floor(quantity * 0.2), // 20% of current as min
            reorderPoint: Math.floor(quantity * 0.3) // 30% of current as reorder point
          }
        });

        if (isNew) {
          console.log(`✅ Created stock: ${ppeItem.name} - ${quantity} ${ppeItem.unit} @ $${unitPriceUSD} = $${totalValueUSD}`);
          created++;
        } else {
          // Update existing stock
          stock.quantity = quantity;
          stock.unitPriceUSD = unitPriceUSD;
          stock.totalValueUSD = totalValueUSD;
          stock.stockAccount = stockAccount;
          await stock.save();
          console.log(`🔄 Updated stock: ${ppeItem.name} - ${quantity} ${ppeItem.unit} @ $${unitPriceUSD} = $${totalValueUSD}`);
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${stockData.itemRefCode}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 LABORATORY STOCK SEEDING SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total items processed: ${laboratoryStockData.length}`);
    console.log(`✅ Successfully created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);

    // Calculate total valuation
    const totalValuation = laboratoryStockData.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPriceUSD);
    }, 0);
    console.log(`💰 Total stock value: $${totalValuation.toFixed(2)} USD`);
    console.log('='.repeat(70));

    console.log('\n✅ Laboratory stock seeding completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
seedLaboratoryStock();
