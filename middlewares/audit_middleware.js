const { AuditLog } = require('../models');

/**
 * Create audit log entry
 */
const createAuditLog = async (userId, action, entityType, entityId, changes = null, meta = null, req = null) => {
  try {
    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      changes,
      meta,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('user-agent')
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

/**
 * Middleware to automatically log actions
 */
const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to capture response
    res.json = function(data) {
      // Create audit log after successful response
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = req.params.id || data?.data?.id || null;
        
        createAuditLog(
          req.user.id,
          action,
          entityType,
          entityId,
          { body: req.body, params: req.params, query: req.query },
          { method: req.method, url: req.originalUrl },
          req
        ).catch(err => console.error('Audit log error:', err));
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = {
  createAuditLog,
  auditLog
};
