const { sequelize } = require('../database/db');

const assertPositiveInt = (quantity) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError(`Invalid stock quantity: ${quantity}`);
  }
};

/**
 * Atomically deducts stock only when enough is left, so concurrent issues
 * cannot oversell. Returns the new quantity, or null when stock is insufficient.
 */
const deductStock = async (stockId, quantity, { transaction } = {}) => {
  assertPositiveInt(quantity);
  const [rows] = await sequelize.query(
    `UPDATE stocks SET quantity = quantity - :quantity, updated_at = NOW()
     WHERE id = :stockId AND quantity >= :quantity
     RETURNING quantity`,
    { replacements: { stockId, quantity }, transaction }
  );
  return rows.length ? rows[0].quantity : null;
};

/**
 * Atomically returns stock. Returns the new quantity, or null if the row is gone.
 */
const restoreStock = async (stockId, quantity, { transaction } = {}) => {
  assertPositiveInt(quantity);
  const [rows] = await sequelize.query(
    `UPDATE stocks SET quantity = quantity + :quantity, updated_at = NOW()
     WHERE id = :stockId
     RETURNING quantity`,
    { replacements: { stockId, quantity }, transaction }
  );
  return rows.length ? rows[0].quantity : null;
};

module.exports = { deductStock, restoreStock };
