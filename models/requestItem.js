const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const RequestItem = sequelize.define('RequestItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  size: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approvedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'request_items',
  timestamps: true
});

module.exports = RequestItem;
