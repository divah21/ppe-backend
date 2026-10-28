import { sequelize } from '../src/core/db';
import type { createFixtures } from './helpers';

type Fixtures = ReturnType<typeof createFixtures>;

/**
 * Catalogue rows for tests. Scale and item codes start with the fixture tag so cleanup() can
 * also remove rows the API created (sizes, stock) before the generic fixture cleanup runs.
 */
export const catalogueFixtures = (fx: Fixtures) => {
  const code = (suffix: string) => `${fx.tag}-${suffix}`.toUpperCase();

  const scale = async (suffix: string, values: string[], extra: Record<string, unknown> = {}) => {
    const row = await fx.make('SizeScale', { code: code(suffix), name: `${fx.tag} ${suffix}`, isActive: true, ...extra });
    for (const [i, value] of values.entries()) {
      await fx.make('Size', { scaleId: row.id, value, label: value, sortOrder: i + 1 });
    }
    return row;
  };

  const item = (suffix: string, extra: Record<string, unknown> = {}) =>
    fx.make('PPEItem', {
      name: `${fx.tag} ${suffix}`,
      itemCode: code(suffix),
      category: 'HANDS',
      itemType: 'PPE',
      replacementFrequency: 12,
      isMandatory: true,
      isActive: true,
      ...extra,
    });

  const stock = (ppeItemId: string, size: string | null, quantity: number, extra: Record<string, unknown> = {}) =>
    fx.make('Stock', { ppeItemId, size, quantity, location: `${fx.tag}-store`, ...extra });

  const cleanup = async () => {
    const p = { p: `${fx.tag}%` };
    await sequelize.query(
      `DELETE FROM stocks WHERE ppe_item_id IN (SELECT id FROM ppe_items WHERE item_code ILIKE :p)`,
      { replacements: p }
    );
    await sequelize.query(`DELETE FROM ppe_items WHERE item_code ILIKE :p`, { replacements: p });
    await sequelize.query(
      `DELETE FROM sizes WHERE scale_id IN (SELECT id FROM size_scales WHERE code ILIKE :p)`,
      { replacements: p }
    );
    await sequelize.query(`DELETE FROM size_scales WHERE code ILIKE :p`, { replacements: p });
    await fx.cleanup();
  };

  return { code, scale, item, stock, cleanup };
};
