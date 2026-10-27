require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { sequelize, testConnection } = require('./database/db');

// Import models to ensure associations are set up
require('./models');

// Import routes
const authRoutes = require('./apps/auth/auth_routes');
const userRoutes = require('./apps/users/user_routes');
const departmentRoutes = require('./apps/departments/department_routes');
const sectionRoutes = require('./apps/sections/section_routes');
const jobTitleRoutes = require('./apps/job-titles');
const costCenterRoutes = require('./apps/cost-centers/cost_center_routes');
const employeeRoutes = require('./apps/employees/employee_routes');
const ppeRoutes = require('./apps/ppe/ppe_routes');
const matrixRoutes = require('./apps/matrix/matrix_routes');
const sectionMatrixRoutes = require('./apps/matrix/section_matrix_routes');
const stockRoutes = require('./apps/stock/stock_routes');
const requestRoutes = require('./apps/requests/request_routes');
const allocationRoutes = require('./apps/allocations/allocation_routes');
const budgetRoutes = require('./apps/budgets/budget_routes');
const valuationRoutes = require('./apps/valuation/valuation_routes');
const sizesRoutes = require('./apps/sizes/size_routes');
const failureRoutes = require('./apps/failures/failure_routes');
const auditRoutes = require('./apps/audit-logs/audit_routes');
const settingsRoutes = require('./apps/settings/settings_routes');
const backupRoutes = require('./apps/backup/backup_routes');
const consumableRoutes = require('./apps/consumables/consumable_routes');

// Import backup helper for scheduled backups
const backupHelper = require('./helpers/backup_helper');

// Import error handlers
const { errorHandler, notFound } = require('./middlewares/error_handler');

// Import audit middleware
const { accessLogger, autoAuditLog } = require('./middlewares/audit_middleware');

const app = express();
const PORT = process.env.PORT || 5000;
// Loopback by default: nginx is the only client. Reachable directly, a caller could
// set X-Forwarded-For (trusted below) and dodge the per-IP login limits.
const HOST = process.env.HOST || '127.0.0.1';

// ============================================================
// MIDDLEWARE
// ============================================================

// Security
app.use(helmet());

// Trust the first proxy hop (Nginx) so rate-limit sees real client IP
app.set('trust proxy', 1);

// CORS - env-driven allowlist (never '*' with credentials)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server, curl, same-origin
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(Object.assign(new Error(`CORS blocked: ${origin}`), { status: 403 }));
  },
  credentials: true
}));

// NOTE ON RATE-LIMIT KEYS
// Staff all sit behind a single site NAT/proxy, so they share one public IP.
// Any limiter keyed on IP alone is therefore a *company-wide* bucket: one
// person mistyping their password would lock out every other user. Credential
// checks are keyed per account instead, and the IP-keyed limiters below are
// sized as flood guards for a whole office rather than a single person.
const clientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

// Global API rate limiter (protects against scraping and brute force floods)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, slow down.' }
});
app.use(globalLimiter);

// Per-account limiter for endpoints that verify credentials. Keyed by
// username + IP so failed attempts are charged to the account being targeted
// and can never lock out other users.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    return `login:${clientIp(req)}:${username || 'anonymous'}`;
  },
  message: {
    success: false,
    message: 'Too many failed attempts for this account. Please try again in 15 minutes.'
  }
});

// Flood guard for the auth router as a whole. Only failed responses count
// (skipSuccessfulRequests), so normal traffic from a busy office never trips
// it, but a host hammering many accounts still gets cut off.
const authFloodLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many auth attempts, try again later.' }
});

// Body parsing - increased limit for bulk uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ============================================================
// AUDIT LOGGING MIDDLEWARE (must be after body parsing)
// ============================================================

// Log GET requests to file (for access logs)
app.use(accessLogger());

// Auto-log POST, PUT, PATCH, DELETE to database
app.use(autoAuditLog());

// ============================================================
// ROUTES
// ============================================================

app.get('/', (req, res) => {
  res.json({
    message: 'PPE Management System API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs'
  });
});

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected'
    });
  }
});

// API Routes
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

// Strict per-account limiting only on the endpoints that check credentials.
// Mounted before the auth router, and after express.json() so the username is
// available to the key generator. Deliberately NOT applied to /profile,
// /refresh or /change-password - throttling those breaks signed-in users and,
// for /change-password, would trap anyone forced to replace a temp password.
app.use(`${API_PREFIX}/auth/login`, loginLimiter);
app.use(`${API_PREFIX}/auth/request-password-reset`, loginLimiter);

