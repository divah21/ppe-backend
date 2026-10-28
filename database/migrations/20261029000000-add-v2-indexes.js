'use strict';

const { INDEXES, ensureIndexes } = require('../indexes');

// Mirrors the bootstrap in src/v2.ts prepareV2, so either path leaves the same indexes.
module.exports = {
  async up(queryInterface) {
    await ensureIndexes(queryInterface.sequelize);
  },

  async down(queryInterface) {
    for (const [name] of INDEXES) {
      await queryInterface.sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS ${name}`);
    }
  },
};
