const express = require('express');
const router = express.Router();
const { CostCenter, Department, Employee } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { Op } = require('sequelize');

/**
 * @route   GET /api/v1/cost-centers
 * @desc    Get all cost centers
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { departmentId, search, page = 1, limit = 50 } = req.query;

    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: costCenters } = await CostCenter.findAndCountAll({
      where,
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code']
      }],
      limit: parseInt(limit),
      offset,
      order: [['code', 'ASC']]
    });

    res.json({
      success: true,
      data: costCenters,
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
 * @route   GET /api/v1/cost-centers/:id
 * @desc    Get cost center by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const costCenter = await CostCenter.findByPk(req.params.id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Employee,
          as: 'employees',
          attributes: ['id', 'worksNumber', 'firstName', 'lastName', 'jobTitle']
        }
      ]
    });

    if (!costCenter) {
      return res.status(404).json({
        success: false,
        message: 'Cost center not found'
      });
    }

    res.json({
      success: true,
      data: costCenter
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/cost-centers
 * @desc    Create new cost center
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  [
    body('code').trim().notEmpty().withMessage('Cost center code is required'),
    body('name').trim().notEmpty().withMessage('Cost center name is required'),
    body('departmentId').optional().isUUID().withMessage('Valid department ID is required'),
    body('description').optional().trim()
  ],
  validate,
  auditLog,
  async (req, res, next) => {
    try {
      const { code, name, departmentId, description } = req.body;

      // Check if cost center code already exists
      const existing = await CostCenter.findOne({
        where: { code }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Cost center with this code already exists'
        });
      }

      // If departmentId provided, verify it exists
      if (departmentId) {
        const department = await Department.findByPk(departmentId);
        if (!department) {
          return res.status(404).json({
            success: false,
            message: 'Department not found'
          });
        }
      }

      const costCenter = await CostCenter.create({
        code,
        name,
        departmentId,
        description
      });

      const createdCostCenter = await CostCenter.findByPk(costCenter.id, {
        include: [{
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Cost center created successfully',
        data: createdCostCenter
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/cost-centers/:id
 * @desc    Update cost center
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  [
    param('id').isUUID().withMessage('Valid cost center ID is required'),
    body('code').optional().trim().notEmpty().withMessage('Cost center code cannot be empty'),
    body('name').optional().trim().notEmpty().withMessage('Cost center name cannot be empty'),
    body('departmentId').optional().isUUID().withMessage('Valid department ID is required'),
    body('description').optional().trim(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  auditLog,
  async (req, res, next) => {
    try {
      const costCenter = await CostCenter.findByPk(req.params.id);

      if (!costCenter) {
        return res.status(404).json({
          success: false,
          message: 'Cost center not found'
        });
      }

      const { code, name, departmentId, description, isActive } = req.body;

      // If code is being updated, check for duplicates
      if (code && code !== costCenter.code) {
        const existing = await CostCenter.findOne({
          where: { code, id: { [Op.ne]: costCenter.id } }
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Cost center with this code already exists'
          });
        }
      }

      // If departmentId provided, verify it exists
      if (departmentId) {
        const department = await Department.findByPk(departmentId);
        if (!department) {
          return res.status(404).json({
            success: false,
            message: 'Department not found'
          });
        }
      }

      await costCenter.update({
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(departmentId !== undefined && { departmentId }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive })
      });

      const updatedCostCenter = await CostCenter.findByPk(costCenter.id, {
        include: [{
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        }]
      });

      res.json({
        success: true,
        message: 'Cost center updated successfully',
        data: updatedCostCenter
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/cost-centers/:id
 * @desc    Delete cost center
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  [
    param('id').isUUID().withMessage('Valid cost center ID is required')
  ],
  validate,
  auditLog,
  async (req, res, next) => {
    try {
      const costCenter = await CostCenter.findByPk(req.params.id);

      if (!costCenter) {
        return res.status(404).json({
          success: false,
          message: 'Cost center not found'
        });
      }

      // Check if cost center has employees
      const employeeCount = await Employee.count({
        where: { costCenterId: costCenter.id }
      });

      if (employeeCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete cost center with ${employeeCount} assigned employee(s). Please reassign them first.`
        });
      }

      await costCenter.destroy();

      res.json({
        success: true,
        message: 'Cost center deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
