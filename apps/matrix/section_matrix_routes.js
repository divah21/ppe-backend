const express = require('express');
const router = express.Router();
const { SectionPPEMatrix, Section, PPEItem, Department } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { Op } = require('sequelize');

/**
 * @route   GET /api/v1/section-matrix
 * @desc    Get all section PPE matrix entries
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { sectionId, departmentId, ppeItemId, page = 1, limit = 100 } = req.query;

    const where = { isActive: true };
    const sectionWhere = {};

    if (sectionId) where.sectionId = sectionId;
    if (ppeItemId) where.ppeItemId = ppeItemId;
    if (departmentId) sectionWhere.departmentId = departmentId;

    const offset = (page - 1) * limit;

    const { count, rows: matrixEntries } = await SectionPPEMatrix.findAndCountAll({
      where,
      include: [
        {
          model: Section,
          as: 'section',
          where: Object.keys(sectionWhere).length > 0 ? sectionWhere : undefined,
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name'] }
          ]
        },
        {
          model: PPEItem,
          as: 'ppeItem',
          attributes: ['id', 'name', 'itemCode', 'itemRefCode', 'category', 'unit', 'hasSizeVariants', 'hasColorVariants']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
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
 * @route   GET /api/v1/section-matrix/by-section/:sectionId
 * @desc    Get PPE requirements for a specific section
 * @access  Private
 */
