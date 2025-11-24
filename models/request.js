const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const Request = sequelize.define('Request', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'hod-approved',
      'dept-rep-approved',
      'stores-approved',
      'rejected',
      'completed',
      'cancelled'
    ),
    defaultValue: 'pending',
    allowNull: false
  },
  requestType: {
    type: DataTypes.ENUM('new', 'replacement', 'emergency', 'annual'),
    defaultValue: 'replacement'
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hodApprovalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  hodComment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deptRepApprovalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deptRepComment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  storesApprovalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  storesComment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  completedDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'requests',
  timestamps: true
});

module.exports = Request;
