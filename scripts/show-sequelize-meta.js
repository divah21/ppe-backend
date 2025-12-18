const { sequelize } = require('../database/db');
(async () => {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query('SELECT * FROM "SequelizeMeta" ORDER BY name');
    console.log('SequelizeMeta entries:', results.length);
    results.forEach(r => console.log(r.name));
    process.exit(0);
  } catch (e) {
    console.error('Error querying SequelizeMeta:', e.message || e);
    process.exit(2);
  }
})();
