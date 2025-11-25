const { Allocation, Employee, PPEItem, Stock } = require('../models');

const seedAllocations = async () => {
  try {
    console.log('Starting allocation seeding...');

    // Get all employees and PPE items
    const employees = await Employee.findAll();
    const ppeItems = await PPEItem.findAll();

    if (employees.length === 0 || ppeItems.length === 0) {
      console.log('No employees or PPE items found. Please seed them first.');
      return;
    }

    console.log(`Found ${employees.length} employees and ${ppeItems.length} PPE items`);

    // Helper function to get random date in past months
    const getRandomDateInPast = (monthsAgo) => {
      const date = new Date();
      date.setMonth(date.getMonth() - monthsAgo);
      date.setDate(Math.floor(Math.random() * 28) + 1); // Random day in month
      return date;
    };

    // Helper to get renewal date based on frequency
    const getNextRenewalDate = (issueDate, frequencyMonths) => {
      if (!frequencyMonths) return null;
      const renewal = new Date(issueDate);
      renewal.setMonth(renewal.getMonth() + frequencyMonths);
      return renewal;
    };

    // PPE item costs (rough estimates in USD)
    const itemCosts = {
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

    // Replacement frequencies in months
    const frequencies = {
      'Safety Helmet': 24,
      'Safety Boots': 12,
      'Safety Gloves': 3,
      'Welding Gloves': 6,
      'Safety Goggles': 12,
      'Welding Helmet': 24,
      'Hi-Vis Vest': 12,
      'Dust Mask': 1,
      'Respirator': 6,
      'Ear Plugs': 1,
      'Ear Muffs': 18,
      'Coveralls': 6,
      'Apron (Leather)': 12,
      'Face Shield': 12,
      'Knee Pads': 12
    };

    const allocations = [];

    // Create allocations for the past 6 months
    for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
      // Number of allocations per month (varies)
      const allocationsThisMonth = Math.floor(Math.random() * 15) + 20; // 20-35 allocations per month

      for (let i = 0; i < allocationsThisMonth; i++) {
        const employee = employees[Math.floor(Math.random() * employees.length)];
        const ppeItem = ppeItems[Math.floor(Math.random() * ppeItems.length)];
        
        const issueDate = getRandomDateInPast(monthsAgo);
        const unitCost = itemCosts[ppeItem.name] || 20;
        const quantity = ['Dust Mask', 'Ear Plugs', 'Safety Gloves'].includes(ppeItem.name) 
          ? Math.floor(Math.random() * 3) + 2  // 2-4 pairs/units for consumables
          : 1; // 1 for durable items
        
        const totalCost = unitCost * quantity;
        const replacementFrequency = frequencies[ppeItem.name] || 12;
        const nextRenewalDate = getNextRenewalDate(issueDate, replacementFrequency);
        
        // Determine allocation type
        const types = ['annual', 'replacement', 'emergency', 'new-employee'];
        const weights = [0.4, 0.45, 0.1, 0.05]; // Weighted random
        const rand = Math.random();
        let allocationType = 'replacement';
        if (rand < 0.05) allocationType = 'new-employee';
        else if (rand < 0.15) allocationType = 'emergency';
        else if (rand < 0.55) allocationType = 'annual';
        
        // Status based on renewal date
        let status = 'active';
        const now = new Date();
        if (nextRenewalDate && nextRenewalDate < now) {
          const statusOptions = ['expired', 'replaced', 'active'];
          status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
        }

        // Size assignment based on category
        let size = null;
        if (ppeItem.category === 'Foot Protection') {
          size = ['6', '7', '8', '9', '10', '11', '12'][Math.floor(Math.random() * 7)];
        } else if (ppeItem.category === 'Body Protection') {
          size = ['S', 'M', 'L', 'XL', '2XL'][Math.floor(Math.random() * 5)];
        } else if (ppeItem.category === 'Hand Protection') {
          size = ['S', 'M', 'L', 'XL'][Math.floor(Math.random() * 4)];
        }

        allocations.push({
          employeeId: employee.id,
          ppeItemId: ppeItem.id,
          quantity,
          size,
          unitCost,
          totalCost,
          issueDate,
          nextRenewalDate,
          expiryDate: nextRenewalDate,
          allocationType,
          status,
          replacementFrequency,
          notes: allocationType === 'emergency' 
            ? 'Emergency replacement due to damage'
            : allocationType === 'new-employee'
            ? 'Initial PPE issue for new employee'
            : null
        });
      }
    }

    console.log(`Creating ${allocations.length} allocation records...`);
    await Allocation.bulkCreate(allocations, { validate: true });

    console.log(`✅ Successfully created ${allocations.length} allocations`);

    // Show summary statistics
    const totalCost = allocations.reduce((sum, a) => sum + parseFloat(a.totalCost), 0);
    const byMonth = {};
    allocations.forEach(a => {
      const monthKey = a.issueDate.toISOString().slice(0, 7); // YYYY-MM
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    });

    console.log('\n📊 Allocation Summary:');
    console.log(`   Total Allocations: ${allocations.length}`);
    console.log(`   Total Cost: $${totalCost.toFixed(2)}`);
    console.log(`   Average Cost: $${(totalCost / allocations.length).toFixed(2)}`);
    console.log('\n   By Month:');
    Object.keys(byMonth).sort().forEach(month => {
      console.log(`   ${month}: ${byMonth[month]} allocations`);
    });

  } catch (error) {
    console.error('❌ Error seeding allocations:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  const { sequelize } = require('./db');
  seedAllocations()
    .then(() => {
      console.log('Allocation seeding completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedAllocations;
