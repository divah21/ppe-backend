const { SizeScale, Size } = require('../models');

async function seedSizeScales() {
  try {
    console.log('Starting size scales and sizes seeding...');

    // Define size scales
    const scales = [
      {
        code: 'CLOTHING',
        name: 'Clothing Sizes',
        description: 'Standard clothing sizes including numeric and alphabetic',
        sizes: ['34', '36', '38', '40', '42', '44', '46', '48', '50', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
      },
      {
        code: 'FOOTWEAR',
        name: 'Footwear Sizes',
        description: 'Standard shoe/boot sizes',
        sizes: ['4', '5', '6', '7', '8', '9', '10', '11', '12']
      },
      {
        code: 'GLOVES',
        name: 'Glove Sizes',
        description: 'Standard glove sizes',
        sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
      },
      {
        code: 'STANDARD',
        name: 'Standard Size',
        description: 'One size fits all or no size variation',
        sizes: ['Standard', 'One Size', 'Universal']
      }
    ];

    for (const scaleData of scales) {
      // Check if scale exists
      let scale = await SizeScale.findOne({ where: { code: scaleData.code } });
      
      if (!scale) {
        // Create scale
        scale = await SizeScale.create({
          code: scaleData.code,
          name: scaleData.name,
          description: scaleData.description
        });
        console.log(`Created size scale: ${scaleData.code}`);
      } else {
        console.log(`Size scale already exists: ${scaleData.code}`);
      }

      // Add sizes for this scale
      for (const sizeValue of scaleData.sizes) {
        const existingSize = await Size.findOne({
          where: { scaleId: scale.id, value: sizeValue }
        });

        if (!existingSize) {
          await Size.create({
            scaleId: scale.id,
            value: sizeValue,
            displayOrder: scaleData.sizes.indexOf(sizeValue)
          });
          console.log(`  - Added size: ${sizeValue}`);
        }
      }
    }

    console.log('Size scales and sizes seeded successfully!');
  } catch (error) {
    console.error('Error seeding size scales:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedSizeScales()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed:', err);
      process.exit(1);
    });
}

module.exports = { seedSizeScales };
