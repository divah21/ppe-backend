const express = require('express');
const router = express.Router();
const { User, Role, Employee, Section, Department, JobTitle, CostCenter } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { Op } = require('sequelize');
const { sendUserCredentialsEmail, sendPasswordResetEmail, sendPasswordResetRequestToAdmin } = require('../../helpers/email_helper');

// Helper to include employee with full details
const employeeInclude = {
  model: Employee,
  as: 'employee',
  include: [
    {
      model: Section,
      as: 'section',
      include: [{ model: Department, as: 'department' }]
    },
    { model: JobTitle, as: 'jobTitleRef', required: false },
    { model: CostCenter, as: 'costCenter', required: false }
  ]
};

/**
 * @route   GET /api/v1/users/roles
 * @desc    Get all roles
 * @access  Private
 */
router.get('/roles', authenticate, async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with their linked employee data
 * @access  Private (Admin only)
 */
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { roleId, departmentId, sectionId, isActive, search, page = 1, limit = 50 } = req.query;

    const where = {};
    
    if (roleId) where.roleId = roleId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    // Build employee include with filters
    const employeeIncludeWithFilters = {
      model: Employee,
      as: 'employee',
      required: false,
      include: [
        {
          model: Section,
          as: 'section',
          required: !!departmentId,
          where: departmentId ? { departmentId } : undefined,
          include: [{ model: Department, as: 'department' }]
        },
        { model: JobTitle, as: 'jobTitleRef', required: false },
        { model: CostCenter, as: 'costCenter', required: false }
      ]
    };

    // Filter by section
    if (sectionId) {
      employeeIncludeWithFilters.where = { sectionId };
      employeeIncludeWithFilters.required = true;
    }

    // Search across employee fields
    if (search) {
      employeeIncludeWithFilters.where = {
        ...employeeIncludeWithFilters.where,
        [Op.or]: [
          { worksNumber: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ]
      };
      employeeIncludeWithFilters.required = true;
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where,
      include: [
        { model: Role, as: 'role' },
        employeeIncludeWithFilters
      ],
      attributes: { exclude: ['passwordHash'] },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true
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
 * @route   GET /api/v1/users/promotable-employees
 * @desc    Get employees that can be promoted to users (not yet linked to a user account)
 * @access  Private (Admin only)
 */
router.get('/promotable-employees', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { search, sectionId, departmentId, page = 1, limit = 50 } = req.query;

    const where = { isActive: true };
    
    if (search) {
      where[Op.or] = [
        { worksNumber: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (sectionId) where.sectionId = sectionId;

    const include = [
      {
        model: Section,
        as: 'section',
        include: [{ model: Department, as: 'department' }]
      },
      { model: JobTitle, as: 'jobTitleRef', required: false }
    ];

    // Filter by department
    if (departmentId) {
      include[0].where = { departmentId };
    }

    const offset = (page - 1) * parseInt(limit);

    // Get IDs of employees who already have user accounts
    const employeesWithUsers = await User.findAll({
      where: { employeeId: { [Op.ne]: null } },
      attributes: ['employeeId']
    });
    const employeeIdsWithUsers = employeesWithUsers.map(u => u.employeeId);

    // Exclude employees who already have user accounts
    if (employeeIdsWithUsers.length > 0) {
      where.id = { [Op.notIn]: employeeIdsWithUsers };
    }

    const { count, rows: employees } = await Employee.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });

    res.json({
      success: true,
      data: employees,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/users/promote-employee
 * @desc    Promote an employee to become a system user
 * @access  Private (Admin only)
 */
router.post(
  '/promote-employee',
  authenticate,
  requireRole('admin'),
  [
    body('employeeId').isUUID().withMessage('Invalid employee ID'),
    body('username').trim().notEmpty().withMessage('Username is required')
      .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').trim().notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('roleId').isUUID().withMessage('Invalid role ID'),
    body('departmentId').optional({ values: 'falsy' }).isUUID().withMessage('Invalid department ID'),
    body('sectionId').optional({ values: 'falsy' }).isUUID().withMessage('Invalid section ID')
  ],
  validate,
  auditLog('CREATE', 'User'),
  async (req, res, next) => {
    try {
      const { employeeId, username, password, roleId, departmentId, sectionId } = req.body;

      // Verify employee exists
      const employee = await Employee.findByPk(employeeId, {
        include: [
          {
            model: Section,
            as: 'section',
            include: [{ model: Department, as: 'department' }]
          },
          { model: JobTitle, as: 'jobTitleRef', required: false }
        ]
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Check if employee already has a user account
      const existingUserAccount = await User.findOne({ where: { employeeId } });
      if (existingUserAccount) {
        return res.status(409).json({
          success: false,
          message: 'This employee already has a user account'
        });
      }

      // Check if username already exists
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: 'Username already exists'
        });
      }

      // Verify role exists
      const role = await Role.findByPk(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Validate department/section based on role
      if (role.name === 'hod' || role.name === 'department-rep') {
        if (!departmentId) {
          return res.status(400).json({
            success: false,
            message: `Department is required for ${role.description || role.name} role`
          });
        }
        // Verify department exists
        const department = await Department.findByPk(departmentId);
        if (!department) {
          return res.status(404).json({
            success: false,
            message: 'Department not found'
          });
        }
      }

      if (role.name === 'section-rep') {
        if (!sectionId) {
          return res.status(400).json({
            success: false,
            message: 'Section is required for Section Representative role'
          });
        }
        // Verify section exists
        const section = await Section.findByPk(sectionId, {
          include: [{ model: Department, as: 'department' }]
        });
        if (!section) {
          return res.status(404).json({
            success: false,
            message: 'Section not found'
          });
        }
      }

      // Create user linked to employee
      const user = await User.create({
        username,
        passwordHash: password, // Will be hashed by the beforeCreate hook
        employeeId,
        roleId,
        departmentId: (role.name === 'hod' || role.name === 'department-rep') ? departmentId : null,
        sectionId: role.name === 'section-rep' ? sectionId : null,
        isActive: true,
        mustChangePassword: true // Force password change on first login
      });

      // Fetch complete user data with associations
      const createdUser = await User.findByPk(user.id, {
        include: [
          { model: Role, as: 'role' },
          employeeInclude,
          { model: Department, as: 'managedDepartment', required: false },
          { model: Section, as: 'managedSection', required: false, include: [{ model: Department, as: 'department' }] }
        ],
        attributes: { exclude: ['passwordHash'] }
      });

      // Send credentials email if employee has email
      if (employee.email) {
        try {
          await sendUserCredentialsEmail(
            {
              firstName: employee.firstName,
              lastName: employee.lastName,
              email: employee.email,
              username: user.username
            },
            password,
            role.description || role.name
          );
        } catch (emailError) {
          console.error('Failed to send credentials email:', emailError.message);
          // Don't fail the request if email fails
        }
      }

      res.status(201).json({
        success: true,
        message: `Employee ${employee.firstName} ${employee.lastName} has been promoted to ${role.description || role.name}`,
        data: createdUser
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/users
 * @desc    Create standalone user (for admin users not linked to employees)
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  [
    body('username').trim().notEmpty().withMessage('Username is required')
      .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').trim().notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('roleId').isUUID().withMessage('Invalid role ID'),
    body('employeeId').optional().isUUID().withMessage('Invalid employee ID')
  ],
  validate,
  auditLog('CREATE', 'User'),
  async (req, res, next) => {
    try {
      const { username, password, roleId, employeeId } = req.body;

      // Check if username already exists
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: 'Username already exists'
        });
      }

      // If employeeId provided, check it's not already linked
      if (employeeId) {
        const existingLink = await User.findOne({ where: { employeeId } });
        if (existingLink) {
          return res.status(409).json({
            success: false,
            message: 'This employee already has a user account'
          });
        }

        const employee = await Employee.findByPk(employeeId);
        if (!employee) {
          return res.status(404).json({
            success: false,
            message: 'Employee not found'
          });
        }
      }

      // Verify role exists
      const role = await Role.findByPk(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Create user
      const user = await User.create({
        username,
        passwordHash: password,
        roleId,
        employeeId: employeeId || null,
        isActive: true
      });

      // Fetch complete user data with associations
      const createdUser = await User.findByPk(user.id, {
        include: [
          { model: Role, as: 'role' },
          employeeInclude
        ],
        attributes: { exclude: ['passwordHash'] }
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: createdUser
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID with linked employee data
 * @access  Private (Admin only)
 */
router.get('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Role, as: 'role' },
        employeeInclude
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
 * @desc    Update user (role, username, active status)
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('roleId').optional().isUUID().withMessage('Invalid role ID'),
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

      // Check if username is being changed and already exists
      if (req.body.username && req.body.username !== user.username) {
        const existing = await User.findOne({ where: { username: req.body.username } });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Username already exists'
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

      const updateData = {};
      if (req.body.username) updateData.username = req.body.username;
      if (req.body.roleId) updateData.roleId = req.body.roleId;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

      await user.update(updateData);

      const updatedUser = await User.findByPk(user.id, {
        include: [
          { model: Role, as: 'role' },
          employeeInclude
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
 * @desc    Delete/demote user (removes system access but keeps employee)
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  auditLog('DELETE', 'User'),
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id, {
        include: [employeeInclude]
      });

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

      const employeeName = user.employee 
        ? `${user.employee.firstName} ${user.employee.lastName}` 
        : user.username;

      // Soft delete by deactivating (keeps audit trail)
      await user.update({ isActive: false });

      res.json({
        success: true,
        message: `User account for ${employeeName} has been deactivated. Employee record remains intact.`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/users/:id/permanent
 * @desc    Permanently delete user (demote employee back to regular employee)
 * @access  Private (Admin only)
 */
router.delete(
  '/:id/permanent',
  authenticate,
  requireRole('admin'),
  auditLog('DELETE', 'User'),
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id, {
        include: [employeeInclude]
      });

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

      const employeeName = user.employee 
        ? `${user.employee.firstName} ${user.employee.lastName}` 
        : user.username;

      // Hard delete - removes user account entirely
      await user.destroy();

      res.json({
        success: true,
        message: `User account for ${employeeName} has been permanently removed. Employee can be promoted again.`
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
          employeeInclude
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

/**
 * @route   PUT /api/v1/users/:id/change-role
 * @desc    Change user role
 * @access  Private (Admin only)
 */
router.put(
  '/:id/change-role',
  authenticate,
  requireRole('admin'),
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('roleId').isUUID().withMessage('Invalid role ID')
  ],
  validate,
  auditLog('UPDATE', 'User'),
  async (req, res, next) => {
    try {
      const { roleId } = req.body;

      const user = await User.findByPk(req.params.id, {
        include: [{ model: Role, as: 'role' }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const newRole = await Role.findByPk(roleId);
      if (!newRole) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      const oldRoleName = user.role?.name || 'none';
      await user.update({ roleId });

      const updatedUser = await User.findByPk(user.id, {
        include: [
          { model: Role, as: 'role' },
          employeeInclude
        ],
        attributes: { exclude: ['passwordHash'] }
      });

      res.json({
        success: true,
        message: `User role changed from ${oldRoleName} to ${newRole.name}`,
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
