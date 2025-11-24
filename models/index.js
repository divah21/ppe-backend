// Import all models
const Role = require('./role');
const User = require('./user');
const Department = require('./department');
const Section = require('./section');
const CostCenter = require('./costCenter');
const Employee = require('./employee');
const PPEItem = require('./ppeItem');
const SizeScale = require('./sizeScale');
const Size = require('./size');
const JobTitlePPEMatrix = require('./jobTitlePPEMatrix');
const Stock = require('./stock');
const Request = require('./request');
const RequestItem = require('./requestItem');
const Allocation = require('./allocation');
const Budget = require('./budget');
const FailureReport = require('./failureReport');
const AuditLog = require('./auditLog');
const Document = require('./document');
const Forecast = require('./forecast');

// ============================================================
// ASSOCIATIONS
// ============================================================

// User <-> Role
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

// User <-> Department (optional, for role-based filtering)
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department', allowNull: true });
Department.hasMany(User, { foreignKey: 'departmentId', as: 'users' });

// User <-> Section (optional, for role-based filtering)
User.belongsTo(Section, { foreignKey: 'sectionId', as: 'section', allowNull: true });
Section.hasMany(User, { foreignKey: 'sectionId', as: 'users' });

// Department <-> Section
Department.hasMany(Section, { foreignKey: 'departmentId', as: 'sections' });
Section.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Department <-> CostCenter
Department.hasMany(CostCenter, { foreignKey: 'departmentId', as: 'costCenters' });
CostCenter.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Employee <-> Section
Employee.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Section.hasMany(Employee, { foreignKey: 'sectionId', as: 'employees' });

// Employee <-> CostCenter
Employee.belongsTo(CostCenter, { foreignKey: 'costCenterId', as: 'costCenter' });
CostCenter.hasMany(Employee, { foreignKey: 'costCenterId', as: 'employees' });

// Stock <-> PPEItem
Stock.belongsTo(PPEItem, { foreignKey: 'ppeItemId', as: 'ppeItem' });
PPEItem.hasMany(Stock, { foreignKey: 'ppeItemId', as: 'stocks' });

// SizeScale <-> Size
Size.belongsTo(SizeScale, { foreignKey: 'scaleId', as: 'scale' });
SizeScale.hasMany(Size, { foreignKey: 'scaleId', as: 'sizes' });

// JobTitlePPEMatrix <-> PPEItem
JobTitlePPEMatrix.belongsTo(PPEItem, { foreignKey: 'ppeItemId', as: 'ppeItem' });
PPEItem.hasMany(JobTitlePPEMatrix, { foreignKey: 'ppeItemId', as: 'jobTitleRequirements' });

// Request <-> User (created by)
Request.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
User.hasMany(Request, { foreignKey: 'createdById', as: 'createdRequests' });

// Request <-> Employee (target employee)
Request.belongsTo(Employee, { foreignKey: 'targetEmployeeId', as: 'targetEmployee' });
Employee.hasMany(Request, { foreignKey: 'targetEmployeeId', as: 'requests' });

// Request <-> User (approvers)
Request.belongsTo(User, { foreignKey: 'hodApproverId', as: 'hodApprover', allowNull: true });
Request.belongsTo(User, { foreignKey: 'deptRepApproverId', as: 'deptRepApprover', allowNull: true });
Request.belongsTo(User, { foreignKey: 'storesApproverId', as: 'storesApprover', allowNull: true });

// Request <-> Department (for filtering/reporting)
Request.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(Request, { foreignKey: 'departmentId', as: 'requests' });

// Request <-> Section (for filtering/reporting)
Request.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Section.hasMany(Request, { foreignKey: 'sectionId', as: 'requests' });

// RequestItem <-> Request
RequestItem.belongsTo(Request, { foreignKey: 'requestId', as: 'request' });
Request.hasMany(RequestItem, { foreignKey: 'requestId', as: 'items' });

// RequestItem <-> PPEItem
RequestItem.belongsTo(PPEItem, { foreignKey: 'ppeItemId', as: 'ppeItem' });
PPEItem.hasMany(RequestItem, { foreignKey: 'ppeItemId', as: 'requestItems' });

// Allocation <-> PPEItem
Allocation.belongsTo(PPEItem, { foreignKey: 'ppeItemId', as: 'ppeItem' });
PPEItem.hasMany(Allocation, { foreignKey: 'ppeItemId', as: 'allocations' });

// Allocation <-> Employee
Allocation.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
Employee.hasMany(Allocation, { foreignKey: 'employeeId', as: 'allocations' });

// Allocation <-> User (issued by)
Allocation.belongsTo(User, { foreignKey: 'issuedById', as: 'issuedBy' });
User.hasMany(Allocation, { foreignKey: 'issuedById', as: 'issuedAllocations' });

// Allocation <-> Request (optional link)
Allocation.belongsTo(Request, { foreignKey: 'requestId', as: 'request', allowNull: true });
Request.hasMany(Allocation, { foreignKey: 'requestId', as: 'allocations' });

// Budget <-> Department
Budget.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(Budget, { foreignKey: 'departmentId', as: 'budgets' });

// Budget <-> Section (optional, for section-specific budgets)
Budget.belongsTo(Section, { foreignKey: 'sectionId', as: 'section', allowNull: true });
Section.hasMany(Budget, { foreignKey: 'sectionId', as: 'budgets' });

// FailureReport <-> PPEItem
FailureReport.belongsTo(PPEItem, { foreignKey: 'ppeItemId', as: 'ppeItem' });
PPEItem.hasMany(FailureReport, { foreignKey: 'ppeItemId', as: 'failureReports' });

// FailureReport <-> User (reported by)
FailureReport.belongsTo(User, { foreignKey: 'reportedById', as: 'reportedBy' });
User.hasMany(FailureReport, { foreignKey: 'reportedById', as: 'reportedFailures' });

// FailureReport <-> User (reviewed by SHEQ)
FailureReport.belongsTo(User, { foreignKey: 'sheqReviewerId', as: 'sheqReviewer', allowNull: true });
User.hasMany(FailureReport, { foreignKey: 'sheqReviewerId', as: 'reviewedFailures' });

// FailureReport <-> Allocation (optional link to specific allocation)
FailureReport.belongsTo(Allocation, { foreignKey: 'allocationId', as: 'allocation', allowNull: true });
Allocation.hasMany(FailureReport, { foreignKey: 'allocationId', as: 'failureReports' });

// AuditLog <-> User
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user', allowNull: true });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

// Document <-> Employee (for PPE cards, etc.)
Document.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee', allowNull: true });
Employee.hasMany(Document, { foreignKey: 'employeeId', as: 'documents' });

// Document <-> User (uploaded by)
Document.belongsTo(User, { foreignKey: 'uploadedById', as: 'uploadedBy' });
User.hasMany(Document, { foreignKey: 'uploadedById', as: 'uploadedDocuments' });

// Forecast <-> Department
Forecast.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(Forecast, { foreignKey: 'departmentId', as: 'forecasts' });

// Forecast <-> PPEItem
Forecast.belongsTo(PPEItem, { foreignKey: 'ppeItemId', as: 'ppeItem' });
PPEItem.hasMany(Forecast, { foreignKey: 'ppeItemId', as: 'forecasts' });

// Export all models
module.exports = {
  Role,
  User,
  Department,
  Section,
  CostCenter,
  Employee,
  PPEItem,
  SizeScale,
  Size,
  JobTitlePPEMatrix,
  Stock,
  Request,
  RequestItem,
  Allocation,
  Budget,
  FailureReport,
  AuditLog,
  Document,
  Forecast
};
