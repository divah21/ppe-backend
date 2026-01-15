const express = require('express');
const router = express.Router();
const { JobTitlePPEMatrix, PPEItem, Employee, JobTitle, Section, Department } = require('../../models');
const { sequelize } = require('../../database/db');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { Op } = require('sequelize');

console.log('[MATRIX ROUTES] Module loaded at', new Date().toISOString());

// Conditional debug logger
const logDebug = (...args) => {
  if (process.env.DEBUG_MATRIX === '1') {
    console.log('[MATRIX]', ...args);
  }
};

// Simple test route to verify router is working
router.post('/test', (req, res) => {
  console.log('[MATRIX TEST] Test endpoint hit!');
  res.json({ success: true, message: 'Matrix router is working' });
});

/**
 * @route   GET /api/v1/matrix
 * @desc    Get all job title PPE matrix entries
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { jobTitle, jobTitleId, category, ppeItemId, page = 1, limit = 100 } = req.query;

    const where = {};
    if (jobTitle) where.jobTitle = { [Op.iLike]: `%${jobTitle}%` };
    if (jobTitleId) where.jobTitleId = jobTitleId;
    if (category) where.category = category;
    if (ppeItemId) where.ppeItemId = ppeItemId;

    const offset = (page - 1) * limit;

    const { count, rows: matrixEntries } = await JobTitlePPEMatrix.findAndCountAll({
      where,
      include: [{
        model: PPEItem,
        as: 'ppeItem',
        attributes: ['id', 'name', 'itemCode', 'itemRefCode', 'category', 'unit', 'hasSizeVariants', 'hasColorVariants']
      }],
      limit: parseInt(limit),
      offset,
      order: [['jobTitle', 'ASC'], ['category', 'ASC']]
    });

    res.json({
      success: true,
      data: matrixEntries,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/matrix/job-titles
 * @desc    Get all unique job titles from the matrix
 * @access  Private
 */
