const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

/**
 * CostCenter model for tracking cost centers
 * Used for budget allocation and expense tracking
 */
const CostCenter = sequelize.define('CostCenter', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Cost center code'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Cost center name'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Associated department'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'cost_centers',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['code']
    },
    {
      // Use actual column name with underscored mapping
      fields: ['department_id']
    }
  ]
});

module.exports = CostCenter;
