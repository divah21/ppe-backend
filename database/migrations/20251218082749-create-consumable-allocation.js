'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('consumable_allocations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      consumable_request_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'consumable_requests', key: 'id' } },
      consumable_item_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'consumable_items', key: 'id' } },
      section_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'sections', key: 'id' } },
      department_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'departments', key: 'id' } },
      issued_by_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
      received_by_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
      quantity: { type: Sequelize.DECIMAL(12,2), allowNull: false },
      unit_price_usd: { type: Sequelize.DECIMAL(12,2), allowNull: true },
      total_value_usd: { type: Sequelize.DECIMAL(15,2), allowNull: true },
      issue_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      batch_number: { type: Sequelize.STRING(100), allowNull: true },
      purpose: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('consumable_allocations');
  }
};
