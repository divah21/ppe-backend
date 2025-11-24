const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  originalFilename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  storedFilename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  storagePath: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  docType: {
    type: DataTypes.ENUM('ppe-card', 'certificate', 'report', 'invoice', 'other'),
    defaultValue: 'other'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'documents',
  timestamps: true
});

module.exports = Document;
