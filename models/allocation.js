const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const Allocation = sequelize.define('Allocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  size: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  unitCost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  totalCost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  issueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  nextRenewalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  allocationType: {
    type: DataTypes.ENUM('annual', 'replacement', 'emergency', 'new-employee'),
    defaultValue: 'replacement'
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'replaced', 'returned'),
    defaultValue: 'active'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  replacementFrequency: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Replacement frequency in months'
  },
  stockId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to the specific stock item allocated'
  }
}, {
  tableName: 'allocations',
  timestamps: true
});

module.exports = Allocation;
