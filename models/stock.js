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
    type: DataTypes.DECIMAL(12, 6),
    allowNull: true,
    comment: 'Unit cost in local currency'
  },
  unitPriceUSD: {
    type: DataTypes.DECIMAL(12, 6),
    allowNull: true,
    comment: 'Unit price in USD'
  },
  totalValueUSD: {
    type: DataTypes.DECIMAL(15, 6),
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
  gender: {
    type: DataTypes.ENUM('male', 'female', 'unisex'),
    allowNull: true,
    defaultValue: null,
    comment: 'Gender variant for body/torso and feet items (male, female, unisex)'
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
  },
  eligibleDepartments: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    defaultValue: null,
    field: 'eligible_departments',
    comment: 'Array of department IDs that can access this stock. NULL means all departments'
  },
  eligibleSections: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    defaultValue: null,
    field: 'eligible_sections',
    comment: 'Array of section IDs that can access this stock. NULL means all sections'
  }
}, {
  tableName: 'stocks',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['ppe_item_id', 'size', 'color', 'gender', 'location', 'batch_number'],
      name: 'unique_stock_variant_batch'
    },
    {
      fields: ['ppe_item_id']
    },
    {
      fields: ['location']
    },
    {
      fields: ['batch_number']
    }
  ]
});

module.exports = Stock;
