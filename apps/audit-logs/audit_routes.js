const express = require('express');
const router = express.Router();
const { AuditLog, User, Role } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Logs directory for GET request logs
const LOGS_DIR = path.join(__dirname, '../../logs');
const ACCESS_LOG_FILE = path.join(LOGS_DIR, 'access.log');

/**
 * @route   GET /api/v1/audit-logs
 * @desc    Get all audit logs (POST, PUT, DELETE actions from database)
 * @access  Private (Admin, SHEQ)
 */
router.get('/', authenticate, requireRole('admin', 'sheq'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      entityType, 
      userId,
      startDate,
      endDate,
      search
    } = req.query;

    const where = {};
    
    // Filter by action type
    if (action) {
      where.action = action;
    }
    
    // Filter by entity type
    if (entityType) {
      where.entityType = entityType;
    }
    
    // Filter by user
    if (userId) {
      where.userId = userId;
    }
    
    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
    
    // Search in action or entityType
    if (search) {
      where[Op.or] = [
        { action: { [Op.iLike]: `%${search}%` } },
        { entityType: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username'],
        include: [{
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }]
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/audit-logs/access-logs
 * @desc    Get access logs (GET requests from file)
 * @access  Private (Admin)
 */
router.get('/access-logs', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100,
      startDate,
      endDate,
      search,
      userId
    } = req.query;

    // Check if log file exists
    if (!fs.existsSync(ACCESS_LOG_FILE)) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 0
        }
      });
    }

    // Read log file
    const logs = [];
    const fileStream = fs.createReadStream(ACCESS_LOG_FILE);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      try {
        if (line.trim()) {
          const logEntry = JSON.parse(line);
          
          // Apply filters
          let include = true;
          
          if (startDate && new Date(logEntry.timestamp) < new Date(startDate)) {
            include = false;
          }
          if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) {
            include = false;
          }
          if (search && !logEntry.url.toLowerCase().includes(search.toLowerCase()) && 
              !logEntry.username?.toLowerCase().includes(search.toLowerCase())) {
            include = false;
          }
          if (userId && logEntry.userId !== userId) {
            include = false;
          }
          
          if (include) {
            logs.push(logEntry);
          }
        }
      } catch (parseError) {
        // Skip invalid lines
      }
    }

    // Sort by timestamp descending (most recent first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate
    const total = logs.length;
    const offset = (page - 1) * limit;
    const paginatedLogs = logs.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: paginatedLogs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch access logs',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Private (Admin, SHEQ)
 */
router.get('/stats', authenticate, requireRole('admin', 'sheq'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    // Get counts by action
    const actionCounts = await AuditLog.findAll({
      where,
      attributes: [
        'action',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['action'],
      raw: true
    });

    // Get counts by entity type
    const entityCounts = await AuditLog.findAll({
      where,
      attributes: [
        'entityType',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['entityType'],
      raw: true
    });

    // Get total count
    const totalCount = await AuditLog.count({ where });

    // Get recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await AuditLog.count({
      where: {
        ...where,
        createdAt: { [Op.gte]: last24Hours }
      }
    });

    res.json({
      success: true,
      data: {
        totalLogs: totalCount,
        last24Hours: recentCount,
        byAction: actionCounts,
        byEntity: entityCounts
      }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/audit-logs/:id
 * @desc    Get single audit log by ID
 * @access  Private (Admin, SHEQ)
 */
router.get('/:id', authenticate, requireRole('admin', 'sheq'), async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username'],
        include: [{
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }]
      }]
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/v1/audit-logs/clear-access-logs
 * @desc    Clear access logs file (archive old logs)
 * @access  Private (Admin only)
 */
router.delete('/clear-access-logs', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (fs.existsSync(ACCESS_LOG_FILE)) {
      // Archive the file with timestamp
      const archiveFile = path.join(LOGS_DIR, `access_${Date.now()}.log`);
      fs.renameSync(ACCESS_LOG_FILE, archiveFile);
      
      // Create new empty file
      fs.writeFileSync(ACCESS_LOG_FILE, '');
    }

    res.json({
      success: true,
      message: 'Access logs archived and cleared'
    });
  } catch (error) {
    console.error('Error clearing access logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear access logs',
      error: error.message
    });
  }
});

module.exports = router;
