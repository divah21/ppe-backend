const { SizeScale, Size } = require('../models');
const { sequelize } = require('../database/db');

async function seedClothingScale() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Check if CLOTHING scale already exists
    const existing = await SizeScale.findOne({ where: { code: 'CLOTHING' } });
    if (existing) {
      console.log('CLOTHING scale already exists with id:', existing.id);
      
      // Check sizes
      const sizes = await Size.findAll({ where: { scaleId: existing.id } });
      console.log('Existing sizes:', sizes.map(s => s.value).join(', '));
      return;
    }

    // Create the CLOTHING size scale
    const scale = await SizeScale.create({
      code: 'CLOTHING',
      name: 'Clothing (34-50)',
      categoryGroup: 'BODY/TORSO',
      description: 'General clothing sizing for worksuits, jackets, overalls, etc.'
    });
    console.log('Created CLOTHING scale with id:', scale.id);

    // Add sizes
    const sizeValues = ['34', '36', '38', '40', '42', '44', '46', '48', '50', 'Std'];
    for (let i = 0; i < sizeValues.length; i++) {
      await Size.create({
        scaleId: scale.id,
        value: sizeValues[i],
        label: sizeValues[i] === 'Std' ? 'Standard' : sizeValues[i],
        sortOrder: i + 1
      });
    }
    console.log('Created', sizeValues.length, 'sizes for CLOTHING scale');
    console.log('Done!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

seedClothingScale();
