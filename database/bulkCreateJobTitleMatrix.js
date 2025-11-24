const { sequelize } = require('./db');
const { JobTitlePPEMatrix, PPEItem } = require('../models');

/**
 * Bulk Create Job Title PPE Matrix from Spreadsheet Data
 * 
 * This script helps you import the PPE matrix by job title.
 * 
 * DATA FORMAT EXPECTED:
 * {
 *   jobTitle: "General Worker",
 *   department: "Operations",
 *   costCenter: "OP001",
 *   section: "Production",
 *   headcount: 50,
 *   ppeItems: [
 *     { itemName: "Worksuit blue cotton", quantityRequired: 2, isMandatory: true },
 *     { itemName: "Safety shoe steel toe", quantityRequired: 1, isMandatory: true },
 *     { itemName: "Hard hat", quantityRequired: 1, isMandatory: true }
 *   ]
 * }
 */

// SAMPLE DATA - Replace this with your actual job title matrix data
const jobTitleMatrixData = [
  {
    jobTitle: 'Furnace Operator',
    department: 'Operations',
    costCenter: 'OP001',
    section: 'Smelter',
    headcount: 12,
    ppeItems: [
      { itemName: 'Aluminised thermal suit', quantityRequired: 2, isMandatory: true, category: 'BODY/TORSO' },
      { itemName: 'Fire fighting gloves', quantityRequired: 1, isMandatory: true, category: 'HANDS' },
      { itemName: 'Safety shoe steel toe', quantityRequired: 1, isMandatory: true, category: 'FEET' },
      { itemName: 'Hard hat', quantityRequired: 1, isMandatory: true, category: 'HEAD' },
      { itemName: 'Face shield (clear)', quantityRequired: 1, isMandatory: true, category: 'EYES/FACE' },
      { itemName: 'Ear muffs red', quantityRequired: 1, isMandatory: true, category: 'EARS' },
      { itemName: 'Dust mask FFP2', quantityRequired: 10, isMandatory: true, category: 'RESPIRATORY' }
    ]
  },
  {
    jobTitle: 'Welder',
    department: 'Maintenance',
    costCenter: 'MT001',
    section: 'Workshop',
    headcount: 8,
    ppeItems: [
      { itemName: 'Welding jacket', quantityRequired: 1, isMandatory: true, category: 'BODY/TORSO' },
      { itemName: 'Leather gloves long', quantityRequired: 2, isMandatory: true, category: 'HANDS' },
      { itemName: 'Welding helmet', quantityRequired: 1, isMandatory: true, category: 'HEAD' },
      { itemName: 'Welding lenses (dark)', quantityRequired: 2, isMandatory: true, category: 'EYES/FACE' },
      { itemName: 'Safety shoe steel toe', quantityRequired: 1, isMandatory: true, category: 'FEET' },
      { itemName: 'Leather apron', quantityRequired: 1, isMandatory: true, category: 'BODY/TORSO' },
      { itemName: 'Welding neck protector', quantityRequired: 1, isMandatory: true, category: 'NECK' },
      { itemName: '3M respirator half mask', quantityRequired: 1, isMandatory: true, category: 'RESPIRATORY' }
    ]
  },
  {
    jobTitle: 'Laboratory Technician',
    department: 'Laboratory',
    costCenter: 'LB001',
    section: 'Assay Lab',
    headcount: 6,
    ppeItems: [
      { itemName: 'White lab coat', quantityRequired: 2, isMandatory: true, category: 'BODY/TORSO' },
      { itemName: 'Safety glasses clear', quantityRequired: 1, isMandatory: true, category: 'EYES/FACE' },
      { itemName: 'PVC gloves long', quantityRequired: 3, isMandatory: true, category: 'HANDS' },
      { itemName: 'Safety shoe executive', quantityRequired: 1, isMandatory: true, category: 'FEET' },
      { itemName: 'PVC apron', quantityRequired: 1, isMandatory: true, category: 'BODY/TORSO' },
      { itemName: '3M respirator half mask', quantityRequired: 1, isMandatory: true, category: 'RESPIRATORY' }
    ]
  },
  {
    jobTitle: 'General Worker',
    department: 'Operations',
    costCenter: 'OP002',
    section: 'General Maintenance',
    headcount: 25,
    ppeItems: [
      { itemName: 'Worksuit blue cotton', quantityRequired: 2, isMandatory: true, category: 'BODY/TORSO' },
      { itemName: 'Safety shoe steel toe', quantityRequired: 1, isMandatory: true, category: 'FEET' },
      { itemName: 'Hard hat', quantityRequired: 1, isMandatory: true, category: 'HEAD' },
      { itemName: 'Safety glasses clear', quantityRequired: 1, isMandatory: true, category: 'EYES/FACE' },
      { itemName: 'Leather gloves short', quantityRequired: 2, isMandatory: true, category: 'HANDS' },
      { itemName: 'Earplugs', quantityRequired: 6, isMandatory: false, category: 'EARS' }
    ]
  },
  {
    jobTitle: 'Supervisor',
    department: 'Operations',
    costCenter: 'OP001',
    section: 'Production',
    headcount: 5,
    ppeItems: [
      { itemName: 'Reflective vest', quantityRequired: 1, isMandatory: true, category: 'BODY/TORSO' },
      { itemName: 'Safety shoe executive', quantityRequired: 1, isMandatory: true, category: 'FEET' },
      { itemName: 'Hard hat', quantityRequired: 1, isMandatory: true, category: 'HEAD' },
      { itemName: 'Safety glasses clear', quantityRequired: 1, isMandatory: true, category: 'EYES/FACE' }
    ]
  }
];

