const express = require('express');
const router = express.Router();
const { Request, RequestItem, Employee, User, PPEItem, Section, Department, Allocation, Stock } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { validate } = require('../../middlewares/validation_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const {
  createRequestValidation,
  approveRequestValidation,
  rejectRequestValidation,
  fulfillRequestValidation
} = require('../../validations/request_validation');
const { Op } = require('sequelize');
const db = require('../../database/db');

/**
 * @route   GET /api/v1/requests
 * @desc    Get all requests (filtered by role)
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, employeeId, fromDate, toDate, departmentId, page = 1, limit = 50 } = req.query;
    const userRole = req.user.role.name;

    const where = {};
    
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (fromDate) where.createdAt = { [Op.gte]: new Date(fromDate) };
    if (toDate) {
      where.createdAt = {
        ...where.createdAt,
        [Op.lte]: new Date(toDate)
      };
    }

    // Role-based filtering
    if (userRole === 'section-rep') {
      where.requestedById = req.user.id;
    } else if (userRole === 'hod-hos' && req.user.departmentId) {
      // HOD sees requests from their department
      const include = [{
        model: Employee,
        as: 'targetEmployee',
        required: true,
        include: [{
          model: Section,
          as: 'section',
          required: true,
          where: { departmentId: req.user.departmentId }
        }]
      }];
    } else if (userRole === 'department-rep' && req.user.departmentId) {
      // Dept Rep sees HOD-approved requests from their department
      where.status = { [Op.in]: ['hod-approved', 'dept-rep-approved', 'stores-approved', 'completed'] };
    }

    const offset = (page - 1) * limit;

    const { count, rows: requests } = await Request.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'targetEmployee',
          include: [{
            model: Section,
            as: 'section',
            include: [{ model: Department, as: 'department' }]
          }]
        },
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'hodApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'deptRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'storesApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        {
          model: RequestItem,
          as: 'items',
          include: [{
            model: PPEItem,
            as: 'ppeItem'
          }]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: requests,
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
 * @route   GET /api/v1/requests/:id
 * @desc    Get request by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await Request.findByPk(req.params.id, {
      include: [
        {
          model: Employee,
          as: 'targetEmployee',
          include: [{
            model: Section,
            as: 'section',
            include: [{ model: Department, as: 'department' }]
          }]
        },
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'hodApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'deptRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        { model: User, as: 'storesApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
        {
          model: RequestItem,
          as: 'items',
          include: [{
            model: PPEItem,
            as: 'ppeItem'
          }]
        }
      ]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/requests
 * @desc    Create new PPE request
 * @access  Private (Section Rep)
 */
