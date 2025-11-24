/**
 * PPE Issuance Frequency Reference
 * 
 * This document provides guidance on replacement frequencies for PPE items.
 * Frequencies are measured in MONTHS.
 * 
 * NOTE: These are standard industry guidelines. Adjust based on your actual usage patterns.
 */

const PPE_FREQUENCIES = {
  // ============= BODY/TORSO =============
  'Aluminised thermal suit': { standard: 8, heavyUse: 8, quantityPerIssue: 2 },
  'Amour bunker suit': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  "Bee catcher's suit": { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  "Chef's jacket": { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Cotton worksuit blue elastic cuff': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Firefighting suit': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  "Ladies' worksuit blue": { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  "Ladies' worksuit reflective": { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Life jacket adult size': { standard: 36, heavyUse: 24, quantityPerIssue: 1 },
  'PVC rain suit': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'Rain suit': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'Reflective cotton worksuit white': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Reflective blue worksuit': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Reflective vest': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Reflective vest long sleeve': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Shirt cotton orange & navy': { standard: 12, heavyUse: 6, quantityPerIssue: 3 },
  'Shirt cotton lime & navy': { standard: 12, heavyUse: 6, quantityPerIssue: 3 },
  'Shirt short navy & lime': { standard: 12, heavyUse: 6, quantityPerIssue: 3 },
  'Shirt short orange & lime': { standard: 12, heavyUse: 6, quantityPerIssue: 3 },
  'Sinking suit reflective': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'Thermal trousers': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'Trousers cotton navy': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Welding jacket': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'White lab coat': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Winter jacket reflective': { standard: 36, heavyUse: 24, quantityPerIssue: 1 },
  'Winter suit': { standard: 36, heavyUse: 24, quantityPerIssue: 1 },
  'Winter jacket': { standard: 36, heavyUse: 24, quantityPerIssue: 1 },
  'Worksuit blue cotton': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Worksuit green acid proof': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Worksuit navy flame retardant': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Worksuit white cotton': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Worksuit yellow cotton': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Worksuit cotton blue': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Worksuit red flame retardant': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Worksuit green cotton': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Black jean (pair)': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Blue jean (pair)': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Heat glove red': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Safety harness': { standard: 36, heavyUse: 24, quantityPerIssue: 1 },
  'Kidney belt': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'Leather apron': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'PVC apron': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },

  // ============= EARS =============
  'Ear muffs red': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'Earplugs': { standard: 1, heavyUse: 1, quantityPerIssue: 6 }, // Monthly replacement

  // ============= EYES/FACE =============
  'Anti-fog goggles': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Face shield (clear)': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Safety glasses clear': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Safety glasses dark': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Welding lenses (clear)': { standard: 6, heavyUse: 3, quantityPerIssue: 2 },
  'Welding lenses (dark)': { standard: 6, heavyUse: 3, quantityPerIssue: 2 },

  // ============= FEET =============
  'Gum shoe steel toe': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Ladies safety shoe': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Ladies safety shoe high cut': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Safety shoe executive': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Safety shoe executive size 8': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Safety shoe steel toe': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Safety shoe high cut': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Safety shoe (steel toe)': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Viking fire fighting boots': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },

  // ============= HANDS =============
  'Electrical rubber gloves': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Household gloves': { standard: 3, heavyUse: 1, quantityPerIssue: 3 }, // Quarterly
  'Leather gloves long': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Leather gloves short': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Nylon gloves': { standard: 6, heavyUse: 3, quantityPerIssue: 3 },
  'Pig skin gloves': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Fire fighting gloves': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'PVC gloves long': { standard: 6, heavyUse: 3, quantityPerIssue: 3 },
  'PVC gloves short': { standard: 6, heavyUse: 3, quantityPerIssue: 3 },
  'Red heat resistant gloves': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Thermal winter gloves': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },

  // ============= HEAD =============
  '6 point hard hat liner': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Balaclava': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Balaclava hat': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Fire fighting helmet': { standard: 36, heavyUse: 24, quantityPerIssue: 1 },
  'Cordless cap lamp': { standard: 36, heavyUse: 24, quantityPerIssue: 1 },
  'Hard hat': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'Hard hat chin strap': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Hard hat liner': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Hard hat gray': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'Sun brim': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Sun visor': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Thermal woolen hat': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'Welding helmet': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  'Welding helmet inner cap': { standard: 6, heavyUse: 3, quantityPerIssue: 2 },

  // ============= LEGS/LOWER/KNEES =============
  'Knee cap': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Leather spats': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },

  // ============= NECK =============
  "Chef's neckerchief": { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Neckerchief': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'Welding neck protector': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },

  // ============= RESPIRATORY =============
  '3M respirator cartridge': { standard: 3, heavyUse: 1, quantityPerIssue: 2 }, // Quarterly
  '3M respirator filters': { standard: 3, heavyUse: 1, quantityPerIssue: 4 }, // Quarterly
  '3M respirator full face': { standard: 24, heavyUse: 12, quantityPerIssue: 1 },
  '3M respirator half mask': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  '3M respirator retainers': { standard: 12, heavyUse: 6, quantityPerIssue: 2 },
  'CPR mouth piece': { standard: 12, heavyUse: 6, quantityPerIssue: 1 },
  'Dust mask FFP2': { standard: 1, heavyUse: 1, quantityPerIssue: 10 } // Monthly, box of 10
};

/**
 * USAGE NOTES:
 * 
 * 1. Standard Frequency: Normal office/light duty work
 * 2. Heavy Use Frequency: Mining, manufacturing, heavy industry
 * 3. Quantity Per Issue: How many units to issue per person
 * 
 * EXAMPLES:
 * 
 * - Worksuits: 12 months standard, 6 months heavy use, 2 per issue
 *   (Employee gets 2 worksuits, replaces every 12 or 6 months)
 * 
 * - Earplugs: 1 month standard/heavy, 6 per issue
 *   (Employee gets 6 pairs monthly for hygiene)
 * 
 * - Safety Shoes: 12 months standard, 6 months heavy, 1 per issue
 *   (Employee gets 1 pair, replaces annually or bi-annually)
 * 
 * - Dust Masks: 1 month standard/heavy, 10 per issue
 *   (Employee gets box of 10 monthly, disposable)
 */

module.exports = PPE_FREQUENCIES;