async function bulkCreateJobTitleMatrix() {
  try {
    console.log('🌱 Starting job title PPE matrix bulk import...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const jobData of jobTitleMatrixData) {
      console.log(`\n📋 Processing: ${jobData.jobTitle} (${jobData.headcount} employees)`);
      console.log(`   Department: ${jobData.department} | Cost Center: ${jobData.costCenter} | Section: ${jobData.section}`);

      for (const ppeItem of jobData.ppeItems) {
        try {
          // Find the PPE item
          const item = await PPEItem.findOne({
            where: { name: ppeItem.itemName }
          });

          if (!item) {
            console.log(`   ⚠️  PPE item not found: ${ppeItem.itemName} - skipping`);
            totalErrors++;
            continue;
          }

          // Check if matrix entry already exists
          const existing = await JobTitlePPEMatrix.findOne({
            where: {
              jobTitle: jobData.jobTitle,
              ppeItemId: item.id
            }
          });

          if (existing) {
            console.log(`   ⏭️  Skipped: ${ppeItem.itemName} (already exists for ${jobData.jobTitle})`);
            totalSkipped++;
            continue;
          }

          // Create matrix entry
          await JobTitlePPEMatrix.create({
            jobTitle: jobData.jobTitle,
            ppeItemId: item.id,
            quantityRequired: ppeItem.quantityRequired,
            replacementFrequency: item.replacementFrequency,
            heavyUseFrequency: item.heavyUseFrequency,
            isMandatory: ppeItem.isMandatory,
            category: ppeItem.category,
            notes: `${jobData.department} - ${jobData.section}`
          });

          console.log(`   ✅ Created: ${ppeItem.itemName} (Qty: ${ppeItem.quantityRequired})`);
          totalCreated++;
        } catch (error) {
          console.error(`   ❌ Error creating matrix entry for ${ppeItem.itemName}:`, error.message);
          totalErrors++;
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 JOB TITLE PPE MATRIX BULK IMPORT SUMMARY');
    console.log('='.repeat(70));
    console.log(`Job titles processed: ${jobTitleMatrixData.length}`);
    console.log(`✅ Matrix entries created: ${totalCreated}`);
    console.log(`⏭️  Skipped (already exist): ${totalSkipped}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log('='.repeat(70));

    // Show job title breakdown
    console.log('\n📦 JOB TITLE BREAKDOWN:');
    for (const jobData of jobTitleMatrixData) {
      console.log(`  ${jobData.jobTitle}: ${jobData.ppeItems.length} PPE items × ${jobData.headcount} employees = ${jobData.ppeItems.reduce((sum, item) => sum + item.quantityRequired, 0) * jobData.headcount} total items needed`);
    }

    console.log('\n✅ Job title PPE matrix bulk import completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  }
}

// Run the import
bulkCreateJobTitleMatrix();

/**
 * TO USE THIS SCRIPT WITH YOUR DATA:
 * 
 * 1. Replace the jobTitleMatrixData array above with your actual data
 * 2. Ensure PPE items are already seeded (run seedComprehensivePPE.js first)
 * 3. Run: node database/bulkCreateJobTitleMatrix.js
 * 
 * DATA FORMAT:
 * - jobTitle: Exact job title from your employee records
 * - department: Department name
 * - costCenter: Cost center code
 * - section: Section name
 * - headcount: Number of employees with this job title
 * - ppeItems: Array of PPE items required for this job
 *   - itemName: Must match exactly with PPEItem.name in database
 *   - quantityRequired: How many of this item each employee gets
 *   - isMandatory: Is this PPE mandatory for the job?
 *   - category: PPE category (BODY/TORSO, FEET, etc.)
 * 
 * TIPS:
 * - You can export your spreadsheet to JSON format
 * - Use exact item names from the seedComprehensivePPE.js file
 * - Run this script after seeding PPE items
 * - Can be run multiple times safely (skips existing entries)
 */
