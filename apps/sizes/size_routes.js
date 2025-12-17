const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth_middleware');
const { requireRole } = require('../../middlewares/role_middleware');
const { auditLog } = require('../../middlewares/audit_middleware');
const { body, param } = require('express-validator');
const { validate } = require('../../middlewares/validation_middleware');
const { SizeScale, Size, PPEItem } = require('../../models');

/**
 * @route   GET /api/v1/sizes/scales
 * @desc    List all size scales
 * @access  Private
 */
router.get('/scales', authenticate, async (req, res, next) => {
  try {
    const scales = await SizeScale.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: scales });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/v1/sizes/:scaleCode
 * @desc    List sizes for a given scale code
 * @access  Private
 */
router.get('/:scaleCode', authenticate, async (req, res, next) => {
  try {
    const scale = await SizeScale.findOne({ where: { code: req.params.scaleCode } });
    if (!scale) {
      return res.status(404).json({ success: false, message: 'Size scale not found' });
    }
    const sizes = await Size.findAll({ where: { scaleId: scale.id }, order: [['sortOrder', 'ASC'], ['value', 'ASC']] });
    res.json({ success: true, data: { scale, sizes } });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/v1/sizes/for-item/:ppeItemId
 * @desc    List sizes applicable to a given PPE item
 * @access  Private
 */
router.get('/for-item/:ppeItemId', authenticate, async (req, res, next) => {
  try {
    const item = await PPEItem.findByPk(req.params.ppeItemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'PPE item not found' });
    }
    if (!item.hasSizeVariants || !item.sizeScale) {
      return res.json({ success: true, data: { scale: null, sizes: [{ value: 'Std', label: 'Std' }] } });
    }
    const scale = await SizeScale.findOne({ where: { code: item.sizeScale } });
    if (!scale) {
      return res.status(400).json({ success: false, message: `Item references unknown size scale: ${item.sizeScale}` });
    }
    const sizes = await Size.findAll({ where: { scaleId: scale.id }, order: [['sortOrder', 'ASC'], ['value', 'ASC']] });
    res.json({ success: true, data: { scale, sizes } });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/v1/sizes/scales
 * @desc    Create a new size scale
 * @access  Private (Admin, Stores)
 */
router.post(
  '/scales',
  authenticate,
  requireRole('admin', 'stores'),
  [
    body('code').trim().notEmpty().withMessage('Code is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').optional().trim()
  ],
  validate,
  auditLog('CREATE', 'SizeScale'),
  async (req, res, next) => {
    try {
      const { code, name, description } = req.body;

      // Check if code exists
      const existing = await SizeScale.findOne({ where: { code } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Size scale code already exists'
        });
      }

      const scale = await SizeScale.create({ code, name, description });
      res.status(201).json({ success: true, data: scale });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   PUT /api/v1/sizes/scales/:id
 * @desc    Update a size scale
 * @access  Private (Admin, Stores)
 */
router.put(
  '/scales/:id',
  authenticate,
  requireRole('admin', 'stores'),
  [
    param('id').isUUID().withMessage('Invalid size scale ID'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional().trim()
  ],
  validate,
  auditLog('UPDATE', 'SizeScale'),
  async (req, res, next) => {
    try {
      const scale = await SizeScale.findByPk(req.params.id);
      if (!scale) {
        return res.status(404).json({ success: false, message: 'Size scale not found' });
      }

      await scale.update(req.body);
      res.json({ success: true, data: scale });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   DELETE /api/v1/sizes/scales/:id
 * @desc    Delete a size scale
 * @access  Private (Admin)
 */
router.delete(
  '/scales/:id',
  authenticate,
  requireRole('admin'),
  auditLog('DELETE', 'SizeScale'),
  async (req, res, next) => {
    try {
      const scale = await SizeScale.findByPk(req.params.id);
      if (!scale) {
        return res.status(404).json({ success: false, message: 'Size scale not found' });
      }

      // Check if any PPE items use this scale
      const itemsUsingScale = await PPEItem.count({ where: { sizeScale: scale.code } });
      if (itemsUsingScale > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete size scale. ${itemsUsingScale} PPE item(s) are using it.`
        });
      }

      await scale.destroy();
      res.json({ success: true, message: 'Size scale deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   POST /api/v1/sizes/:scaleId/sizes
 * @desc    Add a size to a scale
 * @access  Private (Admin, Stores)
 */
router.post(
  '/:scaleId/sizes',
  authenticate,
  requireRole('admin', 'stores'),
  [
    param('scaleId').isUUID().withMessage('Invalid scale ID'),
    body('value').trim().notEmpty().withMessage('Size value is required'),
    body('displayOrder').optional().isInt().withMessage('Display order must be an integer')
  ],
  validate,
  auditLog('CREATE', 'Size'),
  async (req, res, next) => {
    try {
      const scale = await SizeScale.findByPk(req.params.scaleId);
      if (!scale) {
        return res.status(404).json({ success: false, message: 'Size scale not found' });
      }

      const { value, displayOrder } = req.body;

      // Check if size value already exists in this scale
      const existing = await Size.findOne({ where: { scaleId: scale.id, value } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Size value already exists in this scale'
        });
      }

      const size = await Size.create({
        scaleId: scale.id,
        value,
        displayOrder: displayOrder || 0
      });

      res.status(201).json({ success: true, data: size });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   PUT /api/v1/sizes/size/:id
 * @desc    Update a size
 * @access  Private (Admin, Stores)
 */
router.put(
  '/size/:id',
  authenticate,
  requireRole('admin', 'stores'),
  [
    param('id').isUUID().withMessage('Invalid size ID'),
    body('value').optional().trim().notEmpty().withMessage('Size value cannot be empty'),
    body('displayOrder').optional().isInt().withMessage('Display order must be an integer')
  ],
  validate,
  auditLog('UPDATE', 'Size'),
  async (req, res, next) => {
    try {
      const size = await Size.findByPk(req.params.id);
      if (!size) {
        return res.status(404).json({ success: false, message: 'Size not found' });
      }

      await size.update(req.body);
      res.json({ success: true, data: size });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   DELETE /api/v1/sizes/size/:id
 * @desc    Delete a size
 * @access  Private (Admin)
 */
router.delete(
  '/size/:id',
  authenticate,
  requireRole('admin'),
  auditLog('DELETE', 'Size'),
  async (req, res, next) => {
    try {
      const size = await Size.findByPk(req.params.id);
      if (!size) {
        return res.status(404).json({ success: false, message: 'Size not found' });
      }

      await size.destroy();
      res.json({ success: true, message: 'Size deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   POST /api/v1/sizes/bulk-upload
 * @desc    Bulk upload size scales with their sizes
 * @access  Private (Admin, Stores)
 */
router.post(
  '/bulk-upload',
  authenticate,
  requireRole('admin', 'stores'),
  [
    body('scales').isArray({ min: 1 }).withMessage('Scales array is required'),
    body('scales.*.code').trim().notEmpty().withMessage('Scale code is required'),
    body('scales.*.name').trim().notEmpty().withMessage('Scale name is required'),
    body('scales.*.sizes').isArray().withMessage('Sizes array is required for each scale'),
    body('scales.*.sizes.*.value').trim().notEmpty().withMessage('Size value is required')
  ],
  validate,
  auditLog('BULK_UPLOAD', 'SizeScale'),
  async (req, res, next) => {
    try {
      const { scales, updateExisting = false } = req.body;
      const results = {
        created: [],
        updated: [],
        skipped: [],
        errors: []
      };

      for (const scaleData of scales) {
        try {
          const { code, name, categoryGroup, description, sizes } = scaleData;

          // Check if scale exists
          let scale = await SizeScale.findOne({ where: { code } });
          
          if (scale) {
            if (updateExisting) {
              await scale.update({ name, categoryGroup, description });
              results.updated.push({ code, name, sizesCount: sizes?.length || 0 });
            } else {
              results.skipped.push({ code, name, reason: 'Scale already exists' });
              continue;
            }
          } else {
            scale = await SizeScale.create({ code, name, categoryGroup, description });
            results.created.push({ code, name, sizesCount: sizes?.length || 0 });
          }

          // Process sizes for this scale
          if (sizes && sizes.length > 0) {
            for (let i = 0; i < sizes.length; i++) {
              const sizeData = sizes[i];
              const { value, label, euSize, usSize, ukSize, meta } = sizeData;

              // Check if size already exists in this scale
              const existingSize = await Size.findOne({ 
                where: { scaleId: scale.id, value } 
              });

              if (existingSize) {
                if (updateExisting) {
                  await existingSize.update({ 
                    label: label || value, 
                    sortOrder: i,
                    euSize,
                    usSize,
                    ukSize,
                    meta
                  });
                }
              } else {
                await Size.create({
                  scaleId: scale.id,
                  value,
                  label: label || value,
                  sortOrder: i,
                  euSize,
                  usSize,
                  ukSize,
                  meta
                });
              }
            }
          }
        } catch (err) {
          results.errors.push({
            code: scaleData.code,
            name: scaleData.name,
            error: err.message
          });
        }
      }

      const totalProcessed = results.created.length + results.updated.length + results.skipped.length;
      res.json({
        success: true,
        message: `Processed ${totalProcessed} scales: ${results.created.length} created, ${results.updated.length} updated, ${results.skipped.length} skipped, ${results.errors.length} errors`,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   GET /api/v1/sizes/scales/with-sizes
 * @desc    Get all size scales with their sizes
 * @access  Private
 */
router.get('/scales/with-sizes', authenticate, async (req, res, next) => {
  try {
    const scales = await SizeScale.findAll({
      order: [['name', 'ASC']],
      include: [{
        model: Size,
        as: 'sizes',
        order: [['sortOrder', 'ASC'], ['value', 'ASC']]
      }]
    });
    res.json({ success: true, data: scales });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
