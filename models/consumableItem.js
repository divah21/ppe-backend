const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

/**
 * ConsumableItem Model
 * Represents consumable/lab items that are allocated to sections/departments
 * Different from PPEItem which is allocated to individual employees
 */
const ConsumableItem = sequelize.define('ConsumableItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique product code (e.g., LA030301001)'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Product description'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Category code (e.g., CONS, GESP)'
  },
  stockAccount: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '710019',
    comment: 'Stock accounting code'
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'EA',
    comment: 'Unit of measure (KG, EA, L, G, etc.)'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Unit price in local currency'
  },
  unitPriceUSD: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Unit price in USD'
  },
  minLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 5,
    comment: 'Minimum stock level for alerts'
  },
  maxLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum stock level'
  },
  reorderPoint: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reorder point level'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'consumable_items',
  underscored: true,
  timestamps: true
});

module.exports = ConsumableItem;
