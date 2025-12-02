const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const JobTitle = sequelize.define('JobTitle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Job titles belong to sections'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'job_titles',
  timestamps: true,
  underscored: false, // Use camelCase for column names
  indexes: [
    {
      unique: true,
      fields: ['name', 'sectionId'],
      name: 'unique_job_title_per_section'
    }
  ]
});

module.exports = JobTitle;
