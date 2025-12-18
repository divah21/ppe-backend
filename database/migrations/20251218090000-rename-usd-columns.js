'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const renames = [
      // table, oldName, newName
      ['consumable_items', 'unit_price_usd', 'unit_price_u_s_d'],
      ['consumable_items', 'unit_price', 'unit_price'],
      ['consumable_stocks', 'unit_price_usd', 'unit_price_u_s_d'],
      ['consumable_stocks', 'total_value_usd', 'total_value_u_s_d'],
      ['consumable_requests', 'total_value_usd', 'total_value_u_s_d'],
      ['consumable_request_items', 'unit_price_usd', 'unit_price_u_s_d'],
      ['consumable_request_items', 'total_value_usd', 'total_value_u_s_d'],
      ['consumable_allocations', 'unit_price_usd', 'unit_price_u_s_d'],
      ['consumable_allocations', 'total_value_usd', 'total_value_u_s_d']
    ];

    for (const [table, oldName, newName] of renames) {
      try {
        // Check if old column exists
        const tableDesc = await queryInterface.describeTable(table);
        if (tableDesc[oldName] && !tableDesc[newName]) {
          await queryInterface.renameColumn(table, oldName, newName);
        }
      } catch (e) {
        // ignore errors to make migration idempotent in different DB states
        console.warn(`Rename skipped for ${table}.${oldName} -> ${newName}:`, e.message || e);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const renames = [
      ['consumable_items', 'unit_price_u_s_d', 'unit_price_usd'],
      ['consumable_stocks', 'unit_price_u_s_d', 'unit_price_usd'],
      ['consumable_stocks', 'total_value_u_s_d', 'total_value_usd'],
      ['consumable_requests', 'total_value_u_s_d', 'total_value_usd'],
      ['consumable_request_items', 'unit_price_u_s_d', 'unit_price_usd'],
      ['consumable_request_items', 'total_value_u_s_d', 'total_value_usd'],
      ['consumable_allocations', 'unit_price_u_s_d', 'unit_price_usd'],
      ['consumable_allocations', 'total_value_u_s_d', 'total_value_usd']
    ];

    for (const [table, oldName, newName] of renames) {
      try {
        const tableDesc = await queryInterface.describeTable(table);
        if (tableDesc[oldName] && !tableDesc[newName]) {
          await queryInterface.renameColumn(table, oldName, newName);
        }
      } catch (e) {
        console.warn(`Down rename skipped for ${table}.${oldName} -> ${newName}:`, e.message || e);
      }
    }
  }
};
