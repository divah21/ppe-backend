"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // If the camelCase column exists (created by previous migration), rename it to snake_case.
    // Otherwise, add the snake_case column.
    const [results] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='allocations' AND column_name IN ('requestItemId', 'request_item_id')
    `);

    const hasCamel = results.some(r => r.column_name === 'requestItemId');
    const hasSnake = results.some(r => r.column_name === 'request_item_id');

    if (hasCamel && !hasSnake) {
      return queryInterface.renameColumn('allocations', 'requestItemId', 'request_item_id');
    }

    if (!hasSnake) {
      return queryInterface.addColumn('allocations', 'request_item_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'request_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    // Try to revert: if request_item_id exists and requestItemId doesn't, rename back.
    const [results] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='allocations' AND column_name IN ('requestItemId', 'request_item_id')
    `);

    const hasCamel = results.some(r => r.column_name === 'requestItemId');
    const hasSnake = results.some(r => r.column_name === 'request_item_id');

    if (hasSnake && !hasCamel) {
      return queryInterface.renameColumn('allocations', 'request_item_id', 'requestItemId');
    }

    if (hasSnake) {
      return queryInterface.removeColumn('allocations', 'request_item_id');
    }

    return Promise.resolve();
  }
};
