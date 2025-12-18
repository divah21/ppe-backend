const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

/**
 * ConsumableRequest Model
 * Represents a request for consumables from a section/department
 * Workflow: Section Rep creates → HOD approves → Stores fulfills
 */
const ConsumableRequest = sequelize.define('ConsumableRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  requestNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    comment: 'Auto-generated request number (e.g., CR-2024-0001)'
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sections',
      key: 'id'
    },
    comment: 'Section making the request'
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id'
    },
    comment: 'Department of the section'
  },
  requestedById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who created the request (Section Rep)'
  },
  status: {
    type: DataTypes.ENUM(
      'pending-hod-approval',
      'hod-approved',
      'hod-rejected',
      'stores-review',
      'stores-approved',
      'stores-rejected',
      'partially-fulfilled',
      'fulfilled',
      'cancelled'
    ),
    allowNull: false,
    defaultValue: 'pending-hod-approval'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'normal'
  },
  requestDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  requiredByDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date by which items are needed'
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason/purpose for the request'
  },
  hodApproverId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  hodApprovalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  hodComments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  storesApproverId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  storesApprovalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  storesComments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fulfilledDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalValueUSD: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Total estimated value of request in USD'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'consumable_requests',
  underscored: true,
  timestamps: true,
  hooks: {
    beforeCreate: async (request) => {
      // Auto-generate request number
      const year = new Date().getFullYear();
      const count = await ConsumableRequest.count({
        where: sequelize.where(
          sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM "created_at"')),
          year
        )
      });
      request.requestNumber = `CR-${year}-${String(count + 1).padStart(4, '0')}`;
    }
  }
});

module.exports = ConsumableRequest;
