const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth_middleware');
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

module.exports = router;
