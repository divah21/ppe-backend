const { sequelize } = require('../database/db');
const tables = [
  'consumable_items',
  'consumable_stocks',
  'consumable_requests',
  'consumable_request_items',
  'consumable_allocations'
];

(async () => {
  try {
    await sequelize.authenticate();
    const qi = sequelize.getQueryInterface();
    const existing = await qi.showAllTables();
    console.log('Existing tables count:', existing.length);
    for (const t of tables) {
      const found = existing.includes(t) || existing.includes(t.toLowerCase()) || existing.includes(t.toUpperCase());
      console.log(t, found ? 'FOUND' : 'MISSING');
    }
    process.exit(0);
  } catch (e) {
    console.error('Error checking tables:', e.message || e);
    process.exit(2);
  }
})();
