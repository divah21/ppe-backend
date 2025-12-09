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
    field: 'employee_id',
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  ppeItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'ppe_item_id',
    references: {
      model: 'ppe_items',
      key: 'id'
    }
  },
  allocationId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'allocation_id',
    references: {
      model: 'allocations',
      key: 'id'
    }
  },
  stockId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'stock_id',
    references: {
      model: 'stocks',
      key: 'id'
    },
    comment: 'The stock item that failed'
  },
  replacementStockId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'replacement_stock_id',
    references: {
      model: 'stocks',
      key: 'id'
    },
    comment: 'The replacement stock item allocated'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  failureType: {
    type: DataTypes.ENUM('damage', 'defect', 'lost', 'wear'),
    defaultValue: 'damage',
    field: 'failure_type'
  },
  observedAt: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'observed_at',
    comment: 'Location or section where failure observed'
  },
  reportedDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'reported_date'
  },
  failureDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'failure_date',
    comment: 'Date when the failure occurred'
  },
  brand: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'brand',
    comment: 'Brand or type of the PPE that failed'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'remarks',
    comment: 'Additional remarks or notes'
  },
  reviewedBySHEQ: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'reviewed_by_s_h_e_q'
  },
  sheqDecision: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'sheq_decision'
  },
  sheqReviewDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sheq_review_date'
  },
  actionTaken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'action_taken'
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('pending-sheq-review', 'sheq-approved', 'stores-processing', 'resolved', 'replaced'),
    defaultValue: 'pending-sheq-review',
    comment: 'Workflow: Section Rep -> SHEQ Review -> Stores Processing -> Resolved/Replaced'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at'
  }
}, {
  tableName: 'failure_reports',
  timestamps: true,
  underscored: false
});

module.exports = FailureReport;
