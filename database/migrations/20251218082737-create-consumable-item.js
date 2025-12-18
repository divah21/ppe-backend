'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('consumable_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      product_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      stock_account: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: '710019'
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'EA'
      },
      unit_price: {
        type: Sequelize.DECIMAL(12,2),
        allowNull: true
      },
      unit_price_usd: {
        type: Sequelize.DECIMAL(12,2),
        allowNull: true
      },
      min_level: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 5
      },
      max_level: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      reorder_point: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('consumable_items');
  }
};
