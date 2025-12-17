const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

/**
 * Budget Model - Department/Section level budget allocations
 * 
 * Linked to CompanyBudget - allocations come from the company-wide PPE budget.
 * Tracks both allocated amount and actual spending.
 */
const Budget = sequelize.define('Budget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  companyBudgetId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'company_budgets',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    comment: 'Link to the company-wide budget this allocation comes from'
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
    onUpdate: 'CASCADE',
    comment: 'Optional - for section-specific budgets'
  },
  fiscalYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  allocatedAmount: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Amount allocated from company budget to this dept/section'
  },
  totalSpent: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Actual amount spent (from fulfilled allocations)'
  },
  remaining: {
    type: DataTypes.VIRTUAL,
    get() {
      return parseFloat(this.allocatedAmount || 0) - parseFloat(this.totalSpent || 0);
    }
  },
  utilizationPercent: {
    type: DataTypes.VIRTUAL,
    get() {
      const allocated = parseFloat(this.allocatedAmount || 0);
      const spent = parseFloat(this.totalSpent || 0);
      return allocated > 0 ? (spent / allocated) * 100 : 0;
    }
  },
  // Legacy fields for backward compatibility
  totalBudget: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'DEPRECATED: Use allocatedAmount instead'
  },
  allocatedBudget: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'DEPRECATED: Use totalSpent instead'
  },
  remainingBudget: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'DEPRECATED: Use remaining virtual field instead'
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
  month: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 12
    }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATEONLY,
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
      // Sync legacy fields
      if (budget.allocatedAmount !== undefined) {
        budget.totalBudget = budget.allocatedAmount;
      }
      if (budget.totalSpent !== undefined) {
        budget.allocatedBudget = budget.totalSpent;
      }
      if (budget.totalBudget !== undefined && budget.allocatedBudget !== undefined) {
        budget.remainingBudget = budget.totalBudget - budget.allocatedBudget;
      }
    }
  }
});

module.exports = Budget;
