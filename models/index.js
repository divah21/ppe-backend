// Import all models
const Role = require('./role');
const User = require('./user');
const Department = require('./department');
const Section = require('./section');
const JobTitle = require('./jobTitle');
const CostCenter = require('./costCenter');
const Employee = require('./employee');
const PPEItem = require('./ppeItem');
const SizeScale = require('./sizeScale');
const Size = require('./size');
const JobTitlePPEMatrix = require('./jobTitlePPEMatrix');
const SectionPPEMatrix = require('./sectionPPEMatrix');
const Stock = require('./stock');
const Request = require('./request');
const RequestItem = require('./requestItem');
const Allocation = require('./allocation');
const CompanyBudget = require('./companyBudget');
const Budget = require('./budget');
const FailureReport = require('./failureReport');
const AuditLog = require('./auditLog');
const Document = require('./document');
const Forecast = require('./forecast');
const Setting = require('./setting');

// Consumables models
const ConsumableItem = require('./consumableItem');
const ConsumableStock = require('./consumableStock');
const ConsumableRequest = require('./consumableRequest');
const ConsumableRequestItem = require('./consumableRequestItem');
const ConsumableAllocation = require('./consumableAllocation');

// ============================================================
// ASSOCIATIONS
// ============================================================

// User <-> Role
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

// User <-> Employee (One-to-One: User is a promoted Employee)
User.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
Employee.hasOne(User, { foreignKey: 'employeeId', as: 'userAccount' });

// User <-> Department (For HOD/Department Rep - manages specific department)
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'managedDepartment' });
Department.hasMany(User, { foreignKey: 'departmentId', as: 'managers' });

// User <-> Section (For Section Rep - manages specific section)
User.belongsTo(Section, { foreignKey: 'sectionId', as: 'managedSection' });
Section.hasMany(User, { foreignKey: 'sectionId', as: 'sectionReps' });

// Department <-> Section
Department.hasMany(Section, { foreignKey: 'departmentId', as: 'sections' });
Section.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Section <-> JobTitle
Section.hasMany(JobTitle, { foreignKey: 'sectionId', as: 'jobTitles' });
JobTitle.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

// Department <-> CostCenter
Department.hasMany(CostCenter, { foreignKey: 'departmentId', as: 'costCenters' });
CostCenter.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Employee <-> Section
Employee.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Section.hasMany(Employee, { foreignKey: 'sectionId', as: 'employees' });

// Employee <-> JobTitle
Employee.belongsTo(JobTitle, { foreignKey: 'jobTitleId', as: 'jobTitleRef', allowNull: true });
JobTitle.hasMany(Employee, { foreignKey: 'jobTitleId', as: 'employees' });

// Employee <-> CostCenter
Employee.belongsTo(CostCenter, { foreignKey: 'costCenterId', as: 'costCenter' });
CostCenter.hasMany(Employee, { foreignKey: 'costCenterId', as: 'employees' });

// Stock <-> PPEItem
Stock.belongsTo(PPEItem, { foreignKey: 'ppeItemId', as: 'ppeItem' });
PPEItem.hasMany(Stock, { foreignKey: 'ppeItemId', as: 'stocks' });

// SizeScale <-> Size
Size.belongsTo(SizeScale, { foreignKey: 'scaleId', as: 'scale' });
SizeScale.hasMany(Size, { foreignKey: 'scaleId', as: 'sizes' });

// JobTitlePPEMatrix <-> JobTitle
JobTitlePPEMatrix.belongsTo(JobTitle, { foreignKey: 'jobTitleId', as: 'jobTitleRef', allowNull: true });
JobTitle.hasMany(JobTitlePPEMatrix, { foreignKey: 'jobTitleId', as: 'ppeRequirements' });

// JobTitlePPEMatrix <-> PPEItem
JobTitlePPEMatrix.belongsTo(PPEItem, { foreignKey: 'ppeItemId', as: 'ppeItem' });
PPEItem.hasMany(JobTitlePPEMatrix, { foreignKey: 'ppeItemId', as: 'jobTitleRequirements' });

// SectionPPEMatrix <-> Section
SectionPPEMatrix.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Section.hasMany(SectionPPEMatrix, { foreignKey: 'sectionId', as: 'ppeRequirements' });

