'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add columns to company_budgets table
    const companyBudgetsTable = await queryInterface.describeTable('company_budgets');
    
    if (!companyBudgetsTable.suggested_budget) {
      await queryInterface.addColumn('company_budgets', 'suggested_budget', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'System-calculated suggested budget based on PPE Matrix'
      });
    }

    if (!companyBudgetsTable.buffer_amount) {
      await queryInterface.addColumn('company_budgets', 'buffer_amount', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Additional buffer amount added by admin for emergencies'
      });
    }

    // Add columns to budgets table (department budgets)
    const budgetsTable = await queryInterface.describeTable('budgets');

    if (!budgetsTable.suggested_amount) {
      await queryInterface.addColumn('budgets', 'suggested_amount', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'System-calculated suggested amount based on PPE Matrix'
      });
    }

    if (!budgetsTable.additional_amount) {
      await queryInterface.addColumn('budgets', 'additional_amount', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Additional allocation beyond the suggested amount'
      });
    }

    console.log('✅ Added suggested budget columns to company_budgets and budgets tables');
  },

  async down(queryInterface, Sequelize) {
    // Remove columns from company_budgets table
    const companyBudgetsTable = await queryInterface.describeTable('company_budgets');
    
    if (companyBudgetsTable.suggested_budget) {
      await queryInterface.removeColumn('company_budgets', 'suggested_budget');
    }

    if (companyBudgetsTable.buffer_amount) {
      await queryInterface.removeColumn('company_budgets', 'buffer_amount');
    }

    // Remove columns from budgets table
    const budgetsTable = await queryInterface.describeTable('budgets');

    if (budgetsTable.suggested_amount) {
      await queryInterface.removeColumn('budgets', 'suggested_amount');
    }

    if (budgetsTable.additional_amount) {
      await queryInterface.removeColumn('budgets', 'additional_amount');
    }

    console.log('✅ Removed suggested budget columns from company_budgets and budgets tables');
  }
};
