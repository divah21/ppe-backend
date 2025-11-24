const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  action: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  entityType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Type of entity affected (e.g., Request, Allocation)'
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  changes: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Before and after values'
  },
  meta: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false
});

module.exports = AuditLog;
