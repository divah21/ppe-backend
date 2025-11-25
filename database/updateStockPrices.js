const { Stock, PPEItem } = require('../models');

const updateStockPrices = async () => {
  try {
    console.log('Starting stock price updates...');

    // PPE item unit prices in USD
    const ppePrices = {
      'Safety Helmet': 25,
      'Safety Boots': 85,
      'Safety Gloves': 12,
      'Welding Gloves': 28,
      'Safety Goggles': 15,
      'Welding Helmet': 120,
      'Hi-Vis Vest': 18,
      'Dust Mask': 3,
      'Respirator': 45,
      'Ear Plugs': 2,
      'Ear Muffs': 22,
      'Coveralls': 35,
      'Apron (Leather)': 55,
      'Face Shield': 30,
      'Knee Pads': 25
    };

    let totalUpdated = 0;

    // Update all PPE stock items with prices
    for (const [itemName, price] of Object.entries(ppePrices)) {
      // Find PPEItem first
      const ppeItem = await PPEItem.findOne({ where: { name: itemName } });
      
      if (!ppeItem) {
        console.log(`⚠️  PPE Item not found: ${itemName}`);
        continue;
      }

      // Update all stock records for this PPE item
      const stockItems = await Stock.findAll({ where: { ppeItemId: ppeItem.id } });
      
      for (const stock of stockItems) {
        const totalValue = parseFloat(stock.quantity) * price;
        await stock.update({
          unitPriceUSD: price,
          totalValueUSD: totalValue
        });
        totalUpdated++;
      }
      
      if (stockItems.length > 0) {
        console.log(`✅ Updated ${itemName}: $${price} (${stockItems.length} stock records)`);
      }
    }

    // Verify total valuation
    const allStock = await Stock.findAll({ include: [{ model: PPEItem, as: 'ppeItem' }] });
    let totalValue = 0;
    allStock.forEach(item => {
      const itemValue = parseFloat(item.totalValueUSD || 0);
      totalValue += itemValue;
    });

    console.log('\n📊 Stock Valuation Summary:');
    console.log(`   Total Stock Records Updated: ${totalUpdated}`);
    console.log(`   Total Items in Stock: ${allStock.length}`);
    console.log(`   Total Stock Value: $${totalValue.toFixed(2)}`);
    console.log('\n✅ Stock prices updated successfully');

  } catch (error) {
    console.error('❌ Error updating stock prices:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  const { sequelize } = require('./db');
  updateStockPrices()
    .then(() => {
      console.log('Stock price update completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Update failed:', error);
      process.exit(1);
    });
}

module.exports = updateStockPrices;
