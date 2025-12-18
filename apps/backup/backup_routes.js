const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { Setting } = require('../../models');
const backupHelper = require('../../helpers/backup_helper');
const { sequelize } = require('../../database/db');

// All routes require admin role
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * @route   GET /api/v1/backup/db-stats
 * @desc    Get real database statistics
 * @access  Admin only
 */
router.get('/db-stats', async (req, res) => {
  try {
    // Get database size
    const dbSizeResult = await sequelize.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             pg_database_size(current_database()) as size_bytes
    `, { type: sequelize.QueryTypes.SELECT });

    // Get table count
    const tableCountResult = await sequelize.query(`
      SELECT count(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `, { type: sequelize.QueryTypes.SELECT });

    // Get total records across all tables
    const recordCountResult = await sequelize.query(`
      SELECT SUM(n_live_tup) as total_records
      FROM pg_stat_user_tables
    `, { type: sequelize.QueryTypes.SELECT });

    // Get server uptime
    const uptimeResult = await sequelize.query(`
      SELECT 
        NOW() - pg_postmaster_start_time() as uptime,
        pg_postmaster_start_time() as started_at
    `, { type: sequelize.QueryTypes.SELECT });

    // Get connection count
    const connectionResult = await sequelize.query(`
      SELECT count(*) as connections 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `, { type: sequelize.QueryTypes.SELECT });

    // Format uptime
    const uptimeInterval = uptimeResult[0]?.uptime;
    let uptimeString = 'Unknown';
    if (uptimeInterval) {
      const days = uptimeInterval.days || 0;
      const hours = uptimeInterval.hours || 0;
      const minutes = uptimeInterval.minutes || 0;
      uptimeString = `${days} days, ${hours} hours`;
      if (days === 0) {
        uptimeString = `${hours} hours, ${minutes} minutes`;
      }
    }

    res.json({
      success: true,
      data: {
        size: dbSizeResult[0]?.size || 'Unknown',
        sizeBytes: parseInt(dbSizeResult[0]?.size_bytes) || 0,
        tables: parseInt(tableCountResult[0]?.count) || 0,
        records: parseInt(recordCountResult[0]?.total_records) || 0,
        uptime: uptimeString,
        startedAt: uptimeResult[0]?.started_at,
        activeConnections: parseInt(connectionResult[0]?.connections) || 0
      }
    });
  } catch (error) {
    console.error('Get DB stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/backup
 * @desc    List all available backups
 * @access  Admin only
 */
router.get('/', async (req, res) => {
  try {
    // Get backup path from settings
    const backupPathSetting = await Setting.findOne({
      where: { category: 'database', key: 'backupPath' }
    });
    const backupPath = backupPathSetting?.value || backupHelper.DEFAULT_BACKUP_PATH;

    const backups = backupHelper.listBackups(backupPath);

    res.json({
      success: true,
      data: {
        backups,
        backupPath: path.resolve(backupPath),
        totalCount: backups.length
      }
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/backup
 * @desc    Create a new backup immediately
 * @access  Admin only
 */
router.post('/', async (req, res) => {
  try {
    // Get backup path from settings
    const backupPathSetting = await Setting.findOne({
      where: { category: 'database', key: 'backupPath' }
    });
    const backupPath = backupPathSetting?.value || backupHelper.DEFAULT_BACKUP_PATH;

    console.log(`📦 Manual backup requested by user ${req.user?.id}`);

    const result = await backupHelper.performBackup({ backupPath });

    res.json({
      success: true,
      message: 'Backup created successfully',
      data: result
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/backup/restore/:filename
 * @desc    Restore database from a backup file
 * @access  Admin only
 */
router.post('/restore/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Get backup path from settings
    const backupPathSetting = await Setting.findOne({
      where: { category: 'database', key: 'backupPath' }
    });
    const backupPath = backupPathSetting?.value || backupHelper.DEFAULT_BACKUP_PATH;

    const filePath = path.join(path.resolve(backupPath), filename);

    // Security check
    if (!filePath.startsWith(path.resolve(backupPath))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup file path'
      });
    }

    console.log(`⚠️ Database restore requested by user ${req.user?.id} from ${filename}`);

    const result = await backupHelper.restoreBackup(filePath);

    res.json({
      success: true,
      message: 'Database restored successfully',
      data: result
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/v1/backup/:filename
 * @desc    Delete a specific backup file
 * @access  Admin only
 */
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Get backup path from settings
    const backupPathSetting = await Setting.findOne({
      where: { category: 'database', key: 'backupPath' }
    });
    const backupPath = backupPathSetting?.value || backupHelper.DEFAULT_BACKUP_PATH;

    backupHelper.deleteBackup(filename, backupPath);

    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/backup/cleanup
 * @desc    Clean up old backups based on retention policy
 * @access  Admin only
 */
router.post('/cleanup', async (req, res) => {
  try {
    // Get settings
    const [backupPathSetting, retentionSetting] = await Promise.all([
      Setting.findOne({ where: { category: 'database', key: 'backupPath' } }),
      Setting.findOne({ where: { category: 'database', key: 'backupRetention' } })
    ]);

    const backupPath = backupPathSetting?.value || backupHelper.DEFAULT_BACKUP_PATH;
    const retentionDays = parseInt(retentionSetting?.value || '30');

    const deletedCount = backupHelper.cleanupOldBackups(retentionDays, backupPath);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old backup(s)`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Cleanup backups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup backups',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/backup/download/:filename
 * @desc    Download a backup file
 * @access  Admin only
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Get backup path from settings
    const backupPathSetting = await Setting.findOne({
      where: { category: 'database', key: 'backupPath' }
    });
    const backupPath = backupPathSetting?.value || backupHelper.DEFAULT_BACKUP_PATH;

    const filePath = path.join(path.resolve(backupPath), filename);

    // Security check
    if (!filePath.startsWith(path.resolve(backupPath))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup file path'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }

    res.download(filePath, filename);
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download backup',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/backup/status
 * @desc    Get backup scheduler status
 * @access  Admin only
 */
router.get('/status', async (req, res) => {
  try {
    // Get settings
    const [autoBackupSetting, backupTimeSetting, backupPathSetting, retentionSetting] = await Promise.all([
      Setting.findOne({ where: { category: 'database', key: 'autoBackup' } }),
      Setting.findOne({ where: { category: 'database', key: 'backupTime' } }),
      Setting.findOne({ where: { category: 'database', key: 'backupPath' } }),
      Setting.findOne({ where: { category: 'database', key: 'backupRetention' } })
    ]);

    const backupPath = backupPathSetting?.value || backupHelper.DEFAULT_BACKUP_PATH;
    const backups = backupHelper.listBackups(backupPath);
    const latestBackup = backups.length > 0 ? backups[0] : null;

    res.json({
      success: true,
      data: {
        autoBackup: autoBackupSetting?.value === 'true',
        backupTime: backupTimeSetting?.value || '18:00',
        backupPath: path.resolve(backupPath),
        retentionDays: parseInt(retentionSetting?.value || '30'),
        totalBackups: backups.length,
        latestBackup: latestBackup ? {
          filename: latestBackup.filename,
          size: latestBackup.sizeMB + ' MB',
          createdAt: latestBackup.createdAt
        } : null
      }
    });
  } catch (error) {
    console.error('Get backup status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup status',
      error: error.message
    });
  }
});

module.exports = router;
