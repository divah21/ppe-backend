'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('consumable_request_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      consumable_request_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'consumable_requests', key: 'id' }, onDelete: 'CASCADE' },
      consumable_item_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'consumable_items', key: 'id' } },
      quantity_requested: { type: Sequelize.DECIMAL(12,2), allowNull: false },
      quantity_approved: { type: Sequelize.DECIMAL(12,2), allowNull: true },
      quantity_fulfilled: { type: Sequelize.DECIMAL(12,2), allowNull: true, defaultValue: 0 },
      unit_price_usd: { type: Sequelize.DECIMAL(12,2), allowNull: true },
      total_value_usd: { type: Sequelize.DECIMAL(15,2), allowNull: true },
      status: { type: Sequelize.ENUM('pending','approved','rejected','fulfilled','partial'), allowNull: false, defaultValue: 'pending' },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('consumable_request_items');
  }
};
