const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const PPEItem = sequelize.define('PPEItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  itemCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    comment: 'Internal item code for reference'
  },
  itemRefCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    comment: 'External reference code (e.g., ITMREF_0 like SS053926002)'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Product name or description'
  },
  productName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Full product name (ITMDES1_0 from inventory)'
  },
  itemType: {
    type: DataTypes.ENUM('PPE', 'CONSUMABLE', 'EQUIPMENT', 'LABORATORY'),
    allowNull: false,
    defaultValue: 'PPE',
    comment: 'Type of item: PPE, CONSUMABLE, EQUIPMENT, or LABORATORY'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'PPE category (BODY/TORSO, EARS, EYES/FACE, FEET, HANDS, etc.) or item category (CONS, GESP)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Detailed description of the item'
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'EA',
    comment: 'Unit of measure (EA, KG, M, etc.)'
  },
  replacementFrequency: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Standard replacement frequency in months'
  },
  heavyUseFrequency: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Heavy use replacement frequency in months'
  },
  isMandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  accountCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Accounting code (e.g., PPEQ, PSS05, CONS)'
  },
  accountDescription: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Account description (e.g., Personal Protective Equipment)'
  },
  supplier: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  hasSizeVariants: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this item comes in different sizes'
  },
  hasColorVariants: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this item comes in different colors'
  },
  sizeScale: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'References size_scales.code to indicate which size set applies'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'ppe_items',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['item_code']
    },
    {
      unique: true,
      fields: ['item_ref_code'],
      name: 'unique_item_ref_code'
    },
    {
      fields: ['category']
    },
    {
      fields: ['account_code']
    },
    {
      fields: ['size_scale']
    }
  ]
});

module.exports = PPEItem;
