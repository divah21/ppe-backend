import { QueryTypes, type Transaction } from 'sequelize';
import { inTransaction, models, sequelize } from '../../core/db';
import { fieldErrors } from '../../core/errors';
import type { CategoryMappingInput } from './schemas';

/**
 * PPE categories are job titles with their own matrix (v1 "PPE category job titles"). Other job
 * titles point at one through ppeCategoryId and inherit its PPE where they have none of their own.
 */
export const listCategories = async () => {
  const rows = await sequelize.query<{ id: string; name: string; section: string | null; items: string; mapped: string }>(
    `SELECT jt.id, jt.name, s.name AS section,
            (SELECT COUNT(*) FROM job_title_ppe_matrix m WHERE m."jobTitleId" = jt.id AND m.is_active) AS items,
            (SELECT COUNT(*) FROM job_titles o WHERE o."ppeCategoryId" = jt.id AND o.id <> jt.id) AS mapped
     FROM job_titles jt
     LEFT JOIN sections s ON s.id = jt."sectionId"
     WHERE jt."ppeCategoryId" IS NULL
       AND EXISTS (SELECT 1 FROM job_title_ppe_matrix m WHERE m."jobTitleId" = jt.id AND m.is_active)
     ORDER BY jt.name, s.name`,
    { type: QueryTypes.SELECT }
  );
  return rows.map((r) => ({ id: r.id, name: r.name, section: r.section, itemCount: Number(r.items), mappedCount: Number(r.mapped) }));
};

/** A category must be another job title that is not itself mapped, so inheritance is one level deep. */
export const assertCategory = async (categoryId: string | null | undefined, jobTitleId: string | null, t: Transaction, field = 'ppeCategoryId') => {
  if (!categoryId) return;
  if (categoryId === jobTitleId) throw fieldErrors({ [field]: 'A job title cannot be its own PPE category' });
  const category = await models.JobTitle.findByPk(categoryId, { attributes: ['id', 'ppeCategoryId'], transaction: t });
  if (!category) throw fieldErrors({ [field]: 'Choose a PPE category from the list' });
  if (category.ppeCategoryId) throw fieldErrors({ [field]: 'That job title takes its PPE from another category; choose that category instead' });
};

/** A title other titles inherit from cannot take a category itself, or inheritance would chain. */
export const assertNoFollowers = async (jobTitleId: string, name: string, t: Transaction, field = 'ppeCategoryId') => {
  if (await models.JobTitle.count({ where: { ppeCategoryId: jobTitleId }, transaction: t })) {
    throw fieldErrors({ [field]: `${name} is a PPE category other job titles use, so it cannot take another category` });
  }
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Keywords match at the start of a word; one written with a space ("it ") must be the whole word. */
const keywordTest = (kw: string) =>
  new RegExp(kw !== kw.trim() ? `\\b${escape(kw.trim())}\\b` : `\\b${escape(kw)}`);

// v1 auto-map keywords: a category whose name contains the key gets job titles containing a keyword
const KEYWORDS: Record<string, string[]> = {
  lab: ['laboratory', 'lab ', 'assay', 'metallurg', 'chemist', 'sample'],
  plant: ['plant ', 'operator', 'crushing', 'milling', 'flotation', 'leach', 'ccd', 'detox'],
  plumbers: ['plumber', 'pipe fitter', 'pipefitter'],
  electrical: ['electric', 'electrician'],
  mechanical: ['mechan', 'fitter', 'turner', 'machinist', 'welder', 'boiler'],
  it: ['it ', ' it', 'information technology', 'programmer', 'software', 'network', 'system admin'],
  admin: ['admin', 'clerk', 'secretary', 'receptionist', 'typist', 'filing'],
  management: ['manager', 'superintendent', 'supervisor', 'foreman', 'team leader', 'head of'],
  safety: ['safety', 'sheq', 'environment', 'health'],
  security: ['security', 'guard', 'patrol'],
  stores: ['store', 'warehouse', 'inventory', 'stock'],
  mining: ['miner', 'mining', 'underground', 'drill', 'blast'],
  workshop: ['workshop', 'garage', 'diesel', 'auto '],
  reagents: ['reagent'],
  'gold room': ['gold room', 'smelter', 'smelt', 'refin'],
  outdoor: ['outdoor', 'garden', 'landscap', 'grounds'],
  indoor: ['indoor', 'office', 'cleaning', 'janitor', 'housekeep'],
  surveyor: ['survey'],
  driver: ['driver', 'chauffeur', 'transport'],
  construction: ['construct', 'building', 'civil', 'mason', 'carpenter', 'brick'],
};

/** Suggested categories for active job titles that have none, by keyword then by name (v1 auto-map). Nothing is saved. */
export const suggestCategories = async () => {
  const categories = (await listCategories()).map((c) => ({ ...c, lower: c.name.toLowerCase() }));
  const ids = new Set(categories.map((c) => c.id));
  const titles = await sequelize.query<{ id: string; name: string; section: string | null }>(
    `SELECT jt.id, jt.name, s.name AS section FROM job_titles jt LEFT JOIN sections s ON s.id = jt."sectionId"
     WHERE jt."isActive" AND jt."ppeCategoryId" IS NULL ORDER BY jt.name`,
    { type: QueryTypes.SELECT }
  );
  const byKeyword = Object.entries(KEYWORDS).flatMap(([key, words]) => {
    const whole = new RegExp(`\\b${escape(key)}\\b`);
    const category = categories.find((c) => whole.test(c.lower));
    return category ? [{ category, words: words.map(keywordTest) }] : [];
  });

  const suggestions = [];
  for (const jt of titles) {
    if (ids.has(jt.id)) continue;
    const name = jt.name.toLowerCase();
    const first = name.split(' ')[0] ?? name;
    const match =
      byKeyword.find((k) => k.words.some((w) => w.test(name)))?.category ??
      categories.find((c) => name.includes(c.lower) || (first.length > 2 && c.lower.includes(first)));
    if (match) suggestions.push({ jobTitleId: jt.id, name: jt.name, section: jt.section, ppeCategoryId: match.id, categoryName: match.name });
  }
  return suggestions;
};

/** Sets or clears the PPE category of several job titles at once. */
export const applyCategories = (input: CategoryMappingInput) =>
  inTransaction(async (t) => {
    for (const [i, m] of input.mappings.entries()) {
      const row = await models.JobTitle.findByPk(m.jobTitleId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!row) throw fieldErrors({ [`mappings.${i}.jobTitleId`]: 'This job title no longer exists' });
      await assertCategory(m.ppeCategoryId, m.jobTitleId, t, `mappings.${i}.ppeCategoryId`);
      if (m.ppeCategoryId) await assertNoFollowers(m.jobTitleId, row.name as string, t, `mappings.${i}.ppeCategoryId`);
      await row.update({ ppeCategoryId: m.ppeCategoryId ?? null }, { transaction: t });
    }
    return { updated: input.mappings.length };
  });
