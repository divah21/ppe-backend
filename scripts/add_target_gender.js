const { sequelize } = require('../database/db');
const PPEItem = require('../models/ppeItem');

async function addTargetGender() {
  try {
    // First create the ENUM type if it doesn't exist
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_ppe_items_target_gender" AS ENUM ('MALE', 'FEMALE', 'UNISEX');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Add the column if it doesn't exist
    await sequelize.query(`
      ALTER TABLE ppe_items 
      ADD COLUMN IF NOT EXISTS target_gender "enum_ppe_items_target_gender" DEFAULT 'UNISEX';
    `);
    
    console.log('Added target_gender column to ppe_items table');
    
    // Update Ladies' items to FEMALE
    const [results] = await sequelize.query(`
      UPDATE ppe_items 
      SET target_gender = 'FEMALE' 
      WHERE LOWER(name) LIKE '%ladies%' OR LOWER(name) LIKE '%lady%'
      RETURNING id, name;
    `);
    
    console.log(`Updated ${results.length} items to FEMALE:`, results.map(r => r.name));
    
    // Set all other items to UNISEX (if not already set)
    await sequelize.query(`
      UPDATE ppe_items 
      SET target_gender = 'UNISEX' 
      WHERE target_gender IS NULL;
    `);
    
    console.log('Set remaining items to UNISEX');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addTargetGender();