router.get('/job-titles', authenticate, async (req, res, next) => {
  try {
    const jobTitles = await JobTitlePPEMatrix.findAll({
      attributes: ['jobTitle'],
      group: ['jobTitle'],
      order: [['jobTitle', 'ASC']]
    });

    const uniqueJobTitles = jobTitles.map(item => item.jobTitle);

    res.json({
      success: true,
      data: uniqueJobTitles
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/matrix/by-job-title/:jobTitle
 * @desc    Get PPE requirements for a specific job title
 * @access  Private
 */
router.get('/by-job-title/:jobTitle', authenticate, async (req, res, next) => {
  try {
    const { jobTitle } = req.params;

    const requirements = await JobTitlePPEMatrix.findAll({
      where: {
        jobTitle: { [Op.iLike]: jobTitle },
        isActive: true
      },
      include: [{
        model: PPEItem,
        as: 'ppeItem',
        where: { isActive: true }
      }],
      order: [['category', 'ASC']]
    });

    // Group by category
    const groupedByCategory = requirements.reduce((acc, req) => {
      const category = req.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(req);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        jobTitle,
        requirements,
        groupedByCategory,
        totalItems: requirements.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/matrix/:id
 * @desc    Get single matrix entry by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const matrixEntry = await JobTitlePPEMatrix.findByPk(req.params.id, {
      include: [{
        model: PPEItem,
        as: 'ppeItem'
      }]
    });

    if (!matrixEntry) {
      return res.status(404).json({
        success: false,
        message: 'Matrix entry not found'
      });
    }

    res.json({
      success: true,
      data: matrixEntry
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/matrix
 * @desc    Create new job title PPE matrix entry
 * @access  Private (Admin, SHEQ, Stores)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin', 'sheq', 'stores'),
  [
    body('jobTitle').trim().notEmpty().withMessage('Job title is required'),
    body('ppeItemId').isUUID().withMessage('Valid PPE item ID is required'),
    body('quantityRequired').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('replacementFrequency').optional().isInt({ min: 1 }).withMessage('Replacement frequency must be positive'),
    body('heavyUseFrequency').optional().isInt({ min: 1 }).withMessage('Heavy use frequency must be positive'),
    body('category').optional().trim(),
    body('isMandatory').optional().isBoolean()
  ],
  validate,
  auditLog,
  async (req, res, next) => {
    try {
      const {
        jobTitle,
        ppeItemId,
        quantityRequired,
        replacementFrequency,
        heavyUseFrequency,
        category,
        isMandatory,
        notes
      } = req.body;

      // Check if PPE item exists
      const ppeItem = await PPEItem.findByPk(ppeItemId);
      if (!ppeItem) {
        return res.status(404).json({
          success: false,
          message: 'PPE item not found'
        });
      }

      // Check if entry already exists
      const existing = await JobTitlePPEMatrix.findOne({
        where: {
          jobTitle,
          ppeItemId
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'This PPE item is already assigned to this job title'
        });
      }

      const matrixEntry = await JobTitlePPEMatrix.create({
        jobTitle,
        ppeItemId,
        quantityRequired,
        replacementFrequency,
        heavyUseFrequency,
        category: category || ppeItem.category,
        isMandatory,
        notes
      });

      const createdEntry = await JobTitlePPEMatrix.findByPk(matrixEntry.id, {
        include: [{
          model: PPEItem,
          as: 'ppeItem'
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Job title PPE requirement created successfully',
        data: createdEntry
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/matrix/bulk
 * @desc    Bulk create job title PPE matrix entries
 * @access  Private (Admin, SHEQ, Stores)
 */
router.post(
  '/bulk',
  authenticate,
  requireRole('admin', 'sheq', 'stores'),
  [
    body('entries').isArray({ min: 1 }).withMessage('Entries array is required'),
    body('entries.*.jobTitle').trim().notEmpty().withMessage('Job title is required'),
    body('entries.*.ppeItemId').isUUID().withMessage('Valid PPE item ID is required'),
    body('entries.*.quantityRequired').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ],
  validate,
  auditLog,
  async (req, res, next) => {
    try {
      const { entries } = req.body;

      // Validate all PPE items exist in bulk
      const ppeItemIds = [...new Set(entries.map(e => e.ppeItemId))];
      const ppeItems = await PPEItem.findAll({
        where: { id: { [Op.in]: ppeItemIds } },
        attributes: ['id', 'category']
      });
      const ppeItemMap = new Map(ppeItems.map(item => [item.id, item]));

      // Check for missing PPE items
      const missingPPEItems = ppeItemIds.filter(id => !ppeItemMap.has(id));
      if (missingPPEItems.length > 0) {
        return res.status(400).json({
          success: false,
          message: `PPE items not found: ${missingPPEItems.join(', ')}`
        });
      }

      // Check for existing entries
      const existingEntries = await JobTitlePPEMatrix.findAll({
        where: {
          [Op.or]: entries.map(e => ({
            jobTitleId: e.jobTitleId,
            ppeItemId: e.ppeItemId
          }))
        },
        attributes: ['jobTitleId', 'ppeItemId']
      });

      const existingSet = new Set(
        existingEntries.map(e => `${e.jobTitleId}_${e.ppeItemId}`)
      );

      // Filter out existing entries
      const newEntries = entries.filter(e => {
        const key = `${e.jobTitleId}_${e.ppeItemId}`;
        return !existingSet.has(key);
      });

      if (newEntries.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'All entries already exist',
          data: {
            duplicates: entries.length,
            created: 0
          }
        });
      }

      // Prepare data for bulk insert
      const bulkData = newEntries.map(entry => {
        const ppeItem = ppeItemMap.get(entry.ppeItemId);
        return {
          jobTitleId: entry.jobTitleId,
          jobTitle: entry.jobTitle,
          ppeItemId: entry.ppeItemId,
          quantityRequired: entry.quantityRequired || 1,
          replacementFrequency: entry.replacementFrequency || 12,
          heavyUseFrequency: entry.heavyUseFrequency,
          category: entry.category || ppeItem.category,
          isMandatory: entry.isMandatory !== undefined ? entry.isMandatory : true,
          notes: entry.notes,
          isActive: entry.isActive !== undefined ? entry.isActive : true
        };
      });

      // Bulk insert
      const createdEntries = await JobTitlePPEMatrix.bulkCreate(bulkData);

      res.status(201).json({
        success: true,
        message: `Created ${createdEntries.length} entries${existingSet.size > 0 ? `, skipped ${existingSet.size} duplicates` : ''}`,
        data: {
          created: createdEntries.length,
          duplicates: existingSet.size,
          entries: createdEntries
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/matrix/replace
 * @desc    Replace all matrix entries for a given job title in a single transaction
 * @access  Private (Admin, SHEQ, Stores)
 */
router.post(
  '/replace',
  (req, res, next) => {
    console.log('[MATRIX REPLACE DEBUG] Request received!');
    console.log('[MATRIX REPLACE DEBUG] Body:', JSON.stringify(req.body).substring(0, 200));
    next();
  },
  authenticate,
  (req, res, next) => {
    console.log('[MATRIX REPLACE DEBUG] After auth, user:', req.user?.username);
    next();
  },
  requireRole('admin', 'sheq', 'stores'),
  (req, res, next) => {
    console.log('[MATRIX REPLACE DEBUG] After role check');
    next();
  },
  [
    body('entries').isArray({ min: 1 }).withMessage('Entries array is required'),
    body('entries.*.ppeItemId').isUUID().withMessage('Valid PPE item ID is required'),
    body('entries.*.quantityRequired').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ],
  (req, res, next) => {
    console.log('[MATRIX REPLACE DEBUG] After validation rules');
    next();
  },
  validate,
  (req, res, next) => {
    console.log('[MATRIX REPLACE DEBUG] After validate middleware');
    next();
  },
  auditLog('REPLACE', 'matrix'),
  async (req, res, next) => {
    console.log('[MATRIX REPLACE] Starting...');
    const t0 = Date.now();
    let t = null;
    try {
      const { entries } = req.body;
      console.log('[MATRIX REPLACE] Entries count:', entries.length);

      // Determine jobTitleId / jobTitle from entries (all should be same)
      const jobTitleIdSet = new Set(entries.map((e) => e.jobTitleId).filter(Boolean));
      const jobTitleSet = new Set(entries.map((e) => e.jobTitle).filter(Boolean));

      if (jobTitleIdSet.size === 0 && jobTitleSet.size === 0) {
        return res.status(400).json({ success: false, message: 'jobTitleId or jobTitle is required' });
      }
      if (jobTitleIdSet.size > 1) {
        return res.status(400).json({ success: false, message: 'All entries must have the same jobTitleId' });
      }
      if (jobTitleSet.size > 1) {
        return res.status(400).json({ success: false, message: 'All entries must have the same jobTitle' });
      }

      const jobTitleId = jobTitleIdSet.size === 1 ? [...jobTitleIdSet][0] : null;
      const jobTitle = jobTitleSet.size === 1 ? [...jobTitleSet][0] : null;
      console.log('[MATRIX REPLACE] JobTitleId:', jobTitleId, 'JobTitle:', jobTitle);
      logDebug('replace start', { jobTitleId, jobTitle, count: entries.length });

      // Validate PPE items in bulk
      console.log('[MATRIX REPLACE] Validating PPE items...');
      const tValidate0 = Date.now();
      const ppeItemIds = [...new Set(entries.map((e) => e.ppeItemId))];
      const ppeItems = await PPEItem.findAll({ where: { id: { [Op.in]: ppeItemIds } }, attributes: ['id', 'category'] });
      const ppeItemMap = new Map(ppeItems.map((i) => [i.id, i]));
      const missing = ppeItemIds.filter((id) => !ppeItemMap.has(id));
      if (missing.length) {
        return res.status(400).json({ success: false, message: `PPE items not found: ${missing.join(', ')}` });
      }
      const tValidateMs = Date.now() - tValidate0;
      console.log('[MATRIX REPLACE] PPE validation done in', tValidateMs, 'ms');
      logDebug('validated PPE items', { unique: ppeItemIds.length, ms: tValidateMs });

      // Start transaction AFTER validation to minimize lock time
      console.log('[MATRIX REPLACE] Starting transaction...');
      t = await sequelize.transaction();

      // Delete existing entries for this job title (supports both legacy and new fields)
      console.log('[MATRIX REPLACE] Deleting existing entries...');
      const tDelete0 = Date.now();
      const where = jobTitleId ? { jobTitleId } : { jobTitle };
      const deleted = await JobTitlePPEMatrix.destroy({ where, transaction: t });
      const tDeleteMs = Date.now() - tDelete0;
      console.log('[MATRIX REPLACE] Deleted', deleted, 'entries in', tDeleteMs, 'ms');
      logDebug('deleted existing', { deleted, ms: tDeleteMs });

      // Prepare and bulk insert new entries
      console.log('[MATRIX REPLACE] Preparing rows for bulk insert...');
      const rows = entries.map((e) => {
        const p = ppeItemMap.get(e.ppeItemId);
        return {
          jobTitleId: jobTitleId || null,
          jobTitle: jobTitle || e.jobTitle || null,
          ppeItemId: e.ppeItemId,
          quantityRequired: e.quantityRequired || 1,
          replacementFrequency: e.replacementFrequency || 12,
          heavyUseFrequency: e.heavyUseFrequency,
          category: e.category || p?.category,
          isMandatory: e.isMandatory !== undefined ? e.isMandatory : true,
          notes: e.notes,
          isActive: e.isActive !== undefined ? e.isActive : true
        };
      });

      console.log('[MATRIX REPLACE] Bulk inserting', rows.length, 'rows...');
      const tInsert0 = Date.now();
      await JobTitlePPEMatrix.bulkCreate(rows, { transaction: t });
      const tInsertMs = Date.now() - tInsert0;
      console.log('[MATRIX REPLACE] Bulk insert done in', tInsertMs, 'ms');
      
      console.log('[MATRIX REPLACE] Committing transaction...');
      await t.commit();

      const totalMs = Date.now() - t0;
      console.log('[MATRIX REPLACE] Complete! Total time:', totalMs, 'ms');
      logDebug('replace done', { created: rows.length, totalMs, tValidateMs, tDeleteMs, tInsertMs });

      res.status(201).json({ success: true, message: 'Matrix replaced successfully', data: { created: rows.length, timings: { validateMs: tValidateMs, deleteMs: tDeleteMs, insertMs: tInsertMs, totalMs } } });
    } catch (error) {
      console.error('[MATRIX REPLACE] Error:', error.message);
      if (t) await t.rollback();
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/matrix/:id
 * @desc    Update job title PPE matrix entry
 * @access  Private (Admin, SHEQ, Stores)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin', 'sheq', 'stores'),
  [
    param('id').isUUID().withMessage('Valid matrix entry ID is required'),
    body('quantityRequired').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('replacementFrequency').optional().isInt({ min: 1 }).withMessage('Replacement frequency must be positive'),
    body('heavyUseFrequency').optional().isInt({ min: 1 }).withMessage('Heavy use frequency must be positive'),
    body('category').optional().trim(),
    body('isMandatory').optional().isBoolean(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  auditLog,
  async (req, res, next) => {
    try {
      const matrixEntry = await JobTitlePPEMatrix.findByPk(req.params.id);

      if (!matrixEntry) {
        return res.status(404).json({
          success: false,
          message: 'Matrix entry not found'
        });
      }

      const {
        quantityRequired,
        replacementFrequency,
        heavyUseFrequency,
        category,
        isMandatory,
        notes,
        isActive
      } = req.body;

      await matrixEntry.update({
        ...(quantityRequired !== undefined && { quantityRequired }),
        ...(replacementFrequency !== undefined && { replacementFrequency }),
        ...(heavyUseFrequency !== undefined && { heavyUseFrequency }),
        ...(category !== undefined && { category }),
        ...(isMandatory !== undefined && { isMandatory }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive })
      });

      const updatedEntry = await JobTitlePPEMatrix.findByPk(matrixEntry.id, {
        include: [{
          model: PPEItem,
          as: 'ppeItem'
        }]
      });

      res.json({
        success: true,
        message: 'Matrix entry updated successfully',
        data: updatedEntry
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/matrix/:id
 * @desc    Delete job title PPE matrix entry
 * @access  Private (Admin, SHEQ, Stores)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin', 'sheq', 'stores'),
  [
    param('id').isUUID().withMessage('Valid matrix entry ID is required')
  ],
  validate,
  auditLog,
  async (req, res, next) => {
    try {
      const matrixEntry = await JobTitlePPEMatrix.findByPk(req.params.id);

      if (!matrixEntry) {
        return res.status(404).json({
          success: false,
          message: 'Matrix entry not found'
        });
      }

      await matrixEntry.destroy();

      res.json({
        success: true,
        message: 'Matrix entry deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/matrix/bulk-upload
 * @desc    Bulk upload PPE matrix configuration from Excel
 *          Creates job titles if they don't exist, maps PPE items by name
 * @access  Private (Admin, SHEQ, Stores)
 */
router.post(
  '/bulk-upload',
  authenticate,
  requireRole('admin', 'sheq', 'stores'),
  async (req, res, next) => {
    const t = await sequelize.transaction();
    
    try {
      const { entries, defaultSectionId, createJobTitles = true, createPPEItems = true, updateExisting = false } = req.body;
      
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Entries array is required'
        });
      }

      // Load all PPE items for name matching
      const allPPEItems = await PPEItem.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'itemCode', 'category', 'replacementFrequency', 'unit']
      });
      
      // Create lookup maps for PPE items (by name, partial name match)
      const ppeByName = new Map();
      const ppeByCode = new Map();
      allPPEItems.forEach(item => {
        ppeByName.set(item.name.toLowerCase().trim(), item);
        if (item.itemCode) {
          ppeByCode.set(item.itemCode.toLowerCase().trim(), item);
        }
      });

      // Load all job titles
      const allJobTitles = await JobTitle.findAll({
        include: [{ model: Section, as: 'section', include: [{ model: Department, as: 'department' }] }]
      });
      const jobTitleByName = new Map();
      allJobTitles.forEach(jt => {
        jobTitleByName.set(jt.name.toLowerCase().trim(), jt);
      });

      // Load all sections
      const allSections = await Section.findAll({
        include: [{ model: Department, as: 'department' }]
      });
      const sectionByName = new Map();
      allSections.forEach(s => {
        sectionByName.set(s.name.toLowerCase().trim(), s);
      });

      // Get default section for new job titles
      let defaultSection = null;
      if (defaultSectionId) {
        defaultSection = await Section.findByPk(defaultSectionId);
      }
      if (!defaultSection && allSections.length > 0) {
        // Use first available section as fallback
        defaultSection = allSections[0];
      }

      const results = {
        matrixCreated: [],
        matrixUpdated: [],
        matrixSkipped: [],
        jobTitlesCreated: [],
        ppeItemsCreated: [],
        ppeItemsUpdated: [],
        ppeNotFound: [],
        errors: []
      };

      // Helper to determine PPE category based on item name
      const determinePPECategory = (name) => {
        const nameLower = name.toLowerCase();
        
        // FEET
        if (nameLower.includes('boot') || nameLower.includes('shoe') || nameLower.includes('spat')) {
          return 'FEET';
        }
        // HANDS
        if (nameLower.includes('glove')) {
          return 'HANDS';
        }
        // EYES/FACE
        if (nameLower.includes('glass') || nameLower.includes('goggle') || nameLower.includes('shield') || 
            nameLower.includes('visor') || nameLower.includes('visa') || nameLower.includes('helmet')) {
          return 'EYES/FACE';
        }
        // HEAD
        if (nameLower.includes('hard hat') || nameLower.includes('hat') || nameLower.includes('sunbrim') || 
            nameLower.includes('liner') || nameLower.includes('hair net') || nameLower.includes('neckerchief')) {
          return 'HEAD';
        }
        // EARS
        if (nameLower.includes('ear') || nameLower.includes('noise')) {
          return 'EARS';
        }
        // RESPIRATORY
        if (nameLower.includes('mask') || nameLower.includes('respirator') || nameLower.includes('cartridge') || 
            nameLower.includes('filter')) {
          return 'RESPIRATORY';
        }
        // BODY/TORSO
        if (nameLower.includes('suit') || nameLower.includes('jacket') || nameLower.includes('vest') || 
            nameLower.includes('apron') || nameLower.includes('shirt') || nameLower.includes('trouser') ||
            nameLower.includes('coat') || nameLower.includes('overall') || nameLower.includes('rain')) {
          return 'BODY/TORSO';
        }
        // FALL PROTECTION
        if (nameLower.includes('harness') || nameLower.includes('lanyard')) {
          return 'FALL PROTECTION';
        }
        // SPECIALIZED EQUIPMENT
        if (nameLower.includes('tong') || nameLower.includes('bag') || nameLower.includes('guard')) {
          return 'SPECIALIZED EQUIPMENT';
        }
        
        return 'OTHER';
      };

      // Helper to determine if item has size variants
      const hasSizeVariants = (name) => {
        const nameLower = name.toLowerCase();
        return nameLower.includes('shoe') || nameLower.includes('boot') || nameLower.includes('glove') ||
               nameLower.includes('suit') || nameLower.includes('jacket') || nameLower.includes('shirt') ||
               nameLower.includes('trouser') || nameLower.includes('apron') || nameLower.includes('harness');
      };

      // Helper function to find PPE item by name (fuzzy match)
      const findPPEItem = (name) => {
        if (!name) return null;
        const normalizedName = name.toLowerCase().trim();
        
        // Exact match first
        if (ppeByName.has(normalizedName)) {
          return ppeByName.get(normalizedName);
        }
        
        // Partial match - check if PPE name contains the search term or vice versa
        for (const [key, item] of ppeByName) {
          if (key.includes(normalizedName) || normalizedName.includes(key)) {
            return item;
          }
        }
        
        // Try matching by item code
        if (ppeByCode.has(normalizedName)) {
          return ppeByCode.get(normalizedName);
        }
        
        return null;
      };

      // Helper to parse frequency string (e.g., "2", "8 months", "1year", "When worn out")
      const parseFrequency = (freqStr) => {
        if (!freqStr) return null;
        const str = freqStr.toString().toLowerCase().trim();
        
        // Check for "when worn out" or similar
        if (str.includes('worn') || str.includes('disposable') || str.includes('clogged') || str.includes('need')) {
          return 0; // 0 means "as needed"
        }
        
        // Extract number
        const match = str.match(/(\d+)/);
        if (!match) return null;
        
        const num = parseInt(match[1]);
        
        // Check for years
        if (str.includes('year')) {
          return num * 12; // Convert years to months
        }
        
        // Default to months
        return num;
      };

      // Process each entry
      for (const entry of entries) {
        try {
          const ppeName = (entry.ppeItem || entry.ppeName || entry['PPE ITEM'] || '').toString().trim();
          const jobTitleName = (entry.jobTitle || entry.occupation || entry['OCCUPATIONS'] || '').toString().trim();
          const quantity = parseInt(entry.quantity || entry.quantityRequired || 1) || 1;
          const frequency = parseFrequency(entry.frequency || entry.replacementFrequency || entry['ISSUANCE FREQUENCY']);
          const isMandatory = entry.isMandatory !== false;
          const specifications = (entry.specifications || entry['SPECIFICATIONS'] || '').toString().trim();
          const unit = (entry.unit || entry['UNIT OF MEASURE'] || 'Each').toString().trim();
          const gender = (entry.gender || '').toString().trim().toLowerCase();

          if (!ppeName) {
            results.errors.push({ entry, error: 'PPE item name is required' });
            continue;
          }

          // Find PPE item
          let ppeItem = findPPEItem(ppeName);
          
          // Determine category based on name
          const category = determinePPECategory(ppeName);
          
          // Parse unit of measure
          let ppeUnit = 'EA';
          const unitLower = unit.toLowerCase();
          if (unitLower.includes('pair')) ppeUnit = 'PAIR';
          else if (unitLower.includes('set')) ppeUnit = 'SET';
          else if (unitLower.includes('each') || unitLower === 'ea') ppeUnit = 'EA';
          
          // Parse frequency to get replacement frequency
          const replacementFreq = frequency || 12;
          
          if (ppeItem && createPPEItems) {
            // PPE item exists - update it with new info if specifications provided
            const updateData = {};
            if (specifications && specifications !== ppeItem.description) {
              updateData.description = specifications;
            }
            if (category && category !== 'OTHER' && ppeItem.category !== category) {
              updateData.category = category;
            }
            if (replacementFreq > 0 && replacementFreq !== ppeItem.replacementFrequency) {
              updateData.replacementFrequency = replacementFreq;
            }
            if (ppeUnit !== ppeItem.unit) {
              updateData.unit = ppeUnit;
            }
            
            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
              await ppeItem.update(updateData, { transaction: t });
              
              // Check if already tracked as updated
              const alreadyUpdated = results.ppeItemsUpdated.some(p => p.id === ppeItem.id);
              if (!alreadyUpdated) {
                results.ppeItemsUpdated.push({
                  id: ppeItem.id,
                  name: ppeItem.name,
                  itemCode: ppeItem.itemCode,
                  category: ppeItem.category,
                  updates: updateData
                });
              }
            }
          } else if (!ppeItem && createPPEItems) {
            // PPE item not found - create new one
            // Generate item code from name
            const itemCode = ppeName
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '-')
              .replace(/-+/g, '-')
              .substring(0, 30);
            
            // Create new PPE item
            ppeItem = await PPEItem.create({
              name: ppeName,
              itemCode: itemCode + '-' + Date.now().toString().slice(-6),
              category: category,
              unit: ppeUnit,
              description: specifications || null,
              replacementFrequency: replacementFreq > 0 ? replacementFreq : 12,
              hasSizeVariants: hasSizeVariants(ppeName),
              isMandatory: true,
              isActive: true
            }, { transaction: t });
            
            // Add to lookup maps
            ppeByName.set(ppeItem.name.toLowerCase().trim(), ppeItem);
            
            results.ppeItemsCreated.push({
              id: ppeItem.id,
              name: ppeItem.name,
              itemCode: ppeItem.itemCode,
              category: ppeItem.category,
              unit: ppeItem.unit
            });
          }
          
          if (!ppeItem) {
            results.ppeNotFound.push({ ppeName, entry });
            continue;
          }

          // Handle multiple job titles (comma or & separated)
          const jobTitleNames = jobTitleName
            .split(/[,&]/)
            .map(jt => jt.trim())
            .filter(jt => jt.length > 0);

          if (jobTitleNames.length === 0) {
            results.errors.push({ entry, error: 'Job title/occupation is required' });
            continue;
          }

          // Process each job title
          for (const jtName of jobTitleNames) {
            // Find or create job title
            let jobTitle = jobTitleByName.get(jtName.toLowerCase().trim());
            
            if (!jobTitle && createJobTitles) {
              if (!defaultSection) {
                results.errors.push({ 
                  entry, 
                  jobTitle: jtName,
                  error: 'Cannot create job title: no default section available' 
                });
                continue;
              }

              // Create new job title with optional gender suffix
              let finalName = jtName;
              if (gender && !jtName.toLowerCase().includes(gender)) {
                // Check if this is a gender-specific entry
                if (gender === 'male' || gender === 'female' || gender === 'ladies') {
                  // Don't modify the name, gender will be handled in notes
                }
              }

              jobTitle = await JobTitle.create({
                name: finalName,
                sectionId: defaultSection.id,
                isActive: true
              }, { transaction: t });

              results.jobTitlesCreated.push({
                id: jobTitle.id,
                name: jobTitle.name,
                section: defaultSection.name
              });

              jobTitleByName.set(jobTitle.name.toLowerCase().trim(), jobTitle);
            }

            if (!jobTitle) {
              results.errors.push({ 
                entry, 
                jobTitle: jtName,
                error: `Job title "${jtName}" not found and createJobTitles is disabled` 
              });
              continue;
            }

            // Check for existing matrix entry
            const existingMatrix = await JobTitlePPEMatrix.findOne({
              where: {
                jobTitleId: jobTitle.id,
                ppeItemId: ppeItem.id
              },
              transaction: t
            });

            if (existingMatrix) {
              if (updateExisting) {
                await existingMatrix.update({
                  quantityRequired: quantity,
                  replacementFrequency: frequency || ppeItem.replacementFrequency || 12,
                  isMandatory,
                  notes: specifications || existingMatrix.notes,
                  category: ppeItem.category
                }, { transaction: t });

                results.matrixUpdated.push({
                  id: existingMatrix.id,
                  jobTitle: jobTitle.name,
                  ppeItem: ppeItem.name,
                  quantity,
                  frequency
                });
              } else {
                results.matrixSkipped.push({
                  jobTitle: jobTitle.name,
                  ppeItem: ppeItem.name,
                  reason: 'Already exists'
                });
              }
              continue;
            }

            // Create new matrix entry
            const matrixEntry = await JobTitlePPEMatrix.create({
              jobTitleId: jobTitle.id,
              jobTitle: jobTitle.name,
              ppeItemId: ppeItem.id,
              quantityRequired: quantity,
              replacementFrequency: frequency || ppeItem.replacementFrequency || 12,
              isMandatory,
              category: ppeItem.category,
              notes: specifications || null,
              isActive: true
            }, { transaction: t });

            results.matrixCreated.push({
              id: matrixEntry.id,
              jobTitle: jobTitle.name,
              ppeItem: ppeItem.name,
              quantity,
              frequency
            });
          }
        } catch (entryError) {
          results.errors.push({ entry, error: entryError.message });
        }
      }

      await t.commit();

      res.status(201).json({
        success: true,
        message: `Bulk upload completed: ${results.matrixCreated.length} matrix entries created, ${results.matrixUpdated.length} updated, ${results.matrixSkipped.length} skipped. PPE items: ${results.ppeItemsCreated.length} created, ${results.ppeItemsUpdated.length} updated.`,
        data: results
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/matrix/bulk-upload-template
 * @desc    Get template data for bulk matrix upload (PPE items, sections, job titles)
 * @access  Private
 */
router.get('/bulk-upload-template', authenticate, async (req, res, next) => {
  try {
    // Get all PPE items
    const ppeItems = await PPEItem.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'itemCode', 'category', 'replacementFrequency', 'unit'],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    // Get all sections with departments
    const sections = await Section.findAll({
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });

    // Get all job titles
    const jobTitles = await JobTitle.findAll({
      include: [{ 
        model: Section, 
        as: 'section',
        include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }]
      }],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        ppeItems: ppeItems.map(p => ({
          id: p.id,
          name: p.name,
          itemCode: p.itemCode,
          category: p.category,
          replacementFrequency: p.replacementFrequency,
          unit: p.unit
        })),
        sections: sections.map(s => ({
          id: s.id,
          name: s.name,
          department: s.department?.name || 'Unknown'
        })),
        jobTitles: jobTitles.map(jt => ({
          id: jt.id,
          name: jt.name,
          section: jt.section?.name || 'Unknown',
          department: jt.section?.department?.name || 'Unknown'
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
