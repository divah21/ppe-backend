const { sequelize } = require('../database/db');
const { Stock } = require('../models');

const q = (name) => sequelize.getQueryInterface().quoteIdentifier(name);
const TABLE = q(Stock.getTableName());
const QUANTITY = q(Stock.rawAttributes.quantity.field);
const UPDATED_AT = q(Stock.rawAttributes.updatedAt.field);
const ID = q(Stock.rawAttributes.id.field);

const assertPositiveInt = (quantity) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError(`Invalid stock quantity: ${quantity}`);
  }
};

// Applies the change only if the result stays >= 0, so concurrent issues cannot oversell.
const applyDelta = async (stockId, delta, transaction) => {
  const [rows] = await sequelize.query(
    `UPDATE ${TABLE} SET ${QUANTITY} = ${QUANTITY} + :delta, ${UPDATED_AT} = NOW()
     WHERE ${ID} = :stockId AND ${QUANTITY} + :delta >= 0
     RETURNING ${QUANTITY} AS quantity`,
    { replacements: { stockId, delta }, transaction }
  );
  return rows.length ? rows[0].quantity : null;
};

/** Issues stock. Returns the new quantity, or null if there is not enough. */
const deductStock = (stockId, quantity, { transaction } = {}) => {
  assertPositiveInt(quantity);
  return applyDelta(stockId, -quantity, transaction);
};

/** Receives stock. Returns the new quantity, or null if the row is missing (or negative beyond repair by this amount). */
const restoreStock = (stockId, quantity, { transaction } = {}) => {
  assertPositiveInt(quantity);
  return applyDelta(stockId, quantity, transaction);
};

module.exports = { deductStock, restoreStock };