router.post(
  '/',
  authenticate,
  requireRole('section-rep', 'admin'),
  createRequestValidation,
  validate,
  auditLog('CREATE', 'Request'),
  async (req, res, next) => {
    const transaction = await db.transaction();

    try {
      const { employeeId, items, requestReason } = req.body;

      // Verify employee exists
      const employee = await Employee.findByPk(employeeId, {
        include: [{
          model: Section,
          as: 'section',
          include: [{ model: Department, as: 'department' }]
        }]
      });

      if (!employee) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Verify all PPE items exist
      const ppeItemIds = items.map(item => item.ppeItemId);
      const ppeItems = await PPEItem.findAll({
        where: { id: ppeItemIds }
      });

      if (ppeItems.length !== ppeItemIds.length) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'One or more PPE items not found'
        });
      }

      // Create request
      const request = await Request.create({
        employeeId,
        requestedById: req.user.id,
        requestReason,
        status: 'pending'
      }, { transaction });

      // Create request items
      const requestItems = await Promise.all(
        items.map(item =>
          RequestItem.create({
            requestId: request.id,
            ppeItemId: item.ppeItemId,
            quantity: item.quantity,
            size: item.size,
            reason: item.reason
          }, { transaction })
        )
      );

      await transaction.commit();

      // Get created request with all relations
      const createdRequest = await Request.findByPk(request.id, {
        include: [
          {
            model: Employee,
            as: 'targetEmployee',
            include: [{
              model: Section,
              as: 'section',
              include: [{ model: Department, as: 'department' }]
            }]
          },
          { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
          {
            model: RequestItem,
            as: 'items',
            include: [{
              model: PPEItem,
              as: 'ppeItem'
            }]
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Request created successfully',
        data: createdRequest
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/requests/:id/hod-approve
 * @desc    HOD approve request
 * @access  Private (HOD only)
 */
router.put(
  '/:id/hod-approve',
  authenticate,
  requireRole('hod-hos', 'admin'),
  approveRequestValidation,
  validate,
  auditLog('UPDATE', 'Request'),
  async (req, res, next) => {
    try {
      const { approvalComments } = req.body;

      const request = await Request.findByPk(req.params.id, {
        include: [{
          model: Employee,
          as: 'targetEmployee',
          include: [{
            model: Section,
            as: 'section',
            include: [{ model: Department, as: 'department' }]
          }]
        }]
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve request with status: ${request.status}`
        });
      }

      // Verify HOD is from the same department
      if (req.user.role.name !== 'admin' && req.user.departmentId !== request.employee.section.departmentId) {
        return res.status(403).json({
          success: false,
          message: 'You can only approve requests from your department'
        });
      }

      await request.update({
        status: 'hod-approved',
        hodApproverId: req.user.id,
        hodApprovalDate: new Date(),
        hodApprovalComments: approvalComments
      });

      const updatedRequest = await Request.findByPk(request.id, {
        include: [
          { model: Employee, as: 'targetEmployee' },
          { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
          { model: User, as: 'hodApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
          {
            model: RequestItem,
            as: 'items',
            include: [{ model: PPEItem, as: 'ppeItem' }]
          }
        ]
      });

      res.json({
        success: true,
        message: 'Request approved by HOD',
        data: updatedRequest
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/requests/:id/dept-rep-approve
 * @desc    Department Rep approve request
 * @access  Private (Department Rep only)
 */
router.put(
  '/:id/dept-rep-approve',
  authenticate,
  requireRole('department-rep', 'admin'),
  approveRequestValidation,
  validate,
  auditLog('UPDATE', 'Request'),
  async (req, res, next) => {
    try {
      const { approvalComments } = req.body;

      const request = await Request.findByPk(req.params.id, {
        include: [{
          model: Employee,
          as: 'targetEmployee',
          include: [{
            model: Section,
            as: 'section',
            include: [{ model: Department, as: 'department' }]
          }]
        }]
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }

      if (request.status !== 'hod-approved') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve request with status: ${request.status}. Must be hod-approved.`
        });
      }

      // Verify Dept Rep is from the same department
      if (req.user.role.name !== 'admin' && req.user.departmentId !== request.employee.section.departmentId) {
        return res.status(403).json({
          success: false,
          message: 'You can only approve requests from your department'
        });
      }

      await request.update({
        status: 'dept-rep-approved',
        deptRepApproverId: req.user.id,
        deptRepApprovalDate: new Date(),
        deptRepApprovalComments: approvalComments
      });

      const updatedRequest = await Request.findByPk(request.id, {
        include: [
          { model: Employee, as: 'targetEmployee' },
          { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
          { model: User, as: 'hodApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
          { model: User, as: 'deptRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
          {
            model: RequestItem,
            as: 'items',
            include: [{ model: PPEItem, as: 'ppeItem' }]
          }
        ]
      });

      res.json({
        success: true,
        message: 'Request approved by Department Rep',
        data: updatedRequest
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/requests/:id/stores-approve
 * @desc    Stores approve request
 * @access  Private (Stores only)
 */
router.put(
  '/:id/stores-approve',
  authenticate,
  requireRole('stores', 'admin'),
  approveRequestValidation,
  validate,
  auditLog('UPDATE', 'Request'),
  async (req, res, next) => {
    try {
      const { approvalComments } = req.body;

      const request = await Request.findByPk(req.params.id);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }

      if (request.status !== 'dept-rep-approved') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve request with status: ${request.status}. Must be dept-rep-approved.`
        });
      }

      await request.update({
        status: 'stores-approved',
        storesApproverId: req.user.id,
        storesApprovalDate: new Date(),
        storesApprovalComments: approvalComments
      });

      const updatedRequest = await Request.findByPk(request.id, {
        include: [
          { model: Employee, as: 'targetEmployee' },
          { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
          { model: User, as: 'hodApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
          { model: User, as: 'deptRepApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
          { model: User, as: 'storesApprover', attributes: ['id', 'username', 'firstName', 'lastName'] },
          {
            model: RequestItem,
            as: 'items',
            include: [{ model: PPEItem, as: 'ppeItem' }]
          }
        ]
      });

      res.json({
        success: true,
        message: 'Request approved by Stores',
        data: updatedRequest
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/requests/:id/reject
 * @desc    Reject request (any approver can reject)
 * @access  Private (HOD, Dept Rep, Stores)
 */
router.put(
  '/:id/reject',
  authenticate,
  requireRole('hod-hos', 'department-rep', 'stores', 'admin'),
  rejectRequestValidation,
  validate,
  auditLog('UPDATE', 'Request'),
  async (req, res, next) => {
    try {
      const { rejectionReason } = req.body;

      const request = await Request.findByPk(req.params.id);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }

      if (request.status === 'completed' || request.status === 'rejected') {
        return res.status(400).json({
          success: false,
          message: `Cannot reject request with status: ${request.status}`
        });
      }

      await request.update({
        status: 'rejected',
        rejectedById: req.user.id,
        rejectedDate: new Date(),
        rejectionReason
      });

      const updatedRequest = await Request.findByPk(request.id, {
        include: [
          { model: Employee, as: 'targetEmployee' },
          { model: User, as: 'createdBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
          { model: User, as: 'rejectedBy', attributes: ['id', 'username', 'firstName', 'lastName'] },
          {
            model: RequestItem,
            as: 'items',
            include: [{ model: PPEItem, as: 'ppeItem' }]
          }
        ]
      });

      res.json({
        success: true,
        message: 'Request rejected',
        data: updatedRequest
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
