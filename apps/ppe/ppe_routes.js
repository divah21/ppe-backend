const express = require('express');
const router = express.Router();
const { PPEItem, Stock } = require('../../models');
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { Op } = require('sequelize');

/**
 * @route   GET /api/v1/ppe
 * @desc    Get all PPE items
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { category, isMandatory, search, page = 1, limit = 50 } = req.query;

    const where = {};
    
    if (category) where.category = category;
    if (isMandatory !== undefined) where.isMandatory = isMandatory === 'true';
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { itemCode: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: ppeItems } = await PPEItem.findAndCountAll({
      where,
      include: [{
        model: Stock,
        as: 'stocks',
        required: false
      }],
      limit: parseInt(limit),
      offset,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: ppeItems,
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
 * @route   GET /api/v1/ppe/:id
 * @desc    Get PPE item by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const ppeItem = await PPEItem.findByPk(req.params.id, {
      include: [{
        model: Stock,
        as: 'stocks'
      }]
    });

    if (!ppeItem) {
      return res.status(404).json({
        success: false,
        message: 'PPE item not found'
      });
    }

    res.json({
      success: true,
      data: ppeItem
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/ppe
 * @desc    Create new PPE item
 * @access  Private (Admin, Stores)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin', 'stores'),
  [
    body('name').trim().notEmpty().withMessage('PPE name is required'),
    body('itemCode').trim().notEmpty().withMessage('Item code is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('replacementFrequency').isInt({ min: 1 }).withMessage('Replacement frequency must be at least 1 month'),
    body('isMandatory').isBoolean().withMessage('isMandatory must be a boolean'),
    body('description').optional().trim(),
    body('specifications').optional().trim(),
    body('hasSizeVariants').optional().isBoolean().withMessage('hasSizeVariants must be a boolean'),
    body('hasColorVariants').optional().isBoolean().withMessage('hasColorVariants must be a boolean'),
    body('sizeScale').optional().trim(),
    body('availableSizes').optional().isArray().withMessage('availableSizes must be an array')
  ],
  validate,
  auditLog('CREATE', 'PPEItem'),
  async (req, res, next) => {
    try {
      const {
        name,
        itemCode,
        category,
        replacementFrequency,
        isMandatory,
        description,
        specifications,
        hasSizeVariants,
        hasColorVariants,
        sizeScale,
        availableSizes
      } = req.body;

      // Check if item code exists
      const existing = await PPEItem.findOne({ where: { itemCode } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Item code already exists'
        });
      }

      const ppeItem = await PPEItem.create({
        name,
        itemCode,
        category,
        replacementFrequency,
        isMandatory,
        description,
        specifications,
        hasSizeVariants: hasSizeVariants || false,
        hasColorVariants: hasColorVariants || false,
        sizeScale: sizeScale || null,
        availableSizes: availableSizes || null
      });

      res.status(201).json({
        success: true,
        message: 'PPE item created successfully',
        data: ppeItem
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/ppe/:id
 * @desc    Update PPE item
 * @access  Private (Admin, Stores)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin', 'stores'),
  [
    param('id').isUUID().withMessage('Invalid PPE item ID'),
    body('name').optional().trim().notEmpty().withMessage('PPE name cannot be empty'),
    body('itemCode').optional().trim().notEmpty().withMessage('Item code cannot be empty'),
    body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
    body('replacementFrequency').optional().isInt({ min: 1 }).withMessage('Replacement frequency must be at least 1 month'),
    body('isMandatory').optional().isBoolean().withMessage('isMandatory must be a boolean'),
    body('description').optional().trim(),
    body('specifications').optional().trim(),
    body('hasSizeVariants').optional().isBoolean().withMessage('hasSizeVariants must be a boolean'),
    body('hasColorVariants').optional().isBoolean().withMessage('hasColorVariants must be a boolean'),
    body('sizeScale').optional().trim(),
    body('availableSizes').optional().isArray().withMessage('availableSizes must be an array')
  ],
  validate,
  auditLog('UPDATE', 'PPEItem'),
  async (req, res, next) => {
    try {
      const ppeItem = await PPEItem.findByPk(req.params.id);

      if (!ppeItem) {
        return res.status(404).json({
          success: false,
          message: 'PPE item not found'
        });
      }

      // Check if item code is being changed and already exists
      if (req.body.itemCode && req.body.itemCode !== ppeItem.itemCode) {
        const existing = await PPEItem.findOne({ where: { itemCode: req.body.itemCode } });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Item code already exists'
          });
        }
      }

      await ppeItem.update(req.body);

      res.json({
        success: true,
        message: 'PPE item updated successfully',
        data: ppeItem
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/ppe/:id
 * @desc    Delete PPE item
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin','stores'),
  auditLog('DELETE', 'PPEItem'),
  async (req, res, next) => {
    try {
      const ppeItem = await PPEItem.findByPk(req.params.id);

      if (!ppeItem) {
        return res.status(404).json({
          success: false,
          message: 'PPE item not found'
        });
      }

      // Check if PPE item has stock or allocations
      const stock = await Stock.findOne({ where: { ppeItemId: ppeItem.id } });
      if (stock && stock.quantity > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete PPE item with existing stock. Clear stock first.'
        });
      }

      await ppeItem.destroy();

      res.json({
        success: true,
        message: 'PPE item deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/ppe/bulk-upload
 * @desc    Bulk upload PPE items from Excel data
 * @access  Private (Admin, Stores)
 */
