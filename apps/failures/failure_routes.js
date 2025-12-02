const express = require('express');
const router = express.Router();
const { FailureReport, Employee, PPEItem, Allocation, Section, Department } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');

/**
 * @route   GET /api/v1/failures
 * @desc    Get all failure reports
 * @access  Private (Section Rep, HOD, Dept Rep, Stores, SHEQ, Admin)
 */
router.get('/', authenticate, requireRole('section-rep', 'hod', 'department-rep', 'stores', 'sheq', 'admin'), async (req, res, next) => {
  try {
    const {
      status,
      severity,
      employeeId,
      ppeItemId,
      environment,
      brand,
      fromDate,
      toDate,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (employeeId) where.employeeId = employeeId;
    if (ppeItemId) where.ppeItemId = ppeItemId;
    if (environment) where.observedAt = environment;
    if (fromDate) where.reportedDate = { $gte: new Date(fromDate) };
    if (toDate) {
      where.reportedDate = {
        ...where.reportedDate,
        $lte: new Date(toDate)
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows: reports } = await FailureReport.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'worksNumber', 'jobTitle', 'sectionId'],
          include: [{
            model: Section,
            as: 'section',
            include: [{ model: Department, as: 'department' }]
          }]
        },
        {
          model: PPEItem,
          as: 'ppeItem',
          attributes: ['id', 'name', 'itemCode', 'category', 'supplier', 'productName']
        },
        {
          model: Allocation,
          as: 'allocation',
          attributes: ['id', 'issueDate']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['reportedDate', 'DESC']]
    });

    res.json({
      success: true,
      data: reports,
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
 * @route   GET /api/v1/failures/:id
 * @desc    Get failure report by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const report = await FailureReport.findByPk(req.params.id, {
      include: [
        {
          model: Employee,
          as: 'employee'
        },
        {
          model: PPEItem,
          as: 'ppeItem'
        },
        {
          model: Allocation,
          as: 'allocation'
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Failure report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/failures
 * @desc    Create failure report
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  [
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('failureType').isIn(['damage', 'defect', 'lost', 'wear']).withMessage('Invalid failure type'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
    body('employeeId').isUUID().withMessage('Invalid employee ID'),
    body('ppeItemId').isUUID().withMessage('Invalid PPE item ID'),
    body('allocationId').optional().isUUID().withMessage('Invalid allocation ID'),
    body('observedAt').optional().trim(),
    body('brand').optional().trim(),
    body('failureDate').optional().isISO8601().withMessage('Invalid failure date'),
    body('remarks').optional().trim()
  ],
  validate,
  auditLog('CREATE', 'FailureReport'),
  async (req, res, next) => {
    try {
      const { description, failureType, severity, employeeId, ppeItemId, allocationId, observedAt, brand, failureDate, remarks } = req.body;

      // Verify employee exists
      const employee = await Employee.findByPk(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Verify PPE item exists
      const ppeItem = await PPEItem.findByPk(ppeItemId);
      if (!ppeItem) {
        return res.status(404).json({
          success: false,
          message: 'PPE item not found'
        });
      }

      const report = await FailureReport.create({
        description,
        failureType,
        severity,
        employeeId,
        ppeItemId,
        allocationId,
        observedAt,
        brand,
        failureDate: failureDate || new Date(),
        remarks,
        reportedDate: new Date(),
        status: 'pending'
      });

      const createdReport = await FailureReport.findByPk(report.id, {
        include: [
          { model: Employee, as: 'employee' },
          { model: PPEItem, as: 'ppeItem' }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Failure report created successfully',
        data: createdReport
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/failures/:id
 * @desc    Update failure report
 * @access  Private (Stores, SHEQ, Admin)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('stores', 'sheq', 'admin'),
  [
    param('id').isUUID().withMessage('Invalid failure report ID'),
    body('status').optional().isIn(['reported', 'under-review', 'resolved', 'closed']).withMessage('Invalid status'),
    body('reviewedBySHEQ').optional().isBoolean(),
    body('sheqDecision').optional().trim(),
    body('actionTaken').optional().trim()
  ],
  validate,
  auditLog('UPDATE', 'FailureReport'),
  async (req, res, next) => {
    try {
      const report = await FailureReport.findByPk(req.params.id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Failure report not found'
        });
      }

      // If SHEQ is reviewing, set review date
      if (req.body.reviewedBySHEQ === true && !report.sheqReviewDate) {
        req.body.sheqReviewDate = new Date();
      }

      await report.update(req.body);

      const updatedReport = await FailureReport.findByPk(report.id, {
        include: [
          { model: Employee, as: 'employee' },
          { model: PPEItem, as: 'ppeItem' }
        ]
      });

      res.json({
        success: true,
        message: 'Failure report updated successfully',
        data: updatedReport
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/failures/:id
 * @desc    Delete failure report
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  [param('id').isUUID().withMessage('Invalid failure report ID')],
  validate,
  auditLog('DELETE', 'FailureReport'),
  async (req, res, next) => {
    try {
      const report = await FailureReport.findByPk(req.params.id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Failure report not found'
        });
      }

      await report.destroy();

      res.json({
        success: true,
        message: 'Failure report deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
