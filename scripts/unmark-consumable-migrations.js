const { sequelize } = require('../database/db');
const names = [
  '20251218082737-create-consumable-item.js',
  '20251218082740-create-consumable-request.js',
  '20251218082743-create-consumable-request-item.js',
  '20251218082746-create-consumable-stock.js',
  '20251218082749-create-consumable-allocation.js'
];
(async () => {
  try {
    await sequelize.authenticate();
    const placeholders = names.map((_, i) => `$${i+1}`).join(',');
    const sql = `DELETE FROM "SequelizeMeta" WHERE name IN (${placeholders})`;
    await sequelize.query(sql, { bind: names });
    console.log('Unmarked consumable migrations from SequelizeMeta');
    process.exit(0);
  } catch (e) {
    console.error('Error unmarking migrations:', e.message || e);
    process.exit(2);
  }
})();
