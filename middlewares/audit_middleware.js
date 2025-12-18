const { AuditLog } = require('../models');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const LOGS_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const ACCESS_LOG_FILE = path.join(LOGS_DIR, 'access.log');

/**
 * Create audit log entry in database (for POST, PUT, DELETE)
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
 * Log GET request to file (for access logging)
 */
const logAccessToFile = (req, responseTime = 0) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id || null,
      username: req.user?.username || 'anonymous',
      role: req.userRole || null,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      responseTime: `${responseTime}ms`,
      query: Object.keys(req.query).length > 0 ? req.query : undefined
    };

    // Append to file
    fs.appendFileSync(ACCESS_LOG_FILE, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to write access log:', error);
  }
};

/**
 * Middleware to automatically log actions
 * For POST, PUT, DELETE - logs to database
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

/**
 * Global middleware to log all GET requests to file
 * Should be used at the app level
 */
const accessLogger = () => {
  return (req, res, next) => {
    // Only log GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip health checks and static files
    if (req.path === '/health' || req.path === '/' || req.path.startsWith('/static')) {
      return next();
    }

    const startTime = Date.now();

    // Log after response is sent
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      // Only log successful responses from authenticated users
      if (res.statusCode >= 200 && res.statusCode < 400 && req.user) {
        logAccessToFile(req, responseTime);
      }
    });

    next();
  };
};

/**
 * Middleware to automatically log all modifying operations
 * Detects POST, PUT, PATCH, DELETE and logs to database
 */
const autoAuditLog = () => {
  return async (req, res, next) => {
    // Only log modifying requests
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Skip auth routes for login/logout (they have their own logging)
    if (req.path.includes('/auth/login') || req.path.includes('/auth/logout')) {
      return next();
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to capture response
    res.json = function(data) {
      // Create audit log after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id || data?.data?.id || null;
        
        // Determine action from method
        let action = 'UNKNOWN';
        switch (req.method) {
          case 'POST': action = 'CREATE'; break;
          case 'PUT': action = 'UPDATE'; break;
          case 'PATCH': action = 'UPDATE'; break;
          case 'DELETE': action = 'DELETE'; break;
        }

        // Extract entity type from URL
        const pathParts = req.originalUrl.split('/').filter(p => p && !p.includes('?'));
        const apiIndex = pathParts.findIndex(p => p === 'api');
        const entityType = apiIndex >= 0 && pathParts[apiIndex + 2] 
          ? pathParts[apiIndex + 2].toUpperCase().replace(/-/g, '_')
          : 'UNKNOWN';

        if (req.user) {
          createAuditLog(
            req.user.id,
            action,
            entityType,
            entityId,
            { 
              body: sanitizeBody(req.body), 
              params: req.params, 
              query: req.query 
            },
            { 
              method: req.method, 
              url: req.originalUrl,
              statusCode: res.statusCode
            },
            req
          ).catch(err => console.error('Auto audit log error:', err));
        }
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Sanitize request body to remove sensitive data
 */
const sanitizeBody = (body) => {
  if (!body) return null;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

module.exports = {
  createAuditLog,
  auditLog,
  accessLogger,
  autoAuditLog,
  logAccessToFile
};
