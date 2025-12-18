const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

/**
 * ConsumableRequestItem Model
 * Individual items in a consumable request
 */
const ConsumableRequestItem = sequelize.define('ConsumableRequestItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  consumableRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'consumable_requests',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  consumableItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'consumable_items',
      key: 'id'
    }
  },
  quantityRequested: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0.01
    },
    comment: 'Quantity requested'
  },
  quantityApproved: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Quantity approved by HOD (may be less than requested)'
  },
  quantityFulfilled: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Quantity actually issued by stores'
  },
  unitPriceUSD: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Unit price at time of request'
  },
  totalValueUSD: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Total value (quantity × unit price)'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'fulfilled', 'partial'),
    allowNull: false,
    defaultValue: 'pending'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'consumable_request_items',
  underscored: true,
  timestamps: true,
  hooks: {
    beforeSave: (item) => {
      // Calculate total value
      const qty = item.quantityApproved || item.quantityRequested;
      if (qty && item.unitPriceUSD) {
        item.totalValueUSD = parseFloat(qty) * parseFloat(item.unitPriceUSD);
      }
    }
  }
});

module.exports = ConsumableRequestItem;
