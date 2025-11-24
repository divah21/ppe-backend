/**
 * PPE Items Seed Data Script
 * This script populates the database with PPE items from the inventory list
 * 
 * Run with: node database/seedPPEItems.js
 */

const { PPEItem } = require('../models');
const { sequelize } = require('./db');

/**
 * PPE Items from inventory data
 * Format: ITMREF_0, ITMDES1_0, Product Name, Category, Acc Code, DES_0
 */
const ppeInventoryData = [
  { itemRefCode: 'SS053926002', productName: 'REUSABLES EARPLUGS (MINIMUM 33DBA NOISE REDUCTION FACTOR)', name: 'EARPLUGS', category: 'EARS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS054015001', productName: 'PVC APRON', name: 'PVC APRON', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS054015002', productName: 'LEATHER APRON', name: 'LEATHER APRON', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS054015003', productName: 'LEATHER SPATS', name: 'LEATHER SPATS', category: 'LEGS/LOWER/KNEES', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS054015004', productName: 'CHEFS JACKET COTTON D/BREASTED ANTI-RUB N/COLAR', name: 'CHEF\'S JACKET', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS054015007', productName: 'CHEF\'S NEKERCHIEF (POLYESTER, BREATHABLE)', name: 'NECKERCHIEF', category: 'NECK', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS054015008', productName: 'OVEN GLOVES (TEFLON/KEVLAR/META ARAMID FIBRE/NOMEX FIBRE, 250 DEG CELCIUS OR BET', name: 'OVEN GLOVES', category: 'HANDS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS054107001', productName: 'Disposable, non-powdered latex gloves', name: 'DISPOSABLE, NON-POWDERED LATEX GLOVES', category: 'HANDS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056103001', productName: 'WINTER JACKETS REFLECTIVE POLYSTER MEDIUM', name: 'WINTER JACKET', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS056103002', productName: 'WINTER JACKETS REFLECTIVE POLYSTER LARGE', name: 'WINTER JACKET', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS056103003', productName: 'WINTER JACKETS REFLECTIVE POLYSTER XL', name: 'WINTER JACKET', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS056103004', productName: 'WINTER JACKETS REFLECTIVE POLYSTER XXL', name: 'WINTER JACKET', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS056116001', productName: 'PVC GLOVES SHORT', name: 'PVC GLOVES SHORT', category: 'HANDS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056116002', productName: 'PVC GLOVES LONG', name: 'PVC GLOVES LONG', category: 'HANDS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056116003', productName: 'LEATHER GLOVES SHORT', name: 'LEATHER GLOVES SHORT', category: 'HANDS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056116004', productName: 'LEATHER GLOVES LONG', name: 'LEATHER GLOVES LONG', category: 'HANDS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056116005', productName: 'NYLON GLOVES', name: 'NYLON GLOVES', category: 'HANDS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056116006', productName: 'PIG SKIN GLOVES', name: 'PIG SKIN GLOVES', category: 'HANDS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056116007', productName: 'HOUSEHOLD GLOVES', name: 'HOUSEHOLD GLOVES', category: 'HANDS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056201004', productName: 'PVC RAIN SUITS REFLECTIVE SIZE LARGE', name: 'PVC RAIN SUITS', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS056203001', productName: 'WORKSUIT NAVY,FLAME RETARDANT,REFLECTIVE,ELASTICATED CUFFS SIZE 38', name: 'WORKSUIT NAVY,FLAME RETARDANT,REFLECTIVE,ELASTICATED CUFFS', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS056203009', productName: 'WORKSUIT GREEN,ACID PROOF,REFLECTIVE,ELASTICATED CUFFS SIZE 38', name: 'WORKSUIT GREEN,ACID PROOF,REFLECTIVE,ELASTICATED CUFFS', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS056203017', productName: 'WORKSUIT BLUE,COTTON,REFLECTIVE,ELASTICATED CUFFS SIZE 38', name: 'WORKSUIT BLUE,COTTON,REFLECTIVE,ELASTICATED CUFFS', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS056211001', productName: 'REFLECTIVE VEST(POLYESTER,LIME)', name: 'REFLECTIVE VEST', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasColorVariants: true },
  { itemRefCode: 'SS056307001', productName: 'DUST MASK FFP2 (DISPOSABLE)', name: 'DUST MASK FFP2 (DISPOSABLE)', category: 'RESPIRATORY', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056307002', productName: '3M CHEMICAL RESPIRATOR HOUSING (HALF MASK)', name: '3M CHEMICAL RESPIRATOR HOUSING (HALF MASK)', category: 'RESPIRATORY', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056307003', productName: '3M CHEMICAL RESPIRATOR HOUSING (FULL FACE)', name: '3M CHEMICAL RESPIRATOR HOUSING (FULL FACE)', category: 'RESPIRATORY', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056307004', productName: '3M CHEMICAL RESPIRATOR FILTERS', name: '3M CHEMICAL RESPIRATOR FILTERS', category: 'RESPIRATORY', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056307005', productName: '3M CHEMICAL RESPIRATOR CARTRIDGE', name: '3M CHEMICAL RESPIRATOR CARTRIDGE', category: 'RESPIRATORY', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056402001', productName: 'LADIES SAFETY SHOE(STEEL TOE CAPPED OIL RESISTANT AND NON SLIP SOLE SIZE 4', name: 'LADIES SAFETY SHOE(STEEL TOE CAPPED OIL RESISTANT AND NON SLIP SOLE', category: 'FEET', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS056402009', productName: 'SAFETY SHOE(STEEL TOE CAPPED OIL RESISTANT AND NON SLIP SOLE SIZE 6', name: 'SAFETY SHOE(STEEL TOE CAPPED OIL RESISTANT AND NON SLIP SOLE', category: 'FEET', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS056402019', productName: 'SAFETY SHOE(EXECUTIVE,STEEL TOE CAPPED,NON-SLIP SOLE SIZE 8', name: 'SAFETY SHOE(EXECUTIVE,STEEL TOE CAPPED,NON-SLIP SOLE SIZE 8', category: 'FEET', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS056506001', productName: 'HARD HAT(YELLOW,CAP LAMP HOLDER)', name: 'HARD HAT', category: 'HEAD', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasColorVariants: true },
  { itemRefCode: 'SS056506007', productName: 'WELDING HELMET', name: 'WELDING HELMET', category: 'HEAD', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056506008', productName: 'WELDING HELMET INNER CAP(COTTON)', name: 'WELDING HELMET INNER CAP', category: 'HEAD', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056506009', productName: 'SUN BRIM(LIME/GREEN,POLYESTER)', name: 'SUN BRIM', category: 'HEAD', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS056506010', productName: 'HARD HAT CHIN STRAPS', name: 'HARD HAT CHIN STRAPS', category: 'HEAD', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059004001', productName: 'SAFETY GLASSES, DARK, UV PROTECTION', name: 'SAFETY GLASSES, DARK, UV PROTECTION', category: 'EYES/FACE', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059004002', productName: 'SAFETY GLASSES, CLEAR, UV PROTECTION', name: 'SAFETY GLASSES, CLEAR, UV PROTECTION', category: 'EYES/FACE', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059004003', productName: 'FACE SHIELD (CLEAR)', name: 'FACE SHIELD (CLEAR)', category: 'EYES/FACE', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902001', productName: 'GUM SHOE(STEEL TOE CAPPED,NON-SLIP SOLE SIZE 6', name: 'GUM SHOE(STEEL TOE CAPPED,NON-SLIP SOLE', category: 'FEET', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS059902001A', productName: 'ALUMINISED THERMAL SUIT', name: 'ALUMINISED THERMAL SUIT', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902009', productName: 'KIDNEY BELTS', name: 'KIDNEY BELTS', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902016', productName: 'Welding Lenses (clear)', name: 'WELDING LENSES (CLEAR)', category: 'EYES/FACE', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902017', productName: 'Welding Lenses (dark)', name: 'WELDING LENSES (DARK)', category: 'EYES/FACE', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902018', productName: 'White Lab Coats', name: 'WHITE LAB COATS', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS059902028', productName: 'EAR MUFFS RED', name: 'EAR MUFFS RED', category: 'EARS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902031', productName: 'ELECTRICAL RUBBER INSULATING GLOVES E/LENGTH 355/3', name: 'ELECTRICAL RUBBER INSULATING GLOVES', category: 'HANDS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902033', productName: 'HEAT GLOVE RED CUFF2.5', name: 'HEAT GLOVE RED', category: 'HANDS', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902035', productName: '6 POINT HARD HAT LINER', name: '6 POINT HARD HAT LINER', category: 'HEAD', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902036', productName: 'LIFE JACKET ADULT SIZE', name: 'LIFE JACKET ADULT SIZE', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902080', productName: 'Hard hat liner (6 point)', name: 'HARD HAT LINER', category: 'HEAD', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902154', productName: 'ANTI-FOG GOGGLES', name: 'ANTI-FOG GOGGLES', category: 'EYES/FACE', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902172', productName: 'CPR MOUTH PIECE', name: 'CPR MOUTH PIECE', category: 'RESPIRATORY', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902192', productName: 'BALACLAVA', name: 'BALACLAVA', category: 'HEAD', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902193', productName: 'SUN VISOR', name: 'SUN VISOR', category: 'HEAD', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902194', productName: 'FIREFIGHTING SUIT (FIRE RESISTANT)', name: 'FIREFIGHTING SUIT (FIRE RESISTANT)', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS059902222', productName: 'KNEE CAP', name: 'KNEE CAP', category: 'LEGS/LOWER/KNEES', unit: 'UN', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902223', productName: 'WELDING JACKET', name: 'WELDING JACKET', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PSS05', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS059902224', productName: 'WELDING NECK PROTECTOR', name: 'WELDING NECK PROTECTOR', category: 'NECK', unit: 'EA', accountCode: 'PSS05', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902225', productName: 'REFLECTIVE VEST, LONG SLEEVE, SIZE S', name: 'REFLECTIVE VEST, LONG SLEEVE', category: 'BODY/TORSO', unit: 'UN', accountCode: 'PPEQ', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS059902241', productName: '3M RESPIRATOR RETAINERS', name: '3M RESPIRATOR RETAINERS', category: 'RESPIRATORY', unit: 'EA', accountCode: 'PSS05', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902242', productName: 'RED HEAT RESISTANT GLOVES', name: 'RED HEAT RESISTANT GLOVES', category: 'HANDS', unit: 'EA', accountCode: 'PSS05', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902243', productName: 'CORDLESS CAPLAMP C/W CHARGER', name: 'CORDLESS CAPLAMP C/W CHARGER', category: 'HEAD', unit: 'EA', accountCode: 'PSS07', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902245', productName: 'BALACLAVA HAT', name: 'BALACLAVA HAT', category: 'HEAD', unit: 'EA', accountCode: 'PSS05', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902250', productName: 'SAFETY HARNESS', name: 'SAFETY HARNESS', category: 'BODY/TORSO', unit: 'EA', accountCode: 'PSS05', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902251', productName: 'THERMAL TROUSERS', name: 'THERMAL TROUSERS', category: 'LEGS/LOWER/KNEES', unit: 'EA', accountCode: 'CONS', accountDescription: 'Personal Protective Equipment', hasSizeVariants: true },
  { itemRefCode: 'SS059902252', productName: 'THERMAL WOOLEN HAT', name: 'THERMAL WOOLEN HAT', category: 'HEAD', unit: 'EA', accountCode: 'CONS', accountDescription: 'Personal Protective Equipment' },
  { itemRefCode: 'SS059902253', productName: 'THERMAL WINTER GLOVES (PAIR)', name: 'THERMAL WINTER GLOVES (PAIR)', category: 'HANDS', unit: 'EA', accountCode: 'CONS', accountDescription: 'Personal Protective Equipment' }
];

async function seedPPEItems() {
  try {
    console.log('🌱 Starting PPE Items seeding...');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of ppeInventoryData) {
      try {
        // Check if item already exists by itemRefCode
        const existing = await PPEItem.findOne({
          where: { itemRefCode: item.itemRefCode }
        });

        if (existing) {
          console.log(`⏭️  Skipping ${item.itemRefCode} - already exists`);
          skipped++;
          continue;
        }

        // Create the PPE item
        await PPEItem.create({
          itemRefCode: item.itemRefCode,
          itemCode: item.itemRefCode, // Use same as itemRefCode for now
          name: item.name,
          productName: item.productName,
          category: item.category,
          unit: item.unit,
          accountCode: item.accountCode,
          accountDescription: item.accountDescription,
          hasSizeVariants: item.hasSizeVariants || false,
          hasColorVariants: item.hasColorVariants || false,
          isActive: true,
          isMandatory: true
        });

        console.log(`✅ Created ${item.itemRefCode} - ${item.name}`);
        created++;

      } catch (error) {
        console.error(`❌ Error creating ${item.itemRefCode}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total processed: ${ppeInventoryData.length}`);
    
    console.log('\n✨ PPE Items seeding completed!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedPPEItems()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedPPEItems, ppeInventoryData };
