'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the old unique index that doesn't include batch_number
    try {
      await queryInterface.removeIndex('stocks', 'unique_stock_variant');
      console.log('✓ Dropped old unique_stock_variant index');
    } catch (e) {
      console.log('⚠ Old index unique_stock_variant not found or already dropped');
    }

    // Create new unique index that includes batch_number
    // This allows multiple stock entries for the same item/size/color/location with different batch numbers
    try {
      await queryInterface.addIndex('stocks', {
        fields: ['ppe_item_id', 'size', 'color', 'location', 'batch_number'],
        unique: true,
        name: 'unique_stock_variant_batch'
      });
      console.log('✓ Created new unique_stock_variant_batch index');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⚠ Index unique_stock_variant_batch already exists');
      } else {
        throw e;
      }
    }

    // Add index on batch_number for faster lookups
    try {
      await queryInterface.addIndex('stocks', {
        fields: ['batch_number'],
        name: 'idx_stocks_batch_number'
      });
      console.log('✓ Created index on batch_number');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⚠ Index idx_stocks_batch_number already exists');
      } else {
        console.warn('Could not create batch_number index:', e.message);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove the new indexes
    try {
      await queryInterface.removeIndex('stocks', 'unique_stock_variant_batch');
    } catch (e) {
      console.warn('Could not drop unique_stock_variant_batch:', e.message);
    }

    try {
      await queryInterface.removeIndex('stocks', 'idx_stocks_batch_number');
    } catch (e) {
      console.warn('Could not drop idx_stocks_batch_number:', e.message);
    }

    // Recreate the old unique index
    try {
      await queryInterface.addIndex('stocks', {
        fields: ['ppe_item_id', 'size', 'color', 'location'],
        unique: true,
        name: 'unique_stock_variant'
      });
    } catch (e) {
      console.warn('Could not recreate unique_stock_variant:', e.message);
    }
  }
};
