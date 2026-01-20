"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('allocations', 'requestItemId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'request_items',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('allocations', 'requestItemId');
  }
};
