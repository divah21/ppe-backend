const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

/**
 * ConsumableAllocation Model
 * Records actual issuance of consumables to sections
 */
const ConsumableAllocation = sequelize.define('ConsumableAllocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  consumableRequestId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'consumable_requests',
      key: 'id'
    },
    comment: 'Link to original request (if any)'
  },
  consumableItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'consumable_items',
      key: 'id'
    }
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sections',
      key: 'id'
    }
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id'
    }
  },
  issuedById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Stores user who issued the items'
  },
  receivedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who received the items (optional)'
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  unitPriceUSD: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  totalValueUSD: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  issueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'consumable_allocations',
  underscored: true,
  timestamps: true,
  hooks: {
    beforeSave: (allocation) => {
      if (allocation.quantity && allocation.unitPriceUSD) {
        allocation.totalValueUSD = parseFloat(allocation.quantity) * parseFloat(allocation.unitPriceUSD);
      }
    }
  }
});

module.exports = ConsumableAllocation;
