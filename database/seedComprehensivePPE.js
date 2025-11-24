const { sequelize } = require('./db');
const { PPEItem } = require('../models');

/**
 * Comprehensive PPE Items Seed Data
 * This includes all PPE items from the standard categories plus laboratory consumables
 */

const comprehensivePPEItems = [
  // ============= BODY/TORSO =============
  { itemType: 'PPE', name: 'Aluminised thermal suit', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: true, replacementFrequency: 8, heavyUseFrequency: 8 },
  { itemType: 'PPE', name: 'Amour bunker suit', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: "Bee catcher's suit", category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: "Chef's jacket", category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Cotton worksuit blue elastic cuff', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Firefighting suit', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: "Ladies' worksuit blue", category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: "Ladies' worksuit reflective", category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Life jacket adult size', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: true, replacementFrequency: 36, heavyUseFrequency: 24 },
  { itemType: 'PPE', name: 'PVC rain suit', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: false, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'Rain suit', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: false, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'Reflective cotton worksuit white', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Reflective blue worksuit', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Reflective vest', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Reflective vest long sleeve', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Shirt cotton orange & navy', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: true, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Shirt cotton lime & navy', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: true, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Shirt short navy & lime', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: true, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Shirt short orange & lime', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: true, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Sinking suit reflective', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'Thermal trousers', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: false, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'Trousers cotton navy', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Welding jacket', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'White lab coat', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Winter jacket reflective', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: false, replacementFrequency: 36, heavyUseFrequency: 24 },
  { itemType: 'PPE', name: 'Winter suit', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: false, replacementFrequency: 36, heavyUseFrequency: 24 },
  { itemType: 'PPE', name: 'Winter jacket', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, isMandatory: false, replacementFrequency: 36, heavyUseFrequency: 24 },
  { itemType: 'PPE', name: 'Worksuit blue cotton', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Worksuit green acid proof', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Worksuit navy flame retardant', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Worksuit white cotton', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Worksuit yellow cotton', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Worksuit cotton blue', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Worksuit red flame retardant', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Worksuit green cotton', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Black jean (pair)', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Blue jean (pair)', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: true, hasColorVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Heat glove red', category: 'BODY/TORSO', unit: 'PAIR', hasSizeVariants: false, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Safety harness', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 36, heavyUseFrequency: 24 },
  { itemType: 'PPE', name: 'Kidney belt', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'Leather apron', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'PVC apron', category: 'BODY/TORSO', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },

  // ============= EARS =============
  { itemType: 'PPE', name: 'Ear muffs red', category: 'EARS', unit: 'EA', hasSizeVariants: false, hasColorVariants: false, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'Earplugs', category: 'EARS', unit: 'PAIR', hasSizeVariants: false, isMandatory: true, replacementFrequency: 1, heavyUseFrequency: 1 },

  // ============= EYES/FACE =============
  { itemType: 'PPE', name: 'Anti-fog goggles', category: 'EYES/FACE', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Face shield (clear)', category: 'EYES/FACE', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Safety glasses clear', category: 'EYES/FACE', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Safety glasses dark', category: 'EYES/FACE', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Welding lenses (clear)', category: 'EYES/FACE', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 6, heavyUseFrequency: 3 },
  { itemType: 'PPE', name: 'Welding lenses (dark)', category: 'EYES/FACE', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 6, heavyUseFrequency: 3 },

  // ============= FEET =============
  { itemType: 'PPE', name: 'Gum shoe steel toe', category: 'FEET', unit: 'PAIR', hasSizeVariants: true, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Ladies safety shoe', category: 'FEET', unit: 'PAIR', hasSizeVariants: true, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Ladies safety shoe high cut', category: 'FEET', unit: 'PAIR', hasSizeVariants: true, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Safety shoe executive', category: 'FEET', unit: 'PAIR', hasSizeVariants: true, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Safety shoe executive size 8', category: 'FEET', unit: 'PAIR', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Safety shoe steel toe', category: 'FEET', unit: 'PAIR', hasSizeVariants: true, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Safety shoe high cut', category: 'FEET', unit: 'PAIR', hasSizeVariants: true, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Safety shoe (steel toe)', category: 'FEET', unit: 'PAIR', hasSizeVariants: true, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Viking fire fighting boots', category: 'FEET', unit: 'PAIR', hasSizeVariants: true, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },

  // ============= HANDS =============
  { itemType: 'PPE', name: 'Electrical rubber gloves', category: 'HANDS', unit: 'PAIR', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Household gloves', category: 'HANDS', unit: 'PAIR', hasSizeVariants: false, isMandatory: false, replacementFrequency: 3, heavyUseFrequency: 1 },
  { itemType: 'PPE', name: 'Leather gloves long', category: 'HANDS', unit: 'PAIR', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Leather gloves short', category: 'HANDS', unit: 'PAIR', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Nylon gloves', category: 'HANDS', unit: 'PAIR', hasSizeVariants: false, isMandatory: false, replacementFrequency: 6, heavyUseFrequency: 3 },
  { itemType: 'PPE', name: 'Pig skin gloves', category: 'HANDS', unit: 'PAIR', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Fire fighting gloves', category: 'HANDS', unit: 'PAIR', hasSizeVariants: false, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'PVC gloves long', category: 'HANDS', unit: 'PAIR', hasSizeVariants: false, isMandatory: true, replacementFrequency: 6, heavyUseFrequency: 3 },
  { itemType: 'PPE', name: 'PVC gloves short', category: 'HANDS', unit: 'PAIR', hasSizeVariants: false, isMandatory: true, replacementFrequency: 6, heavyUseFrequency: 3 },
  { itemType: 'PPE', name: 'Red heat resistant gloves', category: 'HANDS', unit: 'PAIR', hasSizeVariants: false, hasColorVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Thermal winter gloves', category: 'HANDS', unit: 'PAIR', hasSizeVariants: false, isMandatory: false, replacementFrequency: 24, heavyUseFrequency: 12 },

  // ============= HEAD =============
  { itemType: 'PPE', name: '6 point hard hat liner', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Balaclava', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Balaclava hat', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Fire fighting helmet', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 36, heavyUseFrequency: 24 },
  { itemType: 'PPE', name: 'Cordless cap lamp', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 36, heavyUseFrequency: 24 },
  { itemType: 'PPE', name: 'Hard hat', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'Hard hat chin strap', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Hard hat liner', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Hard hat gray', category: 'HEAD', unit: 'EA', hasSizeVariants: false, hasColorVariants: false, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'Sun brim', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Sun visor', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Thermal woolen hat', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'Welding helmet', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: 'Welding helmet inner cap', category: 'HEAD', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 6, heavyUseFrequency: 3 },

  // ============= LEGS/LOWER/KNEES =============
  { itemType: 'PPE', name: 'Knee cap', category: 'LEGS/LOWER/KNEES', unit: 'PAIR', hasSizeVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Leather spats', category: 'LEGS/LOWER/KNEES', unit: 'PAIR', hasSizeVariants: false, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },

  // ============= NECK =============
  { itemType: 'PPE', name: "Chef's neckerchief", category: 'NECK', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Neckerchief', category: 'NECK', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Welding neck protector', category: 'NECK', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },

  // ============= RESPIRATORY =============
  { itemType: 'PPE', name: '3M respirator cartridge', category: 'RESPIRATORY', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 3, heavyUseFrequency: 1 },
  { itemType: 'PPE', name: '3M respirator filters', category: 'RESPIRATORY', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 3, heavyUseFrequency: 1 },
  { itemType: 'PPE', name: '3M respirator full face', category: 'RESPIRATORY', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 24, heavyUseFrequency: 12 },
  { itemType: 'PPE', name: '3M respirator half mask', category: 'RESPIRATORY', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: '3M respirator retainers', category: 'RESPIRATORY', unit: 'EA', hasSizeVariants: false, isMandatory: false, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'CPR mouth piece', category: 'RESPIRATORY', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 12, heavyUseFrequency: 6 },
  { itemType: 'PPE', name: 'Dust mask FFP2', category: 'RESPIRATORY', unit: 'EA', hasSizeVariants: false, isMandatory: true, replacementFrequency: 1, heavyUseFrequency: 1 },

  // ============= LABORATORY CONSUMABLES =============
  { itemType: 'LABORATORY', itemRefCode: 'LA030301001', name: 'SILVER WIRE 99.99%', productName: 'SILVER WIRE 99.99%', category: 'CONS', unit: 'KG', accountCode: '710019', accountDescription: 'Laboratory Consumables', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA036903001', name: 'CRUCIBLES SIZE NO.3', productName: 'CRUCIBLES SIZE NO.3', category: 'CONS', unit: 'EA', accountCode: '710019', accountDescription: 'Laboratory Consumables', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA036903002', name: 'CUPELS SIZE NO.8', productName: 'CUPELS SIZE NO.8', category: 'CONS', unit: 'EA', accountCode: '710019', accountDescription: 'Laboratory Consumables', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA036903003', name: 'THERMO CUPELS TYPE K 350MM', productName: 'THERMO CUPELS TYPE K 350MM', category: 'GESP', unit: 'KG', accountCode: '710019', accountDescription: 'Laboratory Consumables', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA036903004', name: 'TPX400 CRUCIBLE', productName: 'TPX400 CRUCIBLE', category: 'GESP', unit: 'EA', accountCode: '710019', accountDescription: 'Laboratory Equipment', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA042522003', name: "CUPELLATION FURNACE TYPE 'K' THERMOCOUPLE", productName: "CUPELLATION FURNACE TYPE 'K' THERMOCOUPLE", category: 'GESP', unit: 'EA', accountCode: '710019', accountDescription: 'Laboratory Equipment', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA051901001', name: 'JIK INDUSTRIAL SODIUM HYPOCHLORIDE', productName: 'JIK INDUSTRIAL SODIUM HYPOCHLORIDE', category: 'CONS', unit: 'L', accountCode: '710019', accountDescription: 'Laboratory Consumables', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA052522001', name: 'PREMIXED FLUX G0925', productName: 'PREMIXED FLUX G0925', category: 'CONS', unit: 'KG', accountCode: '710019', accountDescription: 'Laboratory Consumables', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA052806001', name: 'HYDROCHLORIC ACID ANALYTIC REAGENT 30-33%', productName: 'HYDROCHLORIC ACID ANALYTIC REAGENT 30-33%', category: 'CONS', unit: 'L', accountCode: '710019', accountDescription: 'Laboratory Consumables', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA052808001', name: 'NITRIC ACID ANALYTIC REAGENT 50-55%', productName: 'NITRIC ACID ANALYTIC REAGENT 50-55%', category: 'CONS', unit: 'L', accountCode: '710019', accountDescription: 'Laboratory Consumables', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA052815001', name: 'POTASSIUM IODIDE ANALYTIC REAGENT', productName: 'POTASSIUM IODIDE ANALYTIC REAGENT', category: 'CONS', unit: 'KG', accountCode: '710019', accountDescription: 'Laboratory Consumables', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA052832001', name: 'SODIUM THIOSULPHATE ANALYTIC REAGENT', productName: 'SODIUM THIOSULPHATE ANALYTIC REAGENT', category: 'CONS', unit: 'KG', accountCode: '710019', accountDescription: 'Laboratory Consumables', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA052834001', name: 'SILVER NITRATE SS002/436 GRANULES', productName: 'SILVER NITRATE SS002/436 GRANULES', category: 'CONS', unit: 'G', accountCode: '710019', accountDescription: 'Laboratory Consumables', isMandatory: true },
  { itemType: 'LABORATORY', itemRefCode: 'LA052836001', name: 'SODA ASH POWDER', productName: 'SODA ASH POWDER', category: 'CONS', unit: 'KG', accountCode: '710021', accountDescription: 'Laboratory Consumables', isMandatory: true }
];

async function seedComprehensivePPE() {
  try {
    console.log('🌱 Starting comprehensive PPE items seeding...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of comprehensivePPEItems) {
      try {
        // Check if item already exists by name
        const existingItem = await PPEItem.findOne({
          where: { name: item.name }
        });

        if (existingItem) {
          console.log(`⏭️  Skipped: ${item.name} (already exists)`);
          skipped++;
          continue;
        }

        // Create the item
        await PPEItem.create(item);
        console.log(`✅ Created: ${item.name} (${item.category})`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating ${item.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total items processed: ${comprehensivePPEItems.length}`);
    console.log(`✅ Successfully created: ${created}`);
    console.log(`⏭️  Skipped (already exist): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    // Display category breakdown
    console.log('\n📦 CATEGORY BREAKDOWN:');
    const categoryCount = {};
    comprehensivePPEItems.forEach(item => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    });
    Object.entries(categoryCount).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} items`);
    });

    console.log('\n✅ Comprehensive PPE seeding completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
seedComprehensivePPE();
