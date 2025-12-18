const express = require('express');
const router = express.Router();
const { Employee, Section, Department, Allocation, PPEItem, Request, JobTitlePPEMatrix, SectionPPEMatrix, Stock, JobTitle, CostCenter, User } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { validate } = require('../../middlewares/validation_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { createEmployeeValidation, updateEmployeeValidation, bulkUploadEmployeeValidation } = require('../../validations/employee_validation');
const { Op } = require('sequelize');
const { sequelize } = require('../../database/db');

/**
 * @route   GET /api/v1/employees
 * @desc    Get all employees
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 500, search, sectionId, departmentId, isActive, jobType } = req.query;

    const where = {};
    
    // ROLE-BASED FILTERING: Section Rep can only see employees in their section
    if (req.userRole === 'section-rep' && req.user.sectionId) {
      where.sectionId = req.user.sectionId;
    } else if (req.userRole === 'dept-rep' && req.user.departmentId) {
      // Department Rep can see all employees in their department
      // Will be filtered via include below
    }
    
    if (search) {
      where[Op.or] = [
        { worksNumber: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (sectionId) where.sectionId = sectionId;
    if (jobType) where.jobType = jobType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const include = [
      {
        model: Section,
        as: 'section',
        include: [{
          model: Department,
          as: 'department'
        }]
      },
      {
        model: JobTitle,
        as: 'jobTitleRef',
        required: false
      }
    ];

    // Filter by department through section
    if (departmentId) {
      include[0].where = { departmentId };
    } else if (req.userRole === 'dept-rep' && req.user.departmentId) {
      // Department Rep sees only their department
      include[0].where = { departmentId: req.user.departmentId };
    }

    const offset = (page - 1) * limit;

    const { count, rows: employees } = await Employee.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: employees,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/employees/:id
 * @desc    Get employee by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        {
          model: Section,
          as: 'section',
          include: [{
            model: Department,
            as: 'department'
          }]
        },
        {
          model: JobTitle,
          as: 'jobTitleRef',
          required: false
        }
      ]
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/employees/:id/allocations
 * @desc    Get employee allocation history
 * @access  Private
 */
router.get('/:id/allocations', authenticate, async (req, res, next) => {
  try {
    const { status, fromDate, toDate } = req.query;

    const where = { employeeId: req.params.id };
    
    if (status) where.status = status;
    if (fromDate) where.issueDate = { [Op.gte]: new Date(fromDate) };
    if (toDate) {
      where.issueDate = {
        ...where.issueDate,
        [Op.lte]: new Date(toDate)
      };
    }

    const allocations = await Allocation.findAll({
      where,
      include: [
        {
          model: PPEItem,
          as: 'ppeItem',
          attributes: ['id', 'name', 'itemCode', 'category', 'replacementFrequency']
        }
      ],
      order: [['issueDate', 'DESC']]
    });

    res.json({
      success: true,
      data: allocations
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/employees/:id/requests
 * @desc    Get employee request history
 * @access  Private
 */
router.get('/:id/requests', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;

    const where = { employeeId: req.params.id };
    if (status) where.status = status;

    const requests = await Request.findAll({
      where,
      include: ['requestedBy', 'hodApprover', 'deptRepApprover', 'storesApprover'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/employees/:id/ppe-eligibility
 * @desc    Get employee details plus PPE eligibility and sizing table
 *          Combines BOTH Job Title PPE Matrix AND Section PPE Matrix
 * @access  Private
 */
router.get('/:id/ppe-eligibility', authenticate, async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        {
          model: Section,
          as: 'section',
          include: [{
            model: Department,
            as: 'department'
          }]
        }
      ]
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // ==========================================
    // 1. Get PPE from Job Title Matrix
    // ==========================================
    const jobTitleMatrixWhere = { isActive: true };
    if (employee.jobTitleId) {
      jobTitleMatrixWhere.jobTitleId = employee.jobTitleId;
    } else if (employee.jobTitle) {
      jobTitleMatrixWhere.jobTitle = employee.jobTitle;
    }

    const jobTitleMatrixEntries = await JobTitlePPEMatrix.findAll({
      where: jobTitleMatrixWhere,
      include: [{ model: PPEItem, as: 'ppeItem' }]
    });

    // ==========================================
    // 2. Get PPE from Section Matrix
    // ==========================================
    let sectionMatrixEntries = [];
    if (employee.sectionId) {
      sectionMatrixEntries = await SectionPPEMatrix.findAll({
        where: { 
          sectionId: employee.sectionId,
          isActive: true 
        },
        include: [{ model: PPEItem, as: 'ppeItem' }]
      });
    }

    // ==========================================
    // 3. Merge both matrices (Job Title overrides Section)
    // ==========================================
    // Create a map to track PPE items - Job Title takes priority
    const ppeItemMap = new Map();
    
    // First, add all Section Matrix items (baseline)
    for (const entry of sectionMatrixEntries) {
      if (entry.ppeItem) {
        ppeItemMap.set(entry.ppeItem.id, {
          source: 'section',
          entry: entry,
          ppeItem: entry.ppeItem,
          quantityRequired: entry.quantityRequired,
          replacementFrequency: entry.replacementFrequency,
          isMandatory: entry.isMandatory
        });
      }
    }

    // Then, add/override with Job Title Matrix items (takes priority)
    for (const entry of jobTitleMatrixEntries) {
      if (entry.ppeItem) {
        ppeItemMap.set(entry.ppeItem.id, {
          source: 'jobTitle',
          entry: entry,
          ppeItem: entry.ppeItem,
          quantityRequired: entry.quantityRequired,
          replacementFrequency: entry.replacementFrequency,
          isMandatory: entry.isMandatory !== undefined ? entry.isMandatory : true
        });
      }
    }

    // ==========================================
    // 4. Get latest allocations per PPE item
    // ==========================================
    const allocations = await Allocation.findAll({
      where: { employeeId: employee.id },
      include: [{ model: PPEItem, as: 'ppeItem' }],
      order: [['issueDate', 'DESC']]
    });

    const latestByItem = {};
    for (const alloc of allocations) {
      if (!latestByItem[alloc.ppeItemId]) {
        latestByItem[alloc.ppeItemId] = alloc;
      }
    }

    const now = new Date();
    const eligibility = [];

    // ==========================================
    // 5. Build eligibility list from merged map
    // ==========================================
    for (const [ppeItemId, data] of ppeItemMap) {
      const ppeItem = data.ppeItem;

      // Determine available sizes either from PPE item metadata or stock variants
      let sizes = Array.isArray(ppeItem.availableSizes) ? ppeItem.availableSizes : null;
      if (!sizes && ppeItem.hasSizeVariants) {
        const stockRows = await Stock.findAll({
          where: { ppeItemId: ppeItem.id },
          attributes: ['size'],
          group: ['size']
        });
        sizes = stockRows
          .map(s => s.size)
          .filter(v => v !== null && v !== undefined)
          .sort();
      }

      const latestAlloc = latestByItem[ppeItem.id];
      let lastIssueDate = null;
      let nextDueDate = null;
      let eligibleNowForAnnual = true;

      if (latestAlloc) {
        lastIssueDate = latestAlloc.issueDate;
        const months = latestAlloc.replacementFrequency || data.replacementFrequency || ppeItem.replacementFrequency || 12;
        const due = new Date(lastIssueDate);
        due.setMonth(due.getMonth() + months);
        nextDueDate = due;
        eligibleNowForAnnual = now >= due;
      }

      eligibility.push({
        ppeItemId: ppeItem.id,
        itemName: ppeItem.name,
        itemCode: ppeItem.itemCode,
        category: ppeItem.category,
        quantityRequired: data.quantityRequired,
        replacementFrequency: data.replacementFrequency || ppeItem.replacementFrequency || null,
        sizes,
        hasSizeVariants: ppeItem.hasSizeVariants,
        lastIssueDate,
        nextDueDate,
        eligibleNowForAnnual,
        source: data.source, // 'jobTitle' or 'section' - indicates where this requirement came from
        isMandatory: data.isMandatory
      });
    }

    const responseEmployee = {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      worksNumber: employee.worksNumber,
      jobTitle: employee.jobTitle,
      section: employee.section ? employee.section.name : null,
      department: employee.section && employee.section.department ? employee.section.department.name : null
    };

    res.json({
      success: true,
      data: {
        employee: responseEmployee,
        eligibility,
        summary: {
          fromJobTitle: eligibility.filter(e => e.source === 'jobTitle').length,
          fromSection: eligibility.filter(e => e.source === 'section').length,
          total: eligibility.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/employees
 * @desc    Create new employee
 * @access  Private (Admin, Section Rep, Department Rep)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin', 'section-rep', 'department-rep'),
  createEmployeeValidation,
  validate,
  auditLog('CREATE', 'Employee'),
  async (req, res, next) => {
    try {
      const {
        worksNumber,
        firstName,
        lastName,
        jobType,
        jobTitleId,
        sectionId,
        email,
        phoneNumber,
        dateOfBirth,
        dateJoined
      } = req.body;

      // Check if works number exists
      const existing = await Employee.findOne({ where: { worksNumber } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Works number already exists'
        });
      }

      // Verify section exists
      const section = await Section.findByPk(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }

      // Verify job title exists if provided
      if (jobTitleId) {
        const jobTitle = await JobTitle.findByPk(jobTitleId);
        if (!jobTitle) {
          return res.status(404).json({
            success: false,
            message: 'Job title not found'
          });
        }
      }

      // Create employee
      const employee = await Employee.create({
        worksNumber,
        firstName,
        lastName,
        jobType,
        jobTitleId,
        sectionId,
        email,
        phoneNumber,
        dateOfBirth,
        dateJoined: dateJoined || new Date()
      });

      // Get employee with relations
      const createdEmployee = await Employee.findByPk(employee.id, {
        include: [
          {
            model: Section,
            as: 'section',
            include: [{ model: Department, as: 'department' }]
          },
          {
            model: JobTitle,
            as: 'jobTitleRef',
            required: false
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: createdEmployee
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/employees/:id
 * @desc    Update employee
 * @access  Private (Admin, Section Rep, Department Rep)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin', 'section-rep', 'department-rep'),
  updateEmployeeValidation,
  validate,
  auditLog('UPDATE', 'Employee'),
  async (req, res, next) => {
    try {
      const employee = await Employee.findByPk(req.params.id);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Check if works number is being changed and if it already exists
      if (req.body.worksNumber && req.body.worksNumber !== employee.worksNumber) {
        const existing = await Employee.findOne({
          where: { worksNumber: req.body.worksNumber }
        });

        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Works number already exists'
          });
        }
      }

      // Update employee
      await employee.update(req.body);

      // Get updated employee with relations
      const updatedEmployee = await Employee.findByPk(employee.id, {
        include: [
          {
            model: Section,
            as: 'section',
            include: [{ model: Department, as: 'department' }]
          },
          {
            model: JobTitle,
            as: 'jobTitleRef',
            required: false
          }
        ]
      });

      res.json({
        success: true,
        message: 'Employee updated successfully',
        data: updatedEmployee
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/employees/:id
 * @desc    Delete employee (hard delete with cascade)
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  auditLog('DELETE', 'Employee'),
  async (req, res, next) => {
    try {
      const employee = await Employee.findByPk(req.params.id);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Hard delete - will cascade to related records (allocations, requests, etc.)
      await employee.destroy();

      res.json({
        success: true,
        message: 'Employee and all related records deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/employees/:id/activate
 * @desc    Activate employee
 * @access  Private (Admin only)
 */
router.put(
  '/:id/activate',
  authenticate,
  requireRole('admin'),
  auditLog('UPDATE', 'Employee'),
  async (req, res, next) => {
    try {
      const employee = await Employee.findByPk(req.params.id);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      await employee.update({ isActive: true });

      res.json({
        success: true,
        message: 'Employee activated successfully',
        data: employee
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/employees/bulk-upload
 * @desc    Bulk upload employees from Excel data
 * @access  Private (Admin only)
 * 
 * Expected Excel columns mapping:
 * - Code -> worksNumber
 * - FirstName -> firstName
 * - Surname -> lastName
 * - Job Title -> jobTitle (legacy) or matched to jobTitleId
 * - Nec/Salaried -> jobType
 * - Cost centre -> costCenterId (matched by name)
 * - SECTION -> sectionId (matched by name)
 * - Gender -> gender
 * - Contract -> contractType
 */
router.post(
  '/bulk-upload',
  authenticate,
  requireRole('admin'),
  auditLog('BULK_CREATE', 'Employee'),
  async (req, res, next) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { employees, skipDuplicates = true } = req.body;

      if (!Array.isArray(employees) || employees.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Employees array is required and must not be empty'
        });
      }

      // Pre-fetch sections and cost centers for name-to-ID mapping
      const sections = await Section.findAll({
        include: [{ model: Department, as: 'department' }]
      });
      const costCenters = await CostCenter.findAll();
      const jobTitles = await JobTitle.findAll();

      // Build lookup maps - trim names to handle whitespace in Excel data
      const sectionMap = {};
      sections.forEach(s => {
        sectionMap[s.name.trim().toUpperCase()] = s.id;
        // Also map by section code if available
        if (s.code) sectionMap[s.code.trim().toUpperCase()] = s.id;
      });

      const costCenterMap = {};
      costCenters.forEach(cc => {
        costCenterMap[cc.name.trim().toUpperCase()] = cc.id;
        if (cc.code) costCenterMap[cc.code.trim().toUpperCase()] = cc.id;
      });

      const jobTitleMap = {};
      jobTitles.forEach(jt => {
        jobTitleMap[jt.name.trim().toUpperCase()] = jt.id;
      });

      const results = {
        created: [],
        skipped: [],
        errors: []
      };

      for (let i = 0; i < employees.length; i++) {
        const row = employees[i];
        const rowNum = i + 2; // Excel row (1-indexed + header)

        try {
          // Map Excel columns to model fields
          const worksNumber = row.Code || row.worksNumber || row.code;
          const firstName = row.FirstName || row.firstName || row.first_name;
          const lastName = row.Surname || row.lastName || row.last_name || row.surname;
          const jobTitleName = row['Job Title'] || row.jobTitle || row.job_title;
          const jobType = row['Nec/ Salaried'] || row['Nec/Salaried'] || row.jobType || row.job_type;
          const sectionName = row.SECTION || row.Section || row.section || row.sectionName;
          const costCenterName = row['Cost centre'] || row['Cost Center'] || row.costCenter || row.cost_center;
          const gender = row.Gender || row.gender;
          const contractType = row.Contract || row.contractType || row.contract_type;

          // Validate required fields
          if (!worksNumber) {
            results.errors.push({ row: rowNum, error: 'Works number (Code) is required' });
            continue;
          }
          if (!firstName) {
            results.errors.push({ row: rowNum, worksNumber, error: 'First name is required' });
            continue;
          }
          if (!lastName) {
            results.errors.push({ row: rowNum, worksNumber, error: 'Last name is required' });
            continue;
          }

          // Check for duplicate works number
          const existing = await Employee.findOne({ 
            where: { worksNumber },
            transaction 
          });
          
          if (existing) {
            if (skipDuplicates) {
              results.skipped.push({ row: rowNum, worksNumber, reason: 'Already exists' });
              continue;
            } else {
              results.errors.push({ row: rowNum, worksNumber, error: 'Works number already exists' });
              continue;
            }
          }

          // Resolve section ID - trim whitespace for matching
          let sectionId = row.sectionId;
          if (!sectionId && sectionName) {
            const trimmedSectionName = sectionName.toString().trim().toUpperCase();
            sectionId = sectionMap[trimmedSectionName];
            if (!sectionId) {
              results.errors.push({ 
                row: rowNum, 
                worksNumber, 
                error: `Section not found: "${sectionName}"` 
              });
              continue;
            }
          }
          if (!sectionId) {
            results.errors.push({ row: rowNum, worksNumber, error: 'Section is required' });
            continue;
          }

          // Resolve cost center ID (optional) - trim whitespace for matching
          let costCenterId = row.costCenterId;
          if (!costCenterId && costCenterName) {
            const trimmedCostCenterName = costCenterName.toString().trim().toUpperCase();
            costCenterId = costCenterMap[trimmedCostCenterName];
          }

          // Resolve job title ID (optional) - trim whitespace for matching
          let jobTitleId = row.jobTitleId;
          if (!jobTitleId && jobTitleName) {
            const trimmedJobTitleName = jobTitleName.toString().trim().toUpperCase();
            jobTitleId = jobTitleMap[trimmedJobTitleName];
          }

          // Create employee
          const employee = await Employee.create({
            worksNumber,
            firstName,
            lastName,
            jobTitle: jobTitleName, // Legacy field
            jobTitleId,
            jobType: jobType?.toUpperCase(),
            sectionId,
            costCenterId,
            gender: gender?.toUpperCase(),
            contractType: contractType?.toUpperCase(),
            isActive: contractType?.toUpperCase() !== 'TERMINATED'
          }, { transaction });

          results.created.push({
            row: rowNum,
            id: employee.id,
            worksNumber,
            name: `${firstName} ${lastName}`
          });

        } catch (rowError) {
          results.errors.push({
            row: rowNum,
            worksNumber: row.Code || row.worksNumber,
            error: rowError.message
          });
        }
      }

      // Only commit if we have successful creates
      if (results.created.length > 0) {
        await transaction.commit();
      } else {
        await transaction.rollback();
      }

      res.status(results.created.length > 0 ? 201 : 400).json({
        success: results.created.length > 0,
        message: `Bulk upload complete: ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors`,
        data: results
      });

    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/employees/:id/user-account
 * @desc    Check if employee has a user account
 * @access  Private (Admin only)
 */
router.get(
  '/:id/user-account',
  authenticate,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const employee = await Employee.findByPk(req.params.id, {
        include: [{
          model: User,
          as: 'userAccount',
          attributes: ['id', 'username', 'isActive', 'lastLogin'],
          include: [{ model: require('../../models/role'), as: 'role' }]
        }]
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.json({
        success: true,
        data: {
          employee: {
            id: employee.id,
            worksNumber: employee.worksNumber,
            name: `${employee.firstName} ${employee.lastName}`
          },
          hasUserAccount: !!employee.userAccount,
          userAccount: employee.userAccount || null
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
