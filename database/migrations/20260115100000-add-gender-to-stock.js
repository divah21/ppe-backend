'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add gender column to stocks table
    await queryInterface.addColumn('stocks', 'gender', {
      type: Sequelize.ENUM('male', 'female', 'unisex'),
      allowNull: true,
      defaultValue: null
    });

    // Drop the old unique index
    try {
      await queryInterface.removeIndex('stocks', 'unique_stock_variant_batch');
    } catch (e) {
      console.log('Index may not exist, continuing...');
    }

    // Create new unique index including gender
    await queryInterface.addIndex('stocks', {
      fields: ['ppe_item_id', 'size', 'color', 'gender', 'location', 'batch_number'],
      unique: true,
      name: 'unique_stock_variant_batch'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop the new unique index
    try {
      await queryInterface.removeIndex('stocks', 'unique_stock_variant_batch');
    } catch (e) {
      console.log('Index may not exist, continuing...');
    }

    // Create old unique index without gender
    await queryInterface.addIndex('stocks', {
      fields: ['ppe_item_id', 'size', 'color', 'location', 'batch_number'],
      unique: true,
      name: 'unique_stock_variant_batch'
    });

    // Remove gender column
    await queryInterface.removeColumn('stocks', 'gender');

    // Drop the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_stocks_gender;');
  }
};
