const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const SizeScale = sequelize.define('SizeScale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Identifier for the size scale (e.g., GARMENT_NUM, ALPHA)'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  categoryGroup: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'High-level PPE category grouping (BODY, FEET, HANDS, etc.)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'size_scales',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['code'] },
    { fields: ['category_group'] }
  ]
});

module.exports = SizeScale;
