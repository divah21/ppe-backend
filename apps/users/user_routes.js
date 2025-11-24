const express = require('express');
const router = express.Router();
const { User, Role, Department } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { Op } = require('sequelize');

/**
 * @route   GET /api/v1/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { roleId, departmentId, isActive, search, page = 1, limit = 50 } = req.query;

    const where = {};
    
    if (roleId) where.roleId = roleId;
    if (departmentId) where.departmentId = departmentId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where,
      include: [
        { model: Role, as: 'role' },
        { model: Department, as: 'department', required: false }
      ],
      attributes: { exclude: ['passwordHash'] },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: users,
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
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Role, as: 'role' },
        { model: Department, as: 'department', required: false }
      ],
      attributes: { exclude: ['passwordHash'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().trim().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('roleId').optional().isUUID().withMessage('Invalid role ID'),
    body('departmentId').optional().isUUID().withMessage('Invalid department ID'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ],
  validate,
  auditLog('UPDATE', 'User'),
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if email is being changed and already exists
      if (req.body.email && req.body.email !== user.email) {
        const existing = await User.findOne({ where: { email: req.body.email } });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }

      // Verify role exists if being changed
      if (req.body.roleId) {
        const role = await Role.findByPk(req.body.roleId);
        if (!role) {
          return res.status(404).json({
            success: false,
            message: 'Role not found'
          });
        }
      }

      // Verify department exists if being changed
      if (req.body.departmentId) {
        const department = await Department.findByPk(req.body.departmentId);
        if (!department) {
          return res.status(404).json({
            success: false,
            message: 'Department not found'
          });
        }
      }

      await user.update(req.body);

      const updatedUser = await User.findByPk(user.id, {
        include: [
          { model: Role, as: 'role' },
          { model: Department, as: 'department', required: false }
        ],
        attributes: { exclude: ['passwordHash'] }
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  auditLog('DELETE', 'User'),
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent deleting self
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      // Soft delete by deactivating
      await user.update({ isActive: false });

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/users/:id/activate
 * @desc    Activate user
 * @access  Private (Admin only)
 */
router.put(
  '/:id/activate',
  authenticate,
  requireRole('admin'),
  auditLog('UPDATE', 'User'),
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.update({ isActive: true });

      const updatedUser = await User.findByPk(user.id, {
        include: [
          { model: Role, as: 'role' },
          { model: Department, as: 'department', required: false }
        ],
        attributes: { exclude: ['passwordHash'] }
      });

      res.json({
        success: true,
        message: 'User activated successfully',
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/users/:id/reset-password
 * @desc    Reset user password (Admin)
 * @access  Private (Admin only)
 */
router.put(
  '/:id/reset-password',
  authenticate,
  requireRole('admin'),
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  auditLog('UPDATE', 'User'),
  async (req, res, next) => {
    try {
      const { newPassword } = req.body;

      const user = await User.findByPk(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.update({ passwordHash: newPassword }); // Will be hashed by hook

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
