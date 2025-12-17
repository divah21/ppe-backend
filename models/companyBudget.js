const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

/**
 * Company Budget Model - Company-wide annual PPE budget
 * 
 * This is the top-level budget from which department budgets are allocated.
 * Flow: Company Budget → Department Budgets → Section Budgets (optional)
 */
const CompanyBudget = sequelize.define('CompanyBudget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fiscalYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: 'Fiscal year (e.g., 2025)'
  },
  totalBudget: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Total company-wide PPE budget for the fiscal year'
  },
  allocatedToDepartments: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Total amount allocated to departments'
  },
  totalSpent: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Total amount spent from allocations (auto-updated)'
  },
  unallocated: {
    type: DataTypes.VIRTUAL,
    get() {
      return parseFloat(this.totalBudget || 0) - parseFloat(this.allocatedToDepartments || 0);
    }
  },
  remaining: {
    type: DataTypes.VIRTUAL,
    get() {
      return parseFloat(this.totalBudget || 0) - parseFloat(this.totalSpent || 0);
    }
  },
  utilizationPercent: {
    type: DataTypes.VIRTUAL,
    get() {
      const total = parseFloat(this.totalBudget || 0);
      const spent = parseFloat(this.totalSpent || 0);
      return total > 0 ? (spent / total) * 100 : 0;
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'closed'),
    defaultValue: 'draft',
    comment: 'Budget status'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fiscal year start date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fiscal year end date'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'company_budgets',
  timestamps: true
});

module.exports = CompanyBudget;
