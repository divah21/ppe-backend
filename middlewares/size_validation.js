const { Size, SizeScale } = require('../models');

/**
 * Validate that a provided size is acceptable for a given PPE item.
 * Rules:
 * - If item.hasSizeVariants is true: require item.sizeScale and size must exist in that scale.
 * - If item.hasSizeVariants is false: allow null/empty or 'Std' (case-insensitive); reject other values.
 * Returns: { valid: boolean, message?: string }
 */
async function validateRequestedSize(ppeItem, size) {
  const value = (size ?? '').toString().trim();

  if (ppeItem.hasSizeVariants) {
    if (!ppeItem.sizeScale) {
      return { valid: false, message: 'Item is sized but has no sizeScale configured' };
    }
    if (!value) {
      return { valid: false, message: 'Size is required for this item' };
    }

    const scale = await SizeScale.findOne({ where: { code: ppeItem.sizeScale } });
    if (!scale) {
      return { valid: false, message: `Unknown size scale: ${ppeItem.sizeScale}` };
    }

    const exists = await Size.findOne({ where: { scaleId: scale.id, value } });
    if (!exists) {
      return { valid: false, message: `Invalid size '${value}' for scale ${ppeItem.sizeScale}` };
    }
    return { valid: true };
  }

  // Non-sized items
  if (!value) return { valid: true };
  if (/^std$/i.test(value)) return { valid: true };
  return { valid: false, message: 'This item has no size variants; omit size or use "Std"' };
}

module.exports = { validateRequestedSize };
