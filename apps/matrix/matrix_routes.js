const express = require('express');
const router = express.Router();
const { JobTitlePPEMatrix, PPEItem, Employee } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { Op } = require('sequelize');

/**
 * @route   GET /api/v1/matrix
 * @desc    Get all job title PPE matrix entries
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { jobTitle, category, ppeItemId, page = 1, limit = 100 } = req.query;

    const where = {};
    if (jobTitle) where.jobTitle = { [Op.iLike]: `%${jobTitle}%` };
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
 * @access  Private (Admin, SHEQ)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin', 'sheq'),
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
 * @access  Private (Admin, SHEQ)
 */
router.post(
  '/bulk',
  authenticate,
  requireRole('admin', 'sheq'),
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

      const createdEntries = [];
      const errors = [];

      for (const entry of entries) {
        try {
          // Check if PPE item exists
          const ppeItem = await PPEItem.findByPk(entry.ppeItemId);
          if (!ppeItem) {
            errors.push({
              jobTitle: entry.jobTitle,
              ppeItemId: entry.ppeItemId,
              error: 'PPE item not found'
            });
            continue;
          }

          // Check if entry already exists
          const existing = await JobTitlePPEMatrix.findOne({
            where: {
              jobTitle: entry.jobTitle,
              ppeItemId: entry.ppeItemId
            }
          });

          if (existing) {
            errors.push({
              jobTitle: entry.jobTitle,
              ppeItemId: entry.ppeItemId,
              error: 'Entry already exists'
            });
            continue;
          }

          const matrixEntry = await JobTitlePPEMatrix.create({
            jobTitle: entry.jobTitle,
            ppeItemId: entry.ppeItemId,
            quantityRequired: entry.quantityRequired,
            replacementFrequency: entry.replacementFrequency,
            heavyUseFrequency: entry.heavyUseFrequency,
            category: entry.category || ppeItem.category,
            isMandatory: entry.isMandatory !== undefined ? entry.isMandatory : true,
            notes: entry.notes
          });

          createdEntries.push(matrixEntry);
        } catch (err) {
          errors.push({
            jobTitle: entry.jobTitle,
            ppeItemId: entry.ppeItemId,
            error: err.message
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `Created ${createdEntries.length} entries${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
        data: {
          created: createdEntries.length,
          failed: errors.length,
          entries: createdEntries,
          errors
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/matrix/:id
 * @desc    Update job title PPE matrix entry
 * @access  Private (Admin, SHEQ)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin', 'sheq'),
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
 * @access  Private (Admin, SHEQ)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin', 'sheq'),
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

module.exports = router;
