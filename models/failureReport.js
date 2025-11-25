const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const FailureReport = sequelize.define('FailureReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  ppeItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ppe_items',
      key: 'id'
    }
  },
  allocationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'allocations',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  failureType: {
    type: DataTypes.ENUM('defect', 'wear', 'damage', 'expired', 'other'),
    defaultValue: 'wear'
  },
  observedAt: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Location or section where failure observed'
  },
  reportedDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  reviewedBySHEQ: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sheqDecision: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sheqReviewDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actionTaken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('reported', 'under-review', 'resolved', 'closed'),
    defaultValue: 'reported'
  }
}, {
  tableName: 'failure_reports',
  timestamps: true
});

module.exports = FailureReport;
