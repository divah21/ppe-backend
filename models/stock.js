const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const Stock = sequelize.define('Stock', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  minLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 10,
    comment: 'Minimum stock level for alerts'
  },
  maxLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum stock level for ordering'
  },
  reorderPoint: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reorder point to trigger purchase requests'
  },
  unitCost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Unit cost in local currency'
  },
  unitPriceUSD: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Unit price in USD'
  },
  totalValueUSD: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Total stock value (quantity × unit price) in USD'
  },
  stockAccount: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Stock accounting account (e.g., 710019, 710021)'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Main Store'
  },
  binLocation: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Specific bin or shelf location in warehouse'
  },
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  size: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Size variant (e.g., S, M, L, XL, 6, 7, 8, etc.)'
  },
  color: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Color variant (e.g., Blue, Red, Yellow, etc.)'
  },
  lastRestocked: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastStockTake: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last physical stock count date'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stocks',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['ppe_item_id', 'size', 'color', 'location'],
      name: 'unique_stock_variant'
    },
    {
      fields: ['ppe_item_id']
    },
    {
      fields: ['location']
    }
  ]
});

module.exports = Stock;
