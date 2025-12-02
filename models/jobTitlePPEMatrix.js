const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

/**
 * JobTitlePPEMatrix defines the required PPE items for each job title
 * This is the master data that determines what PPE each employee should receive
 * based on their job title
 */
const JobTitlePPEMatrix = sequelize.define('JobTitlePPEMatrix', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  jobTitleId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'jobTitleId', // Database column is camelCase (quoted)
    comment: 'Reference to JobTitle entity (new approach)'
  },
  jobTitle: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Legacy: Job title string (deprecated - use jobTitleId instead)'
  },
  ppeItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to PPE item'
  },
  quantityRequired: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    },
    comment: 'Quantity of this PPE item required per issue'
  },
  replacementFrequency: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Standard replacement frequency in months (e.g., 8 months)'
  },
  heavyUseFrequency: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Heavy use replacement frequency in months (e.g., 4 months)'
  },
  isMandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this PPE is mandatory for this job title'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'PPE category (BODY/TORSO, EARS, EYES/FACE, FEET, HANDS, etc.)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes or specifications for this job title'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'job_title_ppe_matrix',
  timestamps: true,
  underscored: true, // Database uses snake_case columns
  indexes: [
    {
      unique: true,
      fields: ['job_title', 'ppe_item_id'],
      name: 'unique_job_title_ppe_item'
    },
    {
      fields: ['job_title']
    },
    {
      fields: ['ppe_item_id']
    },
    {
      fields: ['category']
    }
  ]
});

module.exports = JobTitlePPEMatrix;
