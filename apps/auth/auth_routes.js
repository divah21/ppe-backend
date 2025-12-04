const express = require('express');
const router = express.Router();
const { User, Role, Department, Section } = require('../../models');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../../helpers/jwt_helpers');
const { authenticate } = require('../../middlewares/auth_middleware');
const { validate } = require('../../middlewares/validation_middleware');
const { createAuditLog } = require('../../middlewares/audit_middleware');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
} = require('../../validations/auth_validation');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public (but typically admin-only in production)
 */
router.post('/register', registerValidation, validate, async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName, roleId, departmentId } = req.body;

    // Check if username exists
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email exists
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
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

    // Create user
    const user = await User.create({
      username,
      email,
      passwordHash: password, // Will be hashed by model hook
      firstName,
      lastName,
      roleId,
      departmentId
    });

    // Get user with role
    const createdUser = await User.findByPk(user.id, {
      include: [
        { model: Role, as: 'role' },
        { model: Department, as: 'department', required: false },
        { model: Section, as: 'section', required: false }
      ],
      attributes: { exclude: ['passwordHash'] }
    });

    // Create audit log
    await createAuditLog(
      user.id,
      'CREATE',
      'User',
      user.id,
      { username, email, roleId },
      { action: 'user_registration' },
      req
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: createdUser
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, validate, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({
      where: { username },
      include: [
        { model: Role, as: 'role' },
        { model: Department, as: 'department', required: false },
        { model: Section, as: 'section', required: false }
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

    // Generate tokens
    const payload = {
      userId: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.role.name
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

    // Get user
    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Generate new access token
    const payload = {
      userId: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.role.name
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
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Role, as: 'role' },
        { model: Department, as: 'department', required: false },
        { model: Section, as: 'section', required: false }
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
 * @route   PUT /api/v1/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', authenticate, updateProfileValidation, validate, async (req, res, next) => {
  try {
    const { firstName, lastName, email, phoneNumber } = req.body;

    // Check if email is taken by another user
    if (email && email !== req.user.email) {
      const existingEmail = await User.findOne({
        where: { email },
        attributes: ['id']
      });

      if (existingEmail && existingEmail.id !== req.user.id) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Update user
    await req.user.update({
      firstName: firstName || req.user.firstName,
      lastName: lastName || req.user.lastName,
      email: email || req.user.email,
      phoneNumber: phoneNumber !== undefined ? phoneNumber : req.user.phoneNumber
    });

    // Get updated user
    const updatedUser = await User.findByPk(req.user.id, {
      include: [
        { model: Role, as: 'role' },
        { model: Department, as: 'department', required: false },
        { model: Section, as: 'section', required: false }
      ],
      attributes: { exclude: ['passwordHash'] }
    });

    // Create audit log
    await createAuditLog(
      req.user.id,
      'UPDATE',
      'User',
      req.user.id,
      { firstName, lastName, email, phoneNumber },
      { action: 'profile_update' },
      req
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
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

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
