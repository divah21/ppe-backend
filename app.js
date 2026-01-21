require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
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

// ============================================================
// MIDDLEWARE
// ============================================================

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

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
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// API Routes
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API_PREFIX}/auth`, authRoutes);
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
    
    // Start server
    app.listen(PORT, () => {
      console.log('\n🚀 ========================================');
      console.log(`   PPE Management System API`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Server running on port ${PORT}`);
      console.log(`   API Base: http://localhost:${PORT}${API_PREFIX}`);
      console.log('========================================\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
