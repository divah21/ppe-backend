"use strict";

/**
 * Adds users.must_change_password.
 *
 * The onboarding and admin-reset routes already tried to set this flag, but the
 * column/attribute never existed, so Sequelize silently dropped it and the
 * temporary password became the user's permanent password.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('users');

    if (!table.must_change_password) {
      await queryInterface.addColumn('users', 'must_change_password', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'True when the current password was set by an admin (onboarding/reset) and must be replaced on next login'
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('users');

    if (table.must_change_password) {
      await queryInterface.removeColumn('users', 'must_change_password');
    }
  }
};
