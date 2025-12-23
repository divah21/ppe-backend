'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Increase decimal precision for price columns in stock table
    // This allows storing prices with up to 6 decimal places (e.g., 0.197598)
    
    const alterations = [
      { table: 'stocks', column: 'unit_cost', type: 'DECIMAL(12, 6)' },
      { table: 'stocks', column: 'unit_price_u_s_d', type: 'DECIMAL(12, 6)' },
      { table: 'stocks', column: 'total_value_u_s_d', type: 'DECIMAL(15, 6)' },
    ];

    for (const { table, column, type } of alterations) {
      try {
        // Check if column exists before altering
        const tableDesc = await queryInterface.describeTable(table);
        if (tableDesc[column]) {
          await queryInterface.changeColumn(table, column, {
            type: Sequelize.DECIMAL(...type.match(/\d+/g).map(Number)),
            allowNull: true
          });
          console.log(`✓ Updated ${table}.${column} to ${type}`);
        } else {
          console.log(`⚠ Column ${table}.${column} not found, skipping`);
        }
      } catch (e) {
        console.warn(`Error updating ${table}.${column}:`, e.message || e);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert back to 2 decimal places
    const alterations = [
      { table: 'stocks', column: 'unit_cost', type: 'DECIMAL(12, 2)' },
      { table: 'stocks', column: 'unit_price_u_s_d', type: 'DECIMAL(12, 2)' },
      { table: 'stocks', column: 'total_value_u_s_d', type: 'DECIMAL(15, 2)' },
    ];

    for (const { table, column, type } of alterations) {
      try {
        const tableDesc = await queryInterface.describeTable(table);
        if (tableDesc[column]) {
          await queryInterface.changeColumn(table, column, {
            type: Sequelize.DECIMAL(...type.match(/\d+/g).map(Number)),
            allowNull: true
          });
          console.log(`✓ Reverted ${table}.${column} to ${type}`);
        }
      } catch (e) {
        console.warn(`Error reverting ${table}.${column}:`, e.message || e);
      }
    }
  }
};
