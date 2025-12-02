/**
 * Role-based access control middleware
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role.name;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Check if user has specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const permissions = req.user.role.permissions || [];

    if (!permissions.includes(permission) && req.user.role.name !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Check if user belongs to specific department
 */
const requireDepartment = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Admins can access all departments
  if (req.user.role.name === 'admin') {
    return next();
  }

  // Check if user has department access
  const requestedDeptId = req.params.departmentId || req.query.departmentId || req.body.departmentId;
  
  if (!req.user.departmentId) {
    return res.status(403).json({
      success: false,
      message: 'User not assigned to any department'
    });
  }

  if (requestedDeptId && req.user.departmentId !== requestedDeptId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this department'
    });
  }

  next();
};

/**
 * Middleware for routes that require admin or stores role
 */
const adminOrStoresMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const userRole = req.user.role.name;

  if (userRole !== 'admin' && userRole !== 'stores') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Stores role required'
    });
  }

  next();
};

module.exports = {
  requireRole,
  requirePermission,
  requireDepartment,
  adminOrStoresMiddleware,
  // Alias to support existing route usage patterns like authorize(['admin','sheq'])
  authorize: (roles) => requireRole(...(Array.isArray(roles) ? roles : [roles]))
};
