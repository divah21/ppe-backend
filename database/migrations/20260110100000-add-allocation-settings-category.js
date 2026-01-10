'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'allocation' to the category ENUM type
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_settings_category" ADD VALUE IF NOT EXISTS 'allocation';
    `);

    // Insert default allocation settings
    const defaultAllocationSettings = [
      {
        id: Sequelize.literal('gen_random_uuid()'),
        category: 'allocation',
        key: 'enableAdditionalItems',
        value: 'true',
        value_type: 'boolean',
        description: 'Allow additional items beyond eligibility matrix',
        is_secret: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        category: 'allocation',
        key: 'restrictAdditionalItems',
        value: 'true',
        value_type: 'boolean',
        description: 'Restrict which items can be added as additional',
        is_secret: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        category: 'allocation',
        key: 'allowedAdditionalItemIds',
        value: '[]',
        value_type: 'json',
        description: 'List of PPE item IDs allowed for additional allocations',
        is_secret: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        category: 'allocation',
        key: 'maxAdditionalItems',
        value: '5',
        value_type: 'number',
        description: 'Maximum number of additional items per request',
        is_secret: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        category: 'allocation',
        key: 'requireJustificationForAdditional',
        value: 'true',
        value_type: 'boolean',
        description: 'Require reason for additional items',
        is_secret: false,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Insert each setting, ignoring if it already exists
    for (const setting of defaultAllocationSettings) {
      await queryInterface.sequelize.query(`
        INSERT INTO settings (id, category, key, value, value_type, description, is_secret, created_at, updated_at)
        VALUES (gen_random_uuid(), :category, :key, :value, :value_type, :description, :is_secret, :created_at, :updated_at)
        ON CONFLICT (category, key) DO NOTHING;
      `, {
        replacements: {
          category: setting.category,
          key: setting.key,
          value: setting.value,
          value_type: setting.value_type,
          description: setting.description,
          is_secret: setting.is_secret,
          created_at: setting.created_at,
          updated_at: setting.updated_at
        }
      });
    }

    console.log('✅ Added allocation settings category and default settings');
  },

  down: async (queryInterface, Sequelize) => {
    // Delete allocation settings
    await queryInterface.sequelize.query(`
      DELETE FROM settings WHERE category = 'allocation';
    `);

    // Note: PostgreSQL doesn't support removing values from ENUM types easily
    // The 'allocation' value will remain in the ENUM but won't be used
    console.log('✅ Removed allocation settings (ENUM value remains)');
  }
};
