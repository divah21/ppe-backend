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
const stockRoutes = require('./apps/stock/stock_routes');
const requestRoutes = require('./apps/requests/request_routes');
const allocationRoutes = require('./apps/allocations/allocation_routes');
const budgetRoutes = require('./apps/budgets/budget_routes');
const valuationRoutes = require('./apps/valuation/valuation_routes');
const sizesRoutes = require('./apps/sizes/size_routes');
const failureRoutes = require('./apps/failures/failure_routes');

// Import error handlers
const { errorHandler, notFound } = require('./middlewares/error_handler');

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

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

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
app.use(`${API_PREFIX}/stock`, stockRoutes);
app.use(`${API_PREFIX}/requests`, requestRoutes);
app.use(`${API_PREFIX}/allocations`, allocationRoutes);
app.use(`${API_PREFIX}/budgets`, budgetRoutes);
app.use(`${API_PREFIX}/valuation`, valuationRoutes);
app.use(`${API_PREFIX}/sizes`, sizesRoutes);
app.use(`${API_PREFIX}/failures`, failureRoutes);

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
