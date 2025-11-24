const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const Budget = sequelize.define('Budget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'sections',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  fiscalYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  totalBudget: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  allocatedBudget: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  remainingBudget: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'draft'),
    defaultValue: 'active'
  },
  period: {
    type: DataTypes.ENUM('annual', 'half-year', 'quarterly', 'monthly'),
    defaultValue: 'annual'
  },
  quarter: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 4
    }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'budgets',
  timestamps: true,
  hooks: {
    beforeValidate: (budget) => {
      // Auto-calculate remaining budget if not provided
      if (budget.totalBudget !== undefined && budget.allocatedBudget !== undefined) {
        budget.remainingBudget = budget.totalBudget - budget.allocatedBudget;
      }
    }
  }
});

module.exports = Budget;