// SectionPPEMatrix <-> PPEItem
SectionPPEMatrix.belongsTo(PPEItem, { foreignKey: 'ppeItemId', as: 'ppeItem' });
PPEItem.hasMany(SectionPPEMatrix, { foreignKey: 'ppeItemId', as: 'sectionRequirements' });

// Request <-> User (created by)
Request.belongsTo(User, { foreignKey: 'requestedById', as: 'createdBy' });
User.hasMany(Request, { foreignKey: 'requestedById', as: 'createdRequests' });

// Request <-> Employee (target employee)
Request.belongsTo(Employee, { foreignKey: 'employeeId', as: 'targetEmployee' });
Employee.hasMany(Request, { foreignKey: 'employeeId', as: 'requests', onDelete: 'CASCADE' });

// Request <-> User (approvers)
Request.belongsTo(User, { foreignKey: 'sectionRepApproverId', as: 'sectionRepApprover', allowNull: true });
Request.belongsTo(User, { foreignKey: 'deptRepApproverId', as: 'deptRepApprover', allowNull: true });
Request.belongsTo(User, { foreignKey: 'hodApproverId', as: 'hodApprover', allowNull: true });
Request.belongsTo(User, { foreignKey: 'storesApproverId', as: 'storesApprover', allowNull: true });
Request.belongsTo(User, { foreignKey: 'rejectedById', as: 'rejectedBy', allowNull: true });
Request.belongsTo(User, { foreignKey: 'fulfilledByUserId', as: 'fulfilledBy', allowNull: true });

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
Employee.hasMany(Allocation, { foreignKey: 'employeeId', as: 'allocations', onDelete: 'CASCADE' });

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

// CompanyBudget <-> Budget (company budget allocates to department budgets)
Budget.belongsTo(CompanyBudget, { foreignKey: 'companyBudgetId', as: 'companyBudget', allowNull: true });
CompanyBudget.hasMany(Budget, { foreignKey: 'companyBudgetId', as: 'departmentBudgets' });

// CompanyBudget <-> User (created by)
CompanyBudget.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy', allowNull: true });
User.hasMany(CompanyBudget, { foreignKey: 'createdById', as: 'createdBudgets' });

// FailureReport <-> Employee
FailureReport.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
Employee.hasMany(FailureReport, { foreignKey: 'employeeId', as: 'failureReports', onDelete: 'CASCADE' });

// FailureReport <-> PPEItem
FailureReport.belongsTo(PPEItem, { foreignKey: 'ppeItemId', as: 'ppeItem' });
PPEItem.hasMany(FailureReport, { foreignKey: 'ppeItemId', as: 'failureReports' });

// FailureReport <-> Allocation (optional link to specific allocation)
FailureReport.belongsTo(Allocation, { foreignKey: 'allocationId', as: 'allocation', allowNull: true });
Allocation.hasMany(FailureReport, { foreignKey: 'allocationId', as: 'failureReports' });

// FailureReport <-> Stock (the stock item that failed)
FailureReport.belongsTo(Stock, { foreignKey: 'stockId', as: 'stock', allowNull: true });
Stock.hasMany(FailureReport, { foreignKey: 'stockId', as: 'failureReports' });

// FailureReport <-> Stock (replacement stock)
FailureReport.belongsTo(Stock, { foreignKey: 'replacementStockId', as: 'replacementStock', allowNull: true });

// Allocation <-> Stock
Allocation.belongsTo(Stock, { foreignKey: 'stockId', as: 'stock', allowNull: true });
Stock.hasMany(Allocation, { foreignKey: 'stockId', as: 'allocations' });

// AuditLog <-> User
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user', allowNull: true });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

// Document <-> Employee (for PPE cards, etc.)
Document.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee', allowNull: true });
Employee.hasMany(Document, { foreignKey: 'employeeId', as: 'documents', onDelete: 'CASCADE' });

// Document <-> User (uploaded by)
Document.belongsTo(User, { foreignKey: 'uploadedById', as: 'uploadedBy' });
User.hasMany(Document, { foreignKey: 'uploadedById', as: 'uploadedDocuments' });

// Forecast <-> Department
Forecast.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(Forecast, { foreignKey: 'departmentId', as: 'forecasts' });

