'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('consumable_requests', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      request_number: { type: Sequelize.STRING(50), allowNull: true, unique: true },
      section_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'sections', key: 'id' } },
      department_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'departments', key: 'id' } },
      requested_by_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
      status: { type: Sequelize.ENUM(
        'pending-hod-approval','hod-approved','hod-rejected','stores-review','stores-approved','stores-rejected','partially-fulfilled','fulfilled','cancelled'
      ), allowNull: false, defaultValue: 'pending-hod-approval' },
      priority: { type: Sequelize.ENUM('low','normal','high','urgent'), allowNull: false, defaultValue: 'normal' },
      request_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      required_by_date: { type: Sequelize.DATE, allowNull: true },
      purpose: { type: Sequelize.TEXT, allowNull: true },
      hod_approver_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
      hod_approval_date: { type: Sequelize.DATE, allowNull: true },
      hod_comments: { type: Sequelize.TEXT, allowNull: true },
      stores_approver_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
      stores_approval_date: { type: Sequelize.DATE, allowNull: true },
      stores_comments: { type: Sequelize.TEXT, allowNull: true },
      fulfilled_date: { type: Sequelize.DATE, allowNull: true },
      total_value_usd: { type: Sequelize.DECIMAL(15,2), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('consumable_requests');
  }
};
