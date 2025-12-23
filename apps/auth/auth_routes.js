const express = require('express');
const router = express.Router();
const { User, Role, Employee, Section, Department, JobTitle, CostCenter } = require('../../models');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../../helpers/jwt_helpers');
const { authenticate } = require('../../middlewares/auth_middleware');
const { validate } = require('../../middlewares/validation_middleware');
const { createAuditLog } = require('../../middlewares/audit_middleware');
const {
  loginValidation,
  changePasswordValidation
} = require('../../validations/auth_validation');
const { sendPasswordResetRequestToAdmin, sendPasswordResetEmail } = require('../../helpers/email_helper');

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
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, validate, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find user with employee data
    const user = await User.findOne({
      where: { username },
      include: [
        { model: Role, as: 'role' },
        employeeInclude
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Build payload with employee data for convenience
    const payload = {
      userId: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.role.name,
      employeeId: user.employeeId,
      sectionId: user.employee?.sectionId,
      departmentId: user.employee?.section?.departmentId
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.passwordHash;

    // Create audit log
    await createAuditLog(
      user.id,
      'LOGIN',
      'User',
      user.id,
      null,
      { ip: req.ip, userAgent: req.get('user-agent') },
      req
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, true);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Get user with employee data
    const user = await User.findByPk(decoded.userId, {
      include: [
        { model: Role, as: 'role' },
        employeeInclude
      ]
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Generate new access token with employee data
    const payload = {
      userId: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.role.name,
      employeeId: user.employeeId,
      sectionId: user.employee?.sectionId,
      departmentId: user.employee?.section?.departmentId
    };

    const accessToken = generateAccessToken(payload);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile with linked employee data
 * @access  Private
 */
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Role, as: 'role' },
        employeeInclude
      ],
      attributes: { exclude: ['passwordHash'] }
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticate, changePasswordValidation, validate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const user = await User.findByPk(req.user.id);
    const isValidPassword = await user.verifyPassword(currentPassword);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await user.update({ passwordHash: newPassword }); // Will be hashed by hook

    // Create audit log
    await createAuditLog(
      req.user.id,
      'UPDATE',
      'User',
      req.user.id,
      null,
      { action: 'password_change' },
      req
    );

    // Clear mustChangePassword flag after successful password change
    if (req.user.mustChangePassword) {
      await user.update({ mustChangePassword: false });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/request-password-reset
 * @desc    User requests password reset (notifies admin)
 * @access  Public
 */
router.post('/request-password-reset', async (req, res, next) => {
  try {
    const { username, reason } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Find the user
    const user = await User.findOne({
      where: { username },
      include: [
        { model: Employee, as: 'employee' },
        { model: Role, as: 'role' }
      ]
    });

    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account with this username exists, an admin has been notified of your request.'
      });
    }

    // Find all admin users to notify
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (adminRole) {
      const adminUsers = await User.findAll({
        where: { roleId: adminRole.id, isActive: true },
        include: [{ model: Employee, as: 'employee' }]
      });

      const userName = user.employee?.fullName || user.username;
      const userEmail = user.employee?.email || 'Not specified';

      for (const admin of adminUsers) {
        const adminEmail = admin.employee?.email || admin.email;
        if (adminEmail) {
          await sendPasswordResetRequestToAdmin({
            adminName: admin.employee?.fullName || admin.username,
            adminEmail,
            requestingUserName: userName,
            requestingUsername: user.username,
            requestingUserEmail: userEmail,
            reason: reason || 'User did not provide a reason'
          });
        }
      }
    }

    // Create audit log
    await createAuditLog(
      null,
      'REQUEST',
      'PasswordReset',
      user.id,
      null,
      { username, reason: reason || 'No reason provided' },
      req
    );

    res.json({
      success: true,
      message: 'If an account with this username exists, an admin has been notified of your request.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/admin-reset-password/:userId
 * @desc    Admin resets a user's password
 * @access  Private (Admin only)
 */
router.post('/admin-reset-password/:userId', authenticate, async (req, res, next) => {
  try {
    // Check if current user is admin
    if (req.user.role?.name !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can reset user passwords'
      });
    }

    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    // Find the user to reset
    const user = await User.findByPk(userId, {
      include: [{ model: Employee, as: 'employee' }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password and set mustChangePassword flag
    await user.update({ 
      passwordHash: newPassword, // Will be hashed by hook
      mustChangePassword: true
    });

    // Send email notification to user
    const userEmail = user.employee?.email || user.email;
    if (userEmail) {
      await sendPasswordResetEmail(
        {
          firstName: user.employee?.firstName || user.username,
          lastName: user.employee?.lastName || '',
          email: userEmail,
          username: user.username
        },
        newPassword
      );
    }

    // Create audit log
    await createAuditLog(
      req.user.id,
      'RESET',
      'User',
      user.id,
      null,
      { action: 'admin_password_reset', resetByUserId: req.user.id },
      req
    );

    res.json({
      success: true,
      message: `Password reset for ${user.username}. User will be required to change password on next login.`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
