/**
 * Script to seed default settings in the database
 */
const { Setting } = require('../models');

const DEFAULT_SETTINGS = [
  // General settings
  { category: 'general', key: 'systemName', value: 'PPE Management System', valueType: 'string', description: 'System display name' },
  { category: 'general', key: 'organizationName', value: 'Your Organization', valueType: 'string', description: 'Organization name' },
  { category: 'general', key: 'timezone', value: 'Africa/Johannesburg', valueType: 'string', description: 'System timezone' },
  { category: 'general', key: 'dateFormat', value: 'DD/MM/YYYY', valueType: 'string', description: 'Date display format' },
  { category: 'general', key: 'currency', value: 'USD', valueType: 'string', description: 'Default currency' },
  { category: 'general', key: 'language', value: 'en', valueType: 'string', description: 'System language' },
  { category: 'general', key: 'fiscalYearStart', value: 'January', valueType: 'string', description: 'Fiscal year start month' },
  { category: 'general', key: 'maintenanceMode', value: 'false', valueType: 'boolean', description: 'Enable maintenance mode' },

  // Notification settings
  { category: 'notifications', key: 'emailNotifications', value: 'true', valueType: 'boolean', description: 'Enable email notifications' },
  { category: 'notifications', key: 'budgetAlerts', value: 'true', valueType: 'boolean', description: 'Enable budget alerts' },
  { category: 'notifications', key: 'budgetThreshold', value: '80', valueType: 'number', description: 'Budget alert threshold percentage' },
  { category: 'notifications', key: 'approvalRequests', value: 'true', valueType: 'boolean', description: 'Notify on approval requests' },
  { category: 'notifications', key: 'lowStockAlerts', value: 'true', valueType: 'boolean', description: 'Enable low stock alerts' },
  { category: 'notifications', key: 'stockThreshold', value: '10', valueType: 'number', description: 'Low stock threshold quantity' },
  { category: 'notifications', key: 'weeklyReports', value: 'false', valueType: 'boolean', description: 'Send weekly reports' },
  { category: 'notifications', key: 'monthlyReports', value: 'true', valueType: 'boolean', description: 'Send monthly reports' },
  { category: 'notifications', key: 'ppeExpiryAlerts', value: 'true', valueType: 'boolean', description: 'Alert before PPE expires' },
  { category: 'notifications', key: 'expiryDaysBefore', value: '30', valueType: 'number', description: 'Days before expiry to alert' },
  { category: 'notifications', key: 'newUserAlerts', value: 'true', valueType: 'boolean', description: 'Alert on new user registration' },
  { category: 'notifications', key: 'systemAlerts', value: 'true', valueType: 'boolean', description: 'Enable system alerts' },

  // Security settings
  { category: 'security', key: 'sessionTimeout', value: '30', valueType: 'number', description: 'Session timeout in minutes' },
  { category: 'security', key: 'maxLoginAttempts', value: '5', valueType: 'number', description: 'Max failed login attempts' },
  { category: 'security', key: 'lockoutDuration', value: '15', valueType: 'number', description: 'Account lockout duration in minutes' },
  { category: 'security', key: 'requireMfa', value: 'false', valueType: 'boolean', description: 'Require multi-factor authentication' },
  { category: 'security', key: 'passwordMinLength', value: '8', valueType: 'number', description: 'Minimum password length' },
  { category: 'security', key: 'requireUppercase', value: 'true', valueType: 'boolean', description: 'Require uppercase in password' },
  { category: 'security', key: 'requireNumbers', value: 'true', valueType: 'boolean', description: 'Require numbers in password' },
  { category: 'security', key: 'requireSpecialChars', value: 'true', valueType: 'boolean', description: 'Require special chars in password' },
  { category: 'security', key: 'passwordExpiry', value: '90', valueType: 'number', description: 'Password expiry in days' },
  { category: 'security', key: 'ipWhitelisting', value: 'false', valueType: 'boolean', description: 'Enable IP whitelisting' },
  { category: 'security', key: 'auditLogging', value: 'true', valueType: 'boolean', description: 'Enable audit logging' },

  // Database settings
  { category: 'database', key: 'autoBackup', value: 'true', valueType: 'boolean', description: 'Enable automatic backups' },
  { category: 'database', key: 'backupTime', value: '18:00', valueType: 'string', description: 'Daily backup time (24h format)' },
  { category: 'database', key: 'backupRetention', value: '30', valueType: 'number', description: 'Backup retention in days' },
  { category: 'database', key: 'backupPath', value: './backups', valueType: 'string', description: 'Backup storage path' },

  // Email settings
  { category: 'email', key: 'smtpServer', value: '', valueType: 'string', description: 'SMTP server address' },
  { category: 'email', key: 'smtpPort', value: '587', valueType: 'number', description: 'SMTP port' },
  { category: 'email', key: 'encryption', value: 'tls', valueType: 'string', description: 'SMTP encryption' },
  { category: 'email', key: 'smtpUsername', value: '', valueType: 'string', description: 'SMTP username', isSecret: true },
  { category: 'email', key: 'smtpPassword', value: '', valueType: 'string', description: 'SMTP password', isSecret: true },
  { category: 'email', key: 'fromEmail', value: 'noreply@company.com', valueType: 'string', description: 'From email address' },
  { category: 'email', key: 'fromName', value: 'PPE Management System', valueType: 'string', description: 'From name' },
  { category: 'email', key: 'replyTo', value: 'support@company.com', valueType: 'string', description: 'Reply-to address' },
  { category: 'email', key: 'maxRetries', value: '3', valueType: 'number', description: 'Max email retry attempts' },
  { category: 'email', key: 'rateLimitPerHour', value: '100', valueType: 'number', description: 'Max emails per hour' },

  // Appearance settings
  { category: 'appearance', key: 'theme', value: 'system', valueType: 'string', description: 'Color theme' },
  { category: 'appearance', key: 'primaryColor', value: '#0066CC', valueType: 'string', description: 'Primary brand color' },
  { category: 'appearance', key: 'sidebarPosition', value: 'left', valueType: 'string', description: 'Sidebar position' },
  { category: 'appearance', key: 'compactMode', value: 'false', valueType: 'boolean', description: 'Enable compact mode' },
  { category: 'appearance', key: 'showBreadcrumbs', value: 'true', valueType: 'boolean', description: 'Show breadcrumbs' },
  { category: 'appearance', key: 'animationsEnabled', value: 'true', valueType: 'boolean', description: 'Enable animations' },
  { category: 'appearance', key: 'tableRowsPerPage', value: '10', valueType: 'number', description: 'Default table rows per page' },
  { category: 'appearance', key: 'dateTimeFormat', value: '12h', valueType: 'string', description: 'Time format (12h/24h)' },

  // API settings
  { category: 'api', key: 'rateLimitEnabled', value: 'true', valueType: 'boolean', description: 'Enable API rate limiting' },
  { category: 'api', key: 'requestsPerMinute', value: '60', valueType: 'number', description: 'Max requests per minute' },
  { category: 'api', key: 'requestsPerHour', value: '1000', valueType: 'number', description: 'Max requests per hour' },

  // User defaults
  { category: 'users', key: 'defaultRole', value: 'section_rep', valueType: 'string', description: 'Default role for new users' },
  { category: 'users', key: 'requireEmailVerification', value: 'true', valueType: 'boolean', description: 'Require email verification' },
  { category: 'users', key: 'autoActivateAccounts', value: 'false', valueType: 'boolean', description: 'Auto-activate accounts' },
  { category: 'users', key: 'welcomeEmailEnabled', value: 'true', valueType: 'boolean', description: 'Send welcome email' },
  { category: 'users', key: 'passwordResetExpiry', value: '24', valueType: 'number', description: 'Password reset link expiry in hours' },
  { category: 'users', key: 'defaultDashboard', value: 'role_based', valueType: 'string', description: 'Default dashboard type' },
  { category: 'users', key: 'maxPPERequestItems', value: '10', valueType: 'number', description: 'Max items per PPE request' },
  { category: 'users', key: 'requireManagerApproval', value: 'true', valueType: 'boolean', description: 'Require manager approval for requests' },
  { category: 'users', key: 'allowSelfRegistration', value: 'false', valueType: 'boolean', description: 'Allow self registration' },
];

async function seedSettings() {
  console.log('🌱 Seeding default settings...\n');
  
  let created = 0;
  let skipped = 0;

  for (const setting of DEFAULT_SETTINGS) {
    try {
      const [record, wasCreated] = await Setting.findOrCreate({
        where: { 
          category: setting.category, 
          key: setting.key 
        },
        defaults: setting
      });

      if (wasCreated) {
        console.log(`   ✅ Created: ${setting.category}.${setting.key}`);
        created++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`   ❌ Error creating ${setting.category}.${setting.key}:`, error.message);
    }
  }

  console.log(`\n📊 Summary: ${created} created, ${skipped} already existed`);
  console.log('✅ Settings seeding complete!\n');
}

// Run if called directly
if (require.main === module) {
  seedSettings()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seedSettings, DEFAULT_SETTINGS };
