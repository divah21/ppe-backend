const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

/**
 * SectionPPEMatrix defines the baseline required PPE items for an entire section.
 * All employees in a section inherit these requirements.
 * Job Title PPE Matrix can override/extend these for specific roles.
 */
const SectionPPEMatrix = sequelize.define('SectionPPEMatrix', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to Section entity'
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
    comment: 'Standard replacement frequency in months'
  },
  isMandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this PPE is mandatory for all employees in this section'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes or specifications'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'section_ppe_matrix',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['section_id', 'ppe_item_id'],
      name: 'unique_section_ppe_item'
    },
    {
      fields: ['section_id']
    }
  ]
});

module.exports = SectionPPEMatrix;
