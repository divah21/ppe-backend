'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('consumable_stocks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      consumable_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'consumable_items', key: 'id' },
        onDelete: 'CASCADE'
      },
      quantity: {
        type: Sequelize.DECIMAL(12,2),
        allowNull: false,
        defaultValue: 0
      },
      unit_price: { type: Sequelize.DECIMAL(12,2), allowNull: true },
      unit_price_usd: { type: Sequelize.DECIMAL(12,2), allowNull: true },
      total_value: { type: Sequelize.DECIMAL(15,2), allowNull: true },
      total_value_usd: { type: Sequelize.DECIMAL(15,2), allowNull: true },
      location: { type: Sequelize.STRING(100), allowNull: true, defaultValue: 'Main Store' },
      bin_location: { type: Sequelize.STRING(50), allowNull: true },
      batch_number: { type: Sequelize.STRING(100), allowNull: true },
      expiry_date: { type: Sequelize.DATE, allowNull: true },
      last_restocked: { type: Sequelize.DATE, allowNull: true },
      last_stock_take: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('consumable_stocks');
  }
};
