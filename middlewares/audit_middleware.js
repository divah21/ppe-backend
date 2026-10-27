const { AuditLog } = require('../models');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const LOGS_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const ACCESS_LOG_FILE = path.join(LOGS_DIR, 'access.log');
const ACCESS_LOG_MAX_BYTES = 50 * 1024 * 1024;
const ACCESS_LOG_ARCHIVES = 10;
const ROTATE_CHECK_EVERY = 500;

/**
 * Size-based rollover. The live file keeps its fixed name because the v1 access-log viewer
 * reads it; archives use the same access_<ms>.log names as its manual "clear" action.
 */
const rotateAccessLog = async ({
  file = ACCESS_LOG_FILE,
  dir = LOGS_DIR,
  maxBytes = ACCESS_LOG_MAX_BYTES,
  keep = ACCESS_LOG_ARCHIVES
} = {}) => {
  const size = await fs.promises.stat(file).then((s) => s.size, () => 0);
  if (size < maxBytes) return false;
  await fs.promises.rename(file, path.join(dir, `access_${Date.now()}.log`));
  const archives = (await fs.promises.readdir(dir)).filter((f) => /^access_\d+\.log$/.test(f)).sort();
  for (const old of archives.slice(0, -keep)) {
    await fs.promises.unlink(path.join(dir, old)).catch(() => undefined);
  }
  return true;
};

// Appends run in order off the event loop; a sync write per GET stalled every request
let accessQueue = Promise.resolve();
let writesSinceCheck = 0;
const appendAccessLine = (line) => {
  accessQueue = accessQueue
    .then(async () => {
      await fs.promises.appendFile(ACCESS_LOG_FILE, line);
      if (++writesSinceCheck >= ROTATE_CHECK_EVERY) {
        writesSinceCheck = 0;
        await rotateAccessLog();
      }
    })
    .catch((error) => console.error('Failed to write access log:', error.message));
  return accessQueue;
};

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

    appendAccessLine(JSON.stringify(logEntry) + '\n');
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

  const clean = redact(body);
  // Bulk imports post thousands of rows; keep the audit row small and point at the size instead
  const size = JSON.stringify(clean).length;
  return size > MAX_AUDIT_BODY ? { truncated: true, bytes: size, keys: Object.keys(clean) } : clean;
};

const MAX_AUDIT_BODY = 20000;

// Any key that looks like a credential, at any depth (currentPassword, newPassword, refreshToken...)
const SENSITIVE_KEY = /pass(word)?|token|secret|api[-_]?key|otp/i;

const redact = (value) => {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => [key, SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(v)])
  );
};

module.exports = {
  createAuditLog,
  auditLog,
  accessLogger,
  autoAuditLog,
  logAccessToFile,
  rotateAccessLog,
  flushAccessLog: () => accessQueue
};