router.get('/by-section/:sectionId', authenticate, async (req, res, next) => {
  try {
    const { sectionId } = req.params;

    const requirements = await SectionPPEMatrix.findAll({
      where: {
        sectionId,
        isActive: true
      },
      include: [{
        model: PPEItem,
        as: 'ppeItem',
        where: { isActive: true }
      }],
      order: [['createdAt', 'ASC']]
    });

    // Get section info
    const section = await Section.findByPk(sectionId, {
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }]
    });

    res.json({
      success: true,
      data: {
        section,
        requirements,
        totalItems: requirements.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/section-matrix/:id
 * @desc    Get single section matrix entry by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const matrixEntry = await SectionPPEMatrix.findByPk(req.params.id, {
      include: [
        {
          model: Section,
          as: 'section',
          include: [{ model: Department, as: 'department' }]
        },
        { model: PPEItem, as: 'ppeItem' }
      ]
    });

    if (!matrixEntry) {
      return res.status(404).json({
        success: false,
        message: 'Section matrix entry not found'
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
 * @route   POST /api/v1/section-matrix
 * @desc    Create a new section PPE matrix entry
 * @access  Private (Stores, Admin)
 */
router.post('/',
  authenticate,
  requireRole('stores', 'admin'),
  [
    body('sectionId').isUUID().withMessage('Valid section ID is required'),
    body('ppeItemId').isUUID().withMessage('Valid PPE item ID is required'),
    body('quantityRequired').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('replacementFrequency').optional().isInt({ min: 1 }).withMessage('Replacement frequency must be positive'),
    body('isMandatory').optional().isBoolean(),
    body('notes').optional().isString()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { sectionId, ppeItemId, quantityRequired, replacementFrequency, isMandatory, notes } = req.body;

      // Check if entry already exists
      const existing = await SectionPPEMatrix.findOne({
        where: { sectionId, ppeItemId }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'This PPE item is already configured for this section'
        });
      }

      // Verify section exists
      const section = await Section.findByPk(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }

      // Verify PPE item exists
      const ppeItem = await PPEItem.findByPk(ppeItemId);
      if (!ppeItem) {
        return res.status(404).json({
          success: false,
          message: 'PPE item not found'
        });
      }

      const matrixEntry = await SectionPPEMatrix.create({
        sectionId,
        ppeItemId,
        quantityRequired: quantityRequired || 1,
        replacementFrequency,
        isMandatory: isMandatory !== false,
        notes
      });

      // Fetch with associations
      const created = await SectionPPEMatrix.findByPk(matrixEntry.id, {
        include: [
          { model: Section, as: 'section', include: [{ model: Department, as: 'department' }] },
          { model: PPEItem, as: 'ppeItem' }
        ]
      });

      res.status(201).json({
        success: true,
        data: created,
        message: 'Section PPE requirement added successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/section-matrix/bulk
 * @desc    Create multiple section PPE matrix entries at once
 * @access  Private (Stores, Admin)
 */
router.post('/bulk',
  authenticate,
  requireRole('stores', 'admin'),
  [
    body('sectionId').isUUID().withMessage('Valid section ID is required'),
    body('ppeItemIds').isArray({ min: 1 }).withMessage('At least one PPE item ID is required'),
    body('ppeItemIds.*').isUUID().withMessage('All PPE item IDs must be valid UUIDs')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { sectionId, ppeItemIds, quantityRequired = 1, replacementFrequency, isMandatory = true } = req.body;

      // Verify section exists
      const section = await Section.findByPk(sectionId);
      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }

      // Get existing entries for this section
      const existing = await SectionPPEMatrix.findAll({
        where: { sectionId, ppeItemId: { [Op.in]: ppeItemIds } }
      });
      const existingPpeIds = new Set(existing.map(e => e.ppeItemId));

      // Filter out already existing items
      const newPpeItemIds = ppeItemIds.filter(id => !existingPpeIds.has(id));

      if (newPpeItemIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'All specified PPE items are already configured for this section'
        });
      }

      // Create new entries
      const entries = await SectionPPEMatrix.bulkCreate(
        newPpeItemIds.map(ppeItemId => ({
          sectionId,
          ppeItemId,
          quantityRequired,
          replacementFrequency,
          isMandatory
        }))
      );

      res.status(201).json({
        success: true,
        data: entries,
        message: `Added ${entries.length} PPE requirements to section`,
        skipped: ppeItemIds.length - newPpeItemIds.length
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/section-matrix/:id
 * @desc    Update a section PPE matrix entry
 * @access  Private (Stores, Admin)
 */
router.put('/:id',
  authenticate,
  requireRole('stores', 'admin'),
  [
    param('id').isUUID().withMessage('Valid ID is required'),
    body('sectionId').optional().isUUID().withMessage('Valid section ID is required'),
    body('ppeItemId').optional().isUUID().withMessage('Valid PPE item ID is required'),
    body('quantityRequired').optional().isInt({ min: 1 }),
    body('replacementFrequency').optional().isInt({ min: 1 }),
    body('isMandatory').optional().isBoolean(),
    body('notes').optional().isString(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  async (req, res, next) => {
    try {
      const matrixEntry = await SectionPPEMatrix.findByPk(req.params.id);

      if (!matrixEntry) {
        return res.status(404).json({
          success: false,
          message: 'Section matrix entry not found'
        });
      }

      const { sectionId, ppeItemId, quantityRequired, replacementFrequency, isMandatory, notes, isActive } = req.body;

      await matrixEntry.update({
        sectionId: sectionId ?? matrixEntry.sectionId,
        ppeItemId: ppeItemId ?? matrixEntry.ppeItemId,
        quantityRequired: quantityRequired ?? matrixEntry.quantityRequired,
        replacementFrequency: replacementFrequency ?? matrixEntry.replacementFrequency,
        isMandatory: isMandatory ?? matrixEntry.isMandatory,
        notes: notes ?? matrixEntry.notes,
        isActive: isActive ?? matrixEntry.isActive
      });

      // Fetch with associations
      const updated = await SectionPPEMatrix.findByPk(matrixEntry.id, {
        include: [
          { model: Section, as: 'section', include: [{ model: Department, as: 'department' }] },
          { model: PPEItem, as: 'ppeItem' }
        ]
      });

      res.json({
        success: true,
        data: updated,
        message: 'Section PPE requirement updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/section-matrix/:id
 * @desc    Delete a section PPE matrix entry
 * @access  Private (Stores, Admin)
 */
router.delete('/:id',
  authenticate,
  requireRole('stores', 'admin'),
  async (req, res, next) => {
    try {
      const matrixEntry = await SectionPPEMatrix.findByPk(req.params.id);

      if (!matrixEntry) {
        return res.status(404).json({
          success: false,
          message: 'Section matrix entry not found'
        });
      }

      await matrixEntry.destroy();

      res.json({
        success: true,
        message: 'Section PPE requirement deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/section-matrix/by-section/:sectionId
 * @desc    Delete all PPE requirements for a section
 * @access  Private (Stores, Admin)
 */
router.delete('/by-section/:sectionId',
  authenticate,
  requireRole('stores', 'admin'),
  async (req, res, next) => {
    try {
      const { sectionId } = req.params;

      const deleted = await SectionPPEMatrix.destroy({
        where: { sectionId }
      });

      res.json({
        success: true,
        message: `Deleted ${deleted} PPE requirements from section`
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
