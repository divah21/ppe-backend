const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['general', 'notifications', 'security', 'database', 'email', 'appearance', 'api', 'users', 'allocation']]
    }
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  valueType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'string',
    validate: {
      isIn: [['string', 'number', 'boolean', 'json']]
    }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isSecret: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  }
}, {
  tableName: 'settings',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['category', 'key']
    }
  ]
});

// Helper to parse value based on type
Setting.prototype.getParsedValue = function() {
  switch (this.valueType) {
    case 'number':
      return Number(this.value);
    case 'boolean':
      return this.value === 'true';
    case 'json':
      try {
        return JSON.parse(this.value);
      } catch {
        return this.value;
      }
    default:
      return this.value;
  }
};

module.exports = Setting;
