const express = require('express');
const router = express.Router();
const { Employee, Section, Department, Allocation, PPEItem, Request, JobTitlePPEMatrix, Stock, JobTitle } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { validate } = require('../../middlewares/validation_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { createEmployeeValidation, updateEmployeeValidation } = require('../../validations/employee_validation');
const { Op } = require('sequelize');

/**
 * @route   GET /api/v1/employees
 * @desc    Get all employees
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, sectionId, departmentId, isActive, jobType } = req.query;

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

    // Get PPE matrix for employee job title
    // Support both new jobTitleId approach and legacy jobTitle string
    const matrixWhere = { isActive: true };
    if (employee.jobTitleId) {
      matrixWhere.jobTitleId = employee.jobTitleId;
    } else if (employee.jobTitle) {
      matrixWhere.jobTitle = employee.jobTitle;
    }

    const matrixEntries = await JobTitlePPEMatrix.findAll({
      where: matrixWhere,
      include: [{ model: PPEItem, as: 'ppeItem' }]
    });

    // Latest allocations per PPE item for this employee
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

    for (const entry of matrixEntries) {
      const ppeItem = entry.ppeItem;

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
        const months = latestAlloc.replacementFrequency || entry.replacementFrequency || ppeItem.replacementFrequency || 12;
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
        quantityRequired: entry.quantityRequired,
        replacementFrequency: entry.replacementFrequency || ppeItem.replacementFrequency || null,
        sizes,
        hasSizeVariants: ppeItem.hasSizeVariants,
        lastIssueDate,
        nextDueDate,
        eligibleNowForAnnual
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
        eligibility
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

module.exports = router;