// Forecast <-> PPEItem
Forecast.belongsTo(PPEItem, { foreignKey: 'ppeItemId', as: 'ppeItem' });
PPEItem.hasMany(Forecast, { foreignKey: 'ppeItemId', as: 'forecasts' });

// ============================================================
// CONSUMABLES ASSOCIATIONS
// ============================================================

// ConsumableStock <-> ConsumableItem
ConsumableStock.belongsTo(ConsumableItem, { foreignKey: 'consumableItemId', as: 'consumableItem' });
ConsumableItem.hasMany(ConsumableStock, { foreignKey: 'consumableItemId', as: 'stocks' });

// ConsumableRequest <-> Section
ConsumableRequest.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Section.hasMany(ConsumableRequest, { foreignKey: 'sectionId', as: 'consumableRequests' });

// ConsumableRequest <-> Department
ConsumableRequest.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(ConsumableRequest, { foreignKey: 'departmentId', as: 'consumableRequests' });

// ConsumableRequest <-> User (created by)
ConsumableRequest.belongsTo(User, { foreignKey: 'requestedById', as: 'requestedBy' });
User.hasMany(ConsumableRequest, { foreignKey: 'requestedById', as: 'consumableRequests' });

// ConsumableRequest <-> User (HOD approver)
ConsumableRequest.belongsTo(User, { foreignKey: 'hodApproverId', as: 'hodApprover' });

// ConsumableRequest <-> User (Stores approver)
ConsumableRequest.belongsTo(User, { foreignKey: 'storesApproverId', as: 'storesApprover' });

// ConsumableRequestItem <-> ConsumableRequest
ConsumableRequestItem.belongsTo(ConsumableRequest, { foreignKey: 'consumableRequestId', as: 'request' });
ConsumableRequest.hasMany(ConsumableRequestItem, { foreignKey: 'consumableRequestId', as: 'items' });

// ConsumableRequestItem <-> ConsumableItem
ConsumableRequestItem.belongsTo(ConsumableItem, { foreignKey: 'consumableItemId', as: 'consumableItem' });
ConsumableItem.hasMany(ConsumableRequestItem, { foreignKey: 'consumableItemId', as: 'requestItems' });

// ConsumableAllocation <-> ConsumableItem
ConsumableAllocation.belongsTo(ConsumableItem, { foreignKey: 'consumableItemId', as: 'consumableItem' });
ConsumableItem.hasMany(ConsumableAllocation, { foreignKey: 'consumableItemId', as: 'allocations' });

// ConsumableAllocation <-> Section
ConsumableAllocation.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Section.hasMany(ConsumableAllocation, { foreignKey: 'sectionId', as: 'consumableAllocations' });

// ConsumableAllocation <-> Department
ConsumableAllocation.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(ConsumableAllocation, { foreignKey: 'departmentId', as: 'consumableAllocations' });

// ConsumableAllocation <-> ConsumableRequest
ConsumableAllocation.belongsTo(ConsumableRequest, { foreignKey: 'consumableRequestId', as: 'request' });
ConsumableRequest.hasMany(ConsumableAllocation, { foreignKey: 'consumableRequestId', as: 'allocations' });

// ConsumableAllocation <-> User (issued by)
ConsumableAllocation.belongsTo(User, { foreignKey: 'issuedById', as: 'issuedBy' });
User.hasMany(ConsumableAllocation, { foreignKey: 'issuedById', as: 'consumableAllocationsIssued' });

// ConsumableAllocation <-> User (received by)
ConsumableAllocation.belongsTo(User, { foreignKey: 'receivedById', as: 'receivedBy' });

// Export all models
module.exports = {
  Role,
  User,
  Department,
  Section,
  JobTitle,
  CostCenter,
  Employee,
  PPEItem,
  SizeScale,
  Size,
  JobTitlePPEMatrix,
  SectionPPEMatrix,
  Stock,
  Request,
  RequestItem,
  Allocation,
  CompanyBudget,
  Budget,
  FailureReport,
  AuditLog,
  Document,
  Forecast,
  Setting,
  // Consumables
  ConsumableItem,
  ConsumableStock,
  ConsumableRequest,
  ConsumableRequestItem,
  ConsumableAllocation
};
