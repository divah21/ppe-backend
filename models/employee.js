const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  worksNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  employeeId: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  costCenterId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Cost center for budget tracking'
  },
  jobTitle: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  jobType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dateJoined: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'employees',
  timestamps: true
});

// Virtual field for full name
Employee.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

module.exports = Employee;
