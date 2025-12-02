const { sequelize } = require('./db');

(async () => {
  try {
    await sequelize.authenticate();
    const [cols] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='employees' 
      ORDER BY ordinal_position
    `);
    console.log('Employee table columns:');
    cols.forEach(c => console.log('  -', c.column_name));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
