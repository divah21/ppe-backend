const express = require('express');
const router = express.Router();
const Setting = require('../../models/setting');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { createAuditLog } = require('../../middlewares/audit_middleware');

// Get all settings (grouped by category)
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { category } = req.query;
    
    const where = {};
    if (category) {
      where.category = category;
    }

    const settings = await Setting.findAll({
      where,
      order: [['category', 'ASC'], ['key', 'ASC']]
    });

    // Group by category and mask secret values
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      
      // Mask secret values
      let value = setting.getParsedValue();
      if (setting.isSecret && value) {
        value = '••••••••';
      }
      
      acc[setting.category][setting.key] = value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
});

// Get settings by category
router.get('/:category', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { category } = req.params;
    
    const settings = await Setting.findAll({
      where: { category },
      order: [['key', 'ASC']]
    });

    const result = {};
    settings.forEach(setting => {
      let value = setting.getParsedValue();
      if (setting.isSecret && value) {
        value = '••••••••';
      }
      result[setting.key] = value;
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
});

// Update settings for a category
router.put('/:category', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { category } = req.params;
    const settings = req.body;
    const userId = req.user.id;

    const validCategories = ['general', 'notifications', 'security', 'database', 'email', 'appearance', 'api', 'users'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const updates = [];
    
    for (const [key, value] of Object.entries(settings)) {
      // Determine value type
      let valueType = 'string';
      let stringValue = String(value);
      
      if (typeof value === 'boolean') {
        valueType = 'boolean';
        stringValue = value.toString();
      } else if (typeof value === 'number') {
        valueType = 'number';
        stringValue = value.toString();
      } else if (typeof value === 'object') {
        valueType = 'json';
        stringValue = JSON.stringify(value);
      }

      // Check if this is a secret field
      const secretFields = ['password', 'secret', 'apiKey', 'smtpPassword'];
      const isSecret = secretFields.some(sf => key.toLowerCase().includes(sf.toLowerCase()));

      // Skip if value is masked (wasn't changed)
      if (stringValue === '••••••••') {
        continue;
      }

      const [setting, created] = await Setting.upsert({
        category,
        key,
        value: stringValue,
        valueType,
        isSecret,
        updatedBy: userId
      }, {
        returning: true
      });

      updates.push({ key, created });
    }

    // Create audit log
    await createAuditLog(
      userId,
      'UPDATE',
      'Settings',
      category,
      { category, updatedKeys: updates.map(u => u.key) },
      { url: req.originalUrl, method: req.method },
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      message: `${category} settings updated successfully`,
      data: { updatedCount: updates.length }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
});

// Initialize default settings
router.post('/initialize', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const defaultSettings = getDefaultSettings();
    let created = 0;

    for (const [category, settings] of Object.entries(defaultSettings)) {
      for (const [key, config] of Object.entries(settings)) {
        const [setting, wasCreated] = await Setting.findOrCreate({
          where: { category, key },
          defaults: {
            value: String(config.value),
            valueType: config.type,
            description: config.description,
            isSecret: config.isSecret || false,
            updatedBy: req.user.id
          }
        });
        if (wasCreated) created++;
      }
    }

    res.json({
      success: true,
      message: `Settings initialized. ${created} new settings created.`
    });
  } catch (error) {
    console.error('Error initializing settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize settings',
      error: error.message
    });
  }
});