router.post(
  '/bulk-upload',
  authenticate,
  requireRole('admin', 'stores'),
  [
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.name').trim().notEmpty().withMessage('PPE name is required'),
    body('items.*.itemCode').trim().notEmpty().withMessage('Item code is required'),
    body('items.*.category').trim().notEmpty().withMessage('Category is required'),
  ],
  validate,
  auditLog('BULK_CREATE', 'PPEItem'),
  async (req, res, next) => {
    try {
      const { items, updateExisting = false } = req.body;

      const results = {
        created: [],
        updated: [],
        skipped: [],
        errors: []
      };

      for (const item of items) {
        try {
          // Check if item code already exists
          const existing = await PPEItem.findOne({ where: { itemCode: item.itemCode } });

          if (existing) {
            if (updateExisting) {
              // Update existing item
              await existing.update({
                name: item.name || existing.name,
                category: item.category || existing.category,
                replacementFrequency: item.replacementFrequency || existing.replacementFrequency,
                heavyUseFrequency: item.heavyUseFrequency || existing.heavyUseFrequency,
                isMandatory: item.isMandatory !== undefined ? item.isMandatory : existing.isMandatory,
                description: item.description || existing.description,
                hasSizeVariants: item.hasSizeVariants !== undefined ? item.hasSizeVariants : existing.hasSizeVariants,
                hasColorVariants: item.hasColorVariants !== undefined ? item.hasColorVariants : existing.hasColorVariants,
                sizeScale: item.sizeScale || existing.sizeScale,
                availableSizes: item.availableSizes || existing.availableSizes,
                unit: item.unit || existing.unit
              });
              results.updated.push({ itemCode: item.itemCode, name: item.name });
            } else {
              results.skipped.push({ itemCode: item.itemCode, name: item.name, reason: 'Item code already exists' });
            }
          } else {
            // Create new item
            const newItem = await PPEItem.create({
              name: item.name,
              itemCode: item.itemCode,
              category: item.category,
              replacementFrequency: item.replacementFrequency || 12, // Default 12 months
              heavyUseFrequency: item.heavyUseFrequency || null,
              isMandatory: item.isMandatory !== undefined ? item.isMandatory : true,
              description: item.description || null,
              hasSizeVariants: item.hasSizeVariants || false,
              hasColorVariants: item.hasColorVariants || false,
              sizeScale: item.sizeScale || null,
              availableSizes: item.availableSizes || null,
              unit: item.unit || 'EA',
              isActive: true
            });
            results.created.push({ id: newItem.id, itemCode: newItem.itemCode, name: newItem.name });
          }
        } catch (err) {
          results.errors.push({ 
            itemCode: item.itemCode, 
            name: item.name, 
            error: err.message 
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `Bulk upload completed: ${results.created.length} created, ${results.updated.length} updated, ${results.skipped.length} skipped, ${results.errors.length} errors`,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/ppe/categories/list
 * @desc    Get all PPE categories with item counts
 * @access  Private
 */
router.get('/categories/list', authenticate, async (req, res, next) => {
  try {
    const categories = await PPEItem.findAll({
      attributes: [
        'category',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['category'],
      order: [['category', 'ASC']]
    });

    res.json({
      success: true,
      data: categories.map(c => ({
        name: c.category,
        count: parseInt(c.get('count'))
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
