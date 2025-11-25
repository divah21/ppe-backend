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
      'pending',           // Created by Section Rep
      'dept-rep-review',   // Approved by Section Rep, waiting for Dept Rep
      'hod-review',        // Approved by Dept Rep, waiting for HOD
      'stores-review',     // Approved by HOD, waiting for Stores
      'approved',          // Approved by Stores, ready to fulfill
      'fulfilled',         // Items issued to employee
      'rejected',          // Rejected at any stage
      'cancelled'          // Cancelled by requester
    ),
    defaultValue: 'pending',
    allowNull: false
  },
  sectionRepApprovalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sectionRepComment: {
    type: DataTypes.TEXT,
    allowNull: true
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
  deptRepApprovalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deptRepComment: {
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
  storesApprovalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  storesComment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fulfilledDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fulfilledByUserId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  rejectedById: {
    type: DataTypes.UUID,
    allowNull: true
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'requests',
  timestamps: true
});

module.exports = Request;
