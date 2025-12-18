'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      category: {
        type: Sequelize.ENUM('general', 'notifications', 'security', 'database', 'email', 'appearance', 'api', 'users'),
        allowNull: false
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      valueType: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'json'),
        defaultValue: 'string',
        field: 'value_type'
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isSecret: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_secret'
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'updated_by',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      }
    });

    // Add unique constraint on category + key
    await queryInterface.addIndex('settings', ['category', 'key'], {
      unique: true,
      name: 'settings_category_key_unique'
    });

    // Insert default settings
    const defaultSettings = [
      // General settings
      { id: Sequelize.literal('gen_random_uuid()'), category: 'general', key: 'systemName', value: 'PPE Management System', valueType: 'string', description: 'System display name' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'general', key: 'organizationName', value: 'Your Organization', valueType: 'string', description: 'Organization name' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'general', key: 'timezone', value: 'Africa/Johannesburg', valueType: 'string', description: 'System timezone' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'general', key: 'dateFormat', value: 'DD/MM/YYYY', valueType: 'string', description: 'Date display format' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'general', key: 'currency', value: 'USD', valueType: 'string', description: 'Default currency' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'general', key: 'language', value: 'en', valueType: 'string', description: 'System language' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'general', key: 'fiscalYearStart', value: 'January', valueType: 'string', description: 'Fiscal year start month' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'general', key: 'maintenanceMode', value: 'false', valueType: 'boolean', description: 'Enable maintenance mode' },

      // Notification settings
      { id: Sequelize.literal('gen_random_uuid()'), category: 'notifications', key: 'emailNotifications', value: 'true', valueType: 'boolean', description: 'Enable email notifications' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'notifications', key: 'budgetAlerts', value: 'true', valueType: 'boolean', description: 'Enable budget alerts' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'notifications', key: 'budgetThreshold', value: '80', valueType: 'number', description: 'Budget alert threshold percentage' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'notifications', key: 'lowStockAlerts', value: 'true', valueType: 'boolean', description: 'Enable low stock alerts' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'notifications', key: 'stockThreshold', value: '10', valueType: 'number', description: 'Low stock threshold quantity' },

      // Security settings
      { id: Sequelize.literal('gen_random_uuid()'), category: 'security', key: 'sessionTimeout', value: '30', valueType: 'number', description: 'Session timeout in minutes' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'security', key: 'maxLoginAttempts', value: '5', valueType: 'number', description: 'Max failed login attempts' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'security', key: 'lockoutDuration', value: '15', valueType: 'number', description: 'Account lockout duration in minutes' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'security', key: 'requireMfa', value: 'false', valueType: 'boolean', description: 'Require multi-factor authentication' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'security', key: 'passwordMinLength', value: '8', valueType: 'number', description: 'Minimum password length' },

      // Database settings
      { id: Sequelize.literal('gen_random_uuid()'), category: 'database', key: 'autoBackup', value: 'true', valueType: 'boolean', description: 'Enable automatic backups' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'database', key: 'backupTime', value: '18:00', valueType: 'string', description: 'Daily backup time (24h format)' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'database', key: 'backupRetention', value: '30', valueType: 'number', description: 'Backup retention in days' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'database', key: 'backupPath', value: './backups', valueType: 'string', description: 'Backup storage path' },

      // API settings
      { id: Sequelize.literal('gen_random_uuid()'), category: 'api', key: 'rateLimitEnabled', value: 'true', valueType: 'boolean', description: 'Enable API rate limiting' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'api', key: 'requestsPerMinute', value: '60', valueType: 'number', description: 'Max requests per minute' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'api', key: 'requestsPerHour', value: '1000', valueType: 'number', description: 'Max requests per hour' },

      // User defaults
      { id: Sequelize.literal('gen_random_uuid()'), category: 'users', key: 'defaultRole', value: 'section_rep', valueType: 'string', description: 'Default role for new users' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'users', key: 'requireEmailVerification', value: 'true', valueType: 'boolean', description: 'Require email verification' },
      { id: Sequelize.literal('gen_random_uuid()'), category: 'users', key: 'passwordResetExpiry', value: '24', valueType: 'number', description: 'Password reset link expiry in hours' },
    ];

    // Use raw query for inserting with gen_random_uuid()
    for (const setting of defaultSettings) {
      await queryInterface.sequelize.query(`
        INSERT INTO settings (id, category, key, value, value_type, description, created_at, updated_at)
        VALUES (gen_random_uuid(), '${setting.category}', '${setting.key}', '${setting.value}', '${setting.valueType}', '${setting.description}', NOW(), NOW())
        ON CONFLICT (category, key) DO NOTHING
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('settings');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_settings_category";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_settings_valueType";');
  }
};
