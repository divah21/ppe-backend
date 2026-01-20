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
      'partially-fulfilled', // Some items issued, others pending
      'rejected',          // Rejected at any stage
      'cancelled',         // Cancelled by requester
      'sheq-review'        // Waiting for SHEQ Manager approval (replacement requests)
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
  isEmergencyVisitor: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
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
  sheqApprovalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sheqComment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sheqApproverId: {
    type: DataTypes.UUID,
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
  },
  // Foreign Keys (explicitly defined for clarity and to set constraints)
  employeeId: {
    type: DataTypes.UUID,
    allowNull: true,  // Nullable for guest/visitor requests
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  requestedById: {
    type: DataTypes.UUID,
    allowNull: false,  // Required - who created the request
    references: {
      model: 'users',
      key: 'id'
    }
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id'
    }
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'sections',
      key: 'id'
    }
  }
}, {
  tableName: 'requests',
  timestamps: true,
  underscored: true
});

module.exports = Request;
