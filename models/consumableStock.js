const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

/**
 * ConsumableStock Model
 * Tracks stock levels for consumable items
 */
const ConsumableStock = sequelize.define('ConsumableStock', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  consumableItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'consumable_items',
      key: 'id'
    },
    comment: 'Reference to the consumable item'
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Current stock quantity (can be decimal for KG, L, etc.)'
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
  totalValue: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Total value (quantity × unit price) in local currency'
  },
  totalValueUSD: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Total value in USD'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Main Store'
  },
  binLocation: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Specific bin or shelf location'
  },
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastRestocked: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastStockTake: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'consumable_stocks',
  underscored: true,
  timestamps: true,
  hooks: {
    beforeSave: (stock) => {
      // Calculate total values
      if (stock.quantity && stock.unitPrice) {
        stock.totalValue = parseFloat(stock.quantity) * parseFloat(stock.unitPrice);
      }
      if (stock.quantity && stock.unitPriceUSD) {
        stock.totalValueUSD = parseFloat(stock.quantity) * parseFloat(stock.unitPriceUSD);
      }
    }
  }
});

module.exports = ConsumableStock;
