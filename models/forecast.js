const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const Forecast = sequelize.define('Forecast', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  periodYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  periodQuarter: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 4
    }
  },
  forecastQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  actualQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  variance: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'forecasts',
  timestamps: true
});

module.exports = Forecast;
