const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

async function migrateStockFields() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('Starting Stock table migration...');

    // Check if columns already exist before adding
    const tableDescription = await queryInterface.describeTable('stocks');

    // Add maxLevel if not exists
    if (!tableDescription.maxLevel) {
      console.log('Adding maxLevel column...');
      await queryInterface.addColumn('stocks', 'maxLevel', {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Maximum stock level for ordering'
      });
    }

    // Add reorderPoint if not exists
    if (!tableDescription.reorderPoint) {
      console.log('Adding reorderPoint column...');
      await queryInterface.addColumn('stocks', 'reorderPoint', {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Reorder point to trigger purchase requests'
      });
    }

    // Add unitPriceUSD if not exists
    if (!tableDescription.unitPriceUSD) {
      console.log('Adding unitPriceUSD column...');
      await queryInterface.addColumn('stocks', 'unitPriceUSD', {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Unit price in USD'
      });
    }

    // Add totalValueUSD if not exists
    if (!tableDescription.totalValueUSD) {
      console.log('Adding totalValueUSD column...');
      await queryInterface.addColumn('stocks', 'totalValueUSD', {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Total stock value (quantity × unit price) in USD'
      });
    }

    // Add stockAccount if not exists
    if (!tableDescription.stockAccount) {
      console.log('Adding stockAccount column...');
      await queryInterface.addColumn('stocks', 'stockAccount', {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Stock accounting account (e.g., 710019, 710021)'
      });
    }

    // Add binLocation if not exists
    if (!tableDescription.binLocation) {
      console.log('Adding binLocation column...');
      await queryInterface.addColumn('stocks', 'binLocation', {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Specific bin or shelf location in warehouse'
      });
    }

    // Add expiryDate if not exists
    if (!tableDescription.expiryDate) {
      console.log('Adding expiryDate column...');
      await queryInterface.addColumn('stocks', 'expiryDate', {
        type: DataTypes.DATE,
        allowNull: true
      });
    }

    // Add lastStockTake if not exists
    if (!tableDescription.lastStockTake) {
      console.log('Adding lastStockTake column...');
      await queryInterface.addColumn('stocks', 'lastStockTake', {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last physical stock count date'
      });
    }

    // Add notes if not exists
    if (!tableDescription.notes) {
      console.log('Adding notes column...');
      await queryInterface.addColumn('stocks', 'notes', {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }

    // Add eligible_departments if not exists (snake_case for DB)
    if (!tableDescription.eligible_departments && !tableDescription.eligibleDepartments) {
      console.log('Adding eligible_departments column...');
      await queryInterface.addColumn('stocks', 'eligible_departments', {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: true,
        defaultValue: null,
        comment: 'Array of department IDs that can access this stock. NULL means all departments'
      });
    }

    // Add eligible_sections if not exists (snake_case for DB)
    if (!tableDescription.eligible_sections && !tableDescription.eligibleSections) {
      console.log('Adding eligible_sections column...');
      await queryInterface.addColumn('stocks', 'eligible_sections', {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: true,
        defaultValue: null,
        comment: 'Array of section IDs that can access this stock. NULL means all sections'
      });
    }

    // Make unitCost nullable if it isn't already
    if (tableDescription.unitCost && !tableDescription.unitCost.allowNull) {
      console.log('Modifying unitCost to be nullable...');
      await queryInterface.changeColumn('stocks', 'unitCost', {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Unit cost in local currency'
      });
    }

    console.log('\n✅ Stock table migration completed successfully!');
    console.log('\nNew fields added:');
    console.log('- maxLevel (INTEGER)');
    console.log('- reorderPoint (INTEGER)');
    console.log('- unitPriceUSD (DECIMAL)');
    console.log('- totalValueUSD (DECIMAL)');
    console.log('- stockAccount (STRING)');
    console.log('- binLocation (STRING)');
    console.log('- expiryDate (DATE)');
    console.log('- lastStockTake (DATE)');
    console.log('- notes (TEXT)');
    console.log('- eligibleDepartments (ARRAY of UUIDs)');
    console.log('- eligibleSections (ARRAY of UUIDs)');
    console.log('- unitCost (modified to nullable)');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration
migrateStockFields()
  .then(() => {
    console.log('\n✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
