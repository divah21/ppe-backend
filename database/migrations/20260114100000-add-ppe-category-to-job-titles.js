'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('job_titles', 'ppeCategoryId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'job_titles',
        key: 'id'
      },
      comment: 'Links to PPE category job title for matrix inheritance'
    });

    await queryInterface.addIndex('job_titles', ['ppeCategoryId'], {
      name: 'idx_job_titles_ppe_category'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('job_titles', 'idx_job_titles_ppe_category');
    await queryInterface.removeColumn('job_titles', 'ppeCategoryId');
  }
};
