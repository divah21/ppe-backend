const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const Size = sequelize.define('Size', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  scaleId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'FK to size_scales.id'
  },
  value: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Canonical value, e.g., 34, XS, 10, Std'
  },
  label: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Display label if different from value'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  euSize: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  usSize: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  ukSize: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  meta: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'sizes',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['scale_id', 'value'] },
    { fields: ['scale_id'] },
    { fields: ['sort_order'] }
  ]
});

module.exports = Size;
