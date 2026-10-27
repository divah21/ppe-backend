const { verifyToken, matchesPasswordVersion } = require('../helpers/jwt_helpers');
const { User, Role, Employee, Section, Department, JobTitle, CostCenter } = require('../models');

/**
 * Routes a user is still allowed to reach while their password is flagged as
 * temporary. Anything else is blocked until they set a real password, so the
 * forced change cannot be skipped by navigating straight to another page.
 */
const PASSWORD_CHANGE_ALLOWED_PATHS = [
  '/auth/change-password',
  '/auth/profile'
];

const isPasswordChangeAllowedPath = (req) => {
  const path = `${req.baseUrl || ''}${req.path || ''}`;
  return PASSWORD_CHANGE_ALLOWED_PATHS.some((allowed) => path.endsWith(allowed));
};

/**
 * Middleware to verify JWT token and attach user to request
 * User data now comes from linked Employee record
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization denied.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Get user with linked employee data
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'description', 'permissions']
        },
        {
          model: Employee,
          as: 'employee',
          include: [
            {
              model: Section,
              as: 'section',
              attributes: ['id', 'name', 'departmentId'],
              include: [{
                model: Department,
                as: 'department',
                attributes: ['id', 'name']
              }]
            },
            { model: JobTitle, as: 'jobTitleRef', required: false },
            { model: CostCenter, as: 'costCenter', required: false }
          ]
        }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Issued before the last password change (or a pre-`pv` token): signed out
    const current = matchesPasswordVersion(decoded, user.passwordHash);
    delete user.dataValues.passwordHash;
    if (!current) {
      return res.status(401).json({
        success: false,
        message: 'Session expired, please sign in again'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role.name;

    // Convenience properties from employee (for role-based filtering)
    if (user.employee) {
      req.user.sectionId = user.employee.sectionId;
      req.user.departmentId = user.employee.section?.departmentId;
      req.user.employeeId = user.employeeId;
    }

    // Still on an admin-issued temporary password - lock everything except
    // changing it, so the forced change cannot be bypassed.
    if (user.mustChangePassword && !isPasswordChangeAllowedPath(req)) {
      return res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'You must change your temporary password before continuing.'
      });
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      const user = await User.findByPk(decoded.userId, {
        include: [{ model: Role, as: 'role' }]
      });
      const current = user && matchesPasswordVersion(decoded, user.passwordHash);
      if (user) delete user.dataValues.passwordHash;

      if (user && current && user.isActive) {
        req.user = user;
        req.userId = user.id;
        req.userRole = user.role.name;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};