app.use(`${API_PREFIX}/auth`, authFloodLimiter, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/departments`, departmentRoutes);
app.use(`${API_PREFIX}/sections`, sectionRoutes);
app.use(`${API_PREFIX}/job-titles`, jobTitleRoutes);
app.use(`${API_PREFIX}/cost-centers`, costCenterRoutes);
app.use(`${API_PREFIX}/employees`, employeeRoutes);
app.use(`${API_PREFIX}/ppe`, ppeRoutes);
app.use(`${API_PREFIX}/matrix`, matrixRoutes);
app.use(`${API_PREFIX}/section-matrix`, sectionMatrixRoutes);
app.use(`${API_PREFIX}/stock`, stockRoutes);
app.use(`${API_PREFIX}/requests`, requestRoutes);
app.use(`${API_PREFIX}/allocations`, allocationRoutes);
app.use(`${API_PREFIX}/budgets`, budgetRoutes);
app.use(`${API_PREFIX}/valuation`, valuationRoutes);
app.use(`${API_PREFIX}/sizes`, sizesRoutes);
app.use(`${API_PREFIX}/failures`, failureRoutes);
app.use(`${API_PREFIX}/audit-logs`, auditRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);
app.use(`${API_PREFIX}/backup`, backupRoutes);
app.use(`${API_PREFIX}/consumables`, consumableRoutes);

// v2 API (TypeScript, cookie sessions). Has its own 404 and error envelope.
const { createV2Router, prepareV2, startV2Maintenance } = require('./src/v2');
app.use('/api/v2', createV2Router());

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    await prepareV2();
    startV2Maintenance();

    // Initialize scheduled backup at 6:00 PM
    try {
      const { Setting } = require('./models');
      const [autoBackupSetting, backupTimeSetting, backupPathSetting, retentionSetting] = await Promise.all([
        Setting.findOne({ where: { category: 'database', key: 'autoBackup' } }),
        Setting.findOne({ where: { category: 'database', key: 'backupTime' } }),
        Setting.findOne({ where: { category: 'database', key: 'backupPath' } }),
        Setting.findOne({ where: { category: 'database', key: 'backupRetention' } })
      ]);

      const autoBackup = autoBackupSetting?.value !== 'false';
      const backupTime = backupTimeSetting?.value || '18:00';
      const backupPath = backupPathSetting?.value || './backups';
      const retentionDays = parseInt(retentionSetting?.value || '30');

      if (autoBackup) {
        backupHelper.scheduleBackup(backupTime, { backupPath, retentionDays });
        console.log(`📅 Automatic backup scheduled for ${backupTime} daily`);
      } else {
        console.log('⚠️  Automatic backup is disabled');
      }
    } catch (backupError) {
      console.warn('⚠️  Could not initialize backup scheduler:', backupError.message);
    }

    // Initialize cron jobs for scheduled notifications
    try {
      const { initializeCronJobs } = require('./scripts/cron_scheduler');
      initializeCronJobs();
    } catch (cronError) {
      console.warn('⚠️  Could not initialize cron scheduler:', cronError.message);
    }
    
    // Start HTTP server (Nginx handles SSL termination)
    const server = app.listen(PORT, HOST, () => {
      console.log('\n🚀 ========================================');
      console.log(`   PPE Management System API (HTTP)`);
      console.log(`   Nginx handles SSL termination`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Server listening on ${HOST}:${PORT}`);
      console.log(`   API Base: http://${HOST}:${PORT}${API_PREFIX}`);
      console.log('========================================\n');
    });
    // Outlive nginx's upstream keepalive (60s), or nginx reuses a socket Node already closed and returns 502
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    registerShutdown(server);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// PM2 on Windows cannot deliver signals; with shutdown_with_message it sends 'shutdown'
// instead. Finish in-flight requests and stop the schedulers before exiting.
const registerShutdown = (server) => {
  let stopping = false;
  const shutdown = (reason) => {
    if (stopping) return;
    stopping = true;
    console.log(`Shutting down (${reason})...`);
    setTimeout(() => process.exit(1), 8000).unref();
    try {
      backupHelper.stopScheduledBackup();
      require('node-cron').getTasks().forEach((task) => task.stop());
    } catch (error) {
      console.error('Could not stop schedulers:', error.message);
    }
    server.close(async () => {
      await sequelize.close().catch(() => undefined);
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('message', (msg) => msg === 'shutdown' && shutdown('message'));
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// Tests import the app without opening a port or starting schedulers
if (process.env.NODE_ENV !== 'test') startServer();

module.exports = app;
