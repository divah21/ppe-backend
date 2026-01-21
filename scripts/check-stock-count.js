// Load models with associations
require('../models');
const { Stock, PPEItem } = require('../models');

async function checkCounts() {
  try {
    console.log('Connecting to database...');
    
    // Use non-raw mode to get ppeItemId via association
    const allStock = await Stock.findAll();
    console.log('Total Stock rows:', allStock.length);
    
    // Check ppeItemId values
    const ppeIds = allStock.map(s => s.ppeItemId);
    console.log('Sample ppeItemId values:', ppeIds.slice(0, 5));
    const uniquePPEIds = [...new Set(ppeIds.filter(id => id))];
    console.log('Unique PPE Items in Stock table:', uniquePPEIds.length);
    
    const allPPEItems = await PPEItem.findAll();
    console.log('Total PPE Items in PPEItem table:', allPPEItems.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkCounts();
