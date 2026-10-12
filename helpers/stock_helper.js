const { sequelize } = require('../database/db');
const { Stock } = require('../models');

/**
 * Atomically changes a stock quantity by `delta` (negative to issue, positive
 * to receive). The update only applies if the result stays >= 0, so concurrent
 * issues cannot oversell. Returns the new quantity, or null when it would go
 * negative or the row does not exist.
 */
const adjustStock = async (stockId, delta, { transaction } = {}) => {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new RangeError(`Invalid stock adjustment: ${delta}`);
  }
  const q = (name) => sequelize.getQueryInterface().quoteIdentifier(name);
  const table = q(Stock.getTableName());
  const quantity = q(Stock.rawAttributes.quantity.field);
  const updatedAt = q(Stock.rawAttributes.updatedAt.field);
  const id = q(Stock.rawAttributes.id.field);

  const [rows] = await sequelize.query(
    `UPDATE ${table} SET ${quantity} = ${quantity} + :delta, ${updatedAt} = NOW()
     WHERE ${id} = :stockId AND ${quantity} + :delta >= 0
     RETURNING ${quantity} AS quantity`,
    { replacements: { stockId, delta }, transaction }
  );
  return rows.length ? rows[0].quantity : null;
};

module.exports = { adjustStock };