// Get default settings structure
function getDefaultSettings() {
  return {
    general: {
      systemName: { value: 'Eureka PPE System', type: 'string', description: 'System display name' },
      organizationName: { value: 'Eureka Mining', type: 'string', description: 'Organization name' },
      timezone: { value: 'Africa/Johannesburg', type: 'string', description: 'System timezone' },
      dateFormat: { value: 'DD/MM/YYYY', type: 'string', description: 'Date display format' },
      currency: { value: 'ZAR', type: 'string', description: 'Default currency' },
      language: { value: 'en', type: 'string', description: 'Default language' },
      fiscalYearStart: { value: '01', type: 'string', description: 'Fiscal year start month' },
      maintenanceMode: { value: false, type: 'boolean', description: 'Maintenance mode status' }
    },
    notifications: {
      emailNotifications: { value: true, type: 'boolean', description: 'Master email toggle' },
      budgetAlerts: { value: true, type: 'boolean', description: 'Budget threshold alerts' },
      budgetThreshold: { value: 80, type: 'number', description: 'Budget alert threshold %' },
      approvalRequests: { value: true, type: 'boolean', description: 'Approval request notifications' },
      lowStockAlerts: { value: true, type: 'boolean', description: 'Low stock notifications' },
      stockThreshold: { value: 10, type: 'number', description: 'Low stock threshold quantity' },
      weeklyReports: { value: true, type: 'boolean', description: 'Weekly report emails' },
      monthlyReports: { value: false, type: 'boolean', description: 'Monthly report emails' },
      ppeExpiryAlerts: { value: true, type: 'boolean', description: 'PPE expiry alerts' },
      expiryDaysBefore: { value: 30, type: 'number', description: 'Days before expiry to alert' },
      newUserAlerts: { value: true, type: 'boolean', description: 'New user registration alerts' },
      systemAlerts: { value: true, type: 'boolean', description: 'Critical system alerts' }
    },
    security: {
      sessionTimeout: { value: 30, type: 'number', description: 'Session timeout in minutes' },
      passwordMinLength: { value: 8, type: 'number', description: 'Minimum password length' },
      requireUppercase: { value: true, type: 'boolean', description: 'Require uppercase in password' },
      requireNumber: { value: true, type: 'boolean', description: 'Require number in password' },
      requireSpecialChar: { value: true, type: 'boolean', description: 'Require special character' },
      twoFactorAuth: { value: false, type: 'boolean', description: 'Enforce 2FA' },
      passwordExpiry: { value: true, type: 'boolean', description: 'Enable password expiry' },
      passwordExpiryDays: { value: 90, type: 'number', description: 'Password expiry days' },
      maxLoginAttempts: { value: 5, type: 'number', description: 'Max login attempts before lockout' },
      lockoutDuration: { value: 15, type: 'number', description: 'Account lockout duration (minutes)' },
      ipWhitelisting: { value: false, type: 'boolean', description: 'Enable IP whitelisting' },
      auditLogging: { value: true, type: 'boolean', description: 'Enable audit logging' }
    },
    database: {
      backupSchedule: { value: 'daily_2am', type: 'string', description: 'Backup schedule' },
      retentionDays: { value: 30, type: 'number', description: 'Backup retention days' },
      compressionEnabled: { value: true, type: 'boolean', description: 'Compress backups' },
      autoVacuum: { value: true, type: 'boolean', description: 'Auto vacuum database' },
      queryLogging: { value: false, type: 'boolean', description: 'Log slow queries' },
      slowQueryThreshold: { value: 1000, type: 'number', description: 'Slow query threshold (ms)' }
    },
    email: {
      smtpServer: { value: '', type: 'string', description: 'SMTP server address' },
      smtpPort: { value: 587, type: 'number', description: 'SMTP port' },
      encryption: { value: 'tls', type: 'string', description: 'Email encryption type' },
      smtpUsername: { value: '', type: 'string', description: 'SMTP username' },
      smtpPassword: { value: '', type: 'string', description: 'SMTP password', isSecret: true },
      fromEmail: { value: 'noreply@eureka.com', type: 'string', description: 'From email address' },
      fromName: { value: 'Eureka PPE System', type: 'string', description: 'From display name' },
      replyTo: { value: 'support@eureka.com', type: 'string', description: 'Reply-to address' },
      maxRetries: { value: 3, type: 'number', description: 'Email retry attempts' },
      rateLimitPerHour: { value: 100, type: 'number', description: 'Emails per hour limit' }
    },
    appearance: {
      theme: { value: 'system', type: 'string', description: 'Default theme' },
      primaryColor: { value: '#3b82f6', type: 'string', description: 'Primary accent color' },
      sidebarPosition: { value: 'left', type: 'string', description: 'Sidebar position' },
      compactMode: { value: false, type: 'boolean', description: 'Compact UI mode' },
      showBreadcrumbs: { value: true, type: 'boolean', description: 'Show breadcrumbs' },
      animationsEnabled: { value: true, type: 'boolean', description: 'Enable animations' },
      tableRowsPerPage: { value: 10, type: 'number', description: 'Default table rows' },
      dateTimeFormat: { value: '24h', type: 'string', description: 'Time format' }
    },
    api: {
      rateLimitEnabled: { value: true, type: 'boolean', description: 'Enable API rate limiting' },
      requestsPerMinute: { value: 60, type: 'number', description: 'API requests per minute' },
      requestsPerHour: { value: 1000, type: 'number', description: 'API requests per hour' }
    },
    users: {
      defaultRole: { value: 'section_rep', type: 'string', description: 'Default user role' },
      requireEmailVerification: { value: true, type: 'boolean', description: 'Require email verification' },
      autoActivateAccounts: { value: false, type: 'boolean', description: 'Auto-activate accounts' },
      welcomeEmailEnabled: { value: true, type: 'boolean', description: 'Send welcome emails' },
      passwordResetExpiry: { value: 24, type: 'number', description: 'Password reset link expiry (hours)' },
      defaultDashboard: { value: 'role_based', type: 'string', description: 'Default dashboard' },
      maxPPERequestItems: { value: 10, type: 'number', description: 'Max PPE request items' },
      requireManagerApproval: { value: true, type: 'boolean', description: 'Require manager approval' },
      allowSelfRegistration: { value: false, type: 'boolean', description: 'Allow self registration' }
    }
  };
}

module.exports = router;
