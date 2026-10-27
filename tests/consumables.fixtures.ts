import { models, sequelize } from '../src/core/db';

/**
 * Consumable rows made by the tests or by the API under test. Items carry the fixture tag
 * in their product code and requests belong to the fixture sections, so both are found by tag.
 */
export const consumableFixtures = (tag: string) => {
  const item = (code: string, values: Record<string, unknown> = {}) =>
    models.ConsumableItem.create({
      productCode: `${tag}-${code}`,
      description: `${tag} ${code}`,
      category: 'CONS',
      unit: 'EA',
      unitPriceUSD: 2.5,
      ...values,
    });

  const stock = (consumableItemId: string, quantity: number, values: Record<string, unknown> = {}) =>
    models.ConsumableStock.create({ consumableItemId, quantity, unitPriceUSD: 2.5, ...values });

  const quantityOf = async (stockId: string) => Number((await models.ConsumableStock.findByPk(stockId))!.quantity);

  const cleanup = async () => {
    const replacements = { p: `${tag}%` };
    const requests = `SELECT r.id FROM consumable_requests r JOIN sections s ON s.id = r.section_id WHERE s.name LIKE :p`;
    const items = `SELECT id FROM consumable_items WHERE product_code LIKE :p`;
    await sequelize.query(
      `DELETE FROM consumable_allocations WHERE consumable_request_id IN (${requests}) OR consumable_item_id IN (${items})`,
      { replacements }
    );
    await sequelize.query(
      `DELETE FROM consumable_request_items WHERE consumable_request_id IN (${requests}) OR consumable_item_id IN (${items})`,
      { replacements }
    );
    await sequelize.query(`DELETE FROM consumable_requests WHERE id IN (${requests})`, { replacements });
    await sequelize.query(`DELETE FROM consumable_stocks WHERE consumable_item_id IN (${items})`, { replacements });
    await sequelize.query(`DELETE FROM consumable_items WHERE product_code LIKE :p`, { replacements });
  };

  return { item, stock, quantityOf, cleanup };
};
