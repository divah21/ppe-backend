import { Op, QueryTypes } from 'sequelize';
import { z } from 'zod';
import type { AuthContext } from '../../core/auth';
import { models, sequelize } from '../../core/db';
import { AppError } from '../../core/errors';
import { sectionScope } from './policy';
import { MAX_MONTHS, MAX_QUANTITY, type MatrixCopyInput, type MatrixImportInput, type MatrixKind } from './schemas';
import { getJobTitleMatrix, getSectionMatrix, saveJobTitleMatrix, saveSectionMatrix } from './service';

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const OWNER_KEY = { 'job-titles': 'jobTitleId', sections: 'sectionId' } as const;

const whole = (label: string, min: number, max: number) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const s = String(v).trim();
    if (s === '') return null;
    const n = Number(s);
    if (!Number.isInteger(n) || n < min || n > max) {
      ctx.addIssue({ code: 'custom', message: `${label} must be a whole number from ${min} to ${max}` });
      return z.NEVER;
    }
    return n;
  });

const rowSchema = z.object({
  owner: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1, 'Name the job title or section')),
  section: z.union([z.string(), z.number()]).nullish().transform((v) => (v == null ? '' : String(v).trim())),
  item: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1, 'Give the item code or name')),
  quantity: whole('Quantity', 1, MAX_QUANTITY).nullish().transform((v) => v ?? 1),
  months: whole('Replacement months', 1, MAX_MONTHS).nullish(),
  heavyUse: whole('Heavy-use months', 1, MAX_MONTHS).nullish(),
  mandatory: z.unknown().transform((v) => (v === undefined || v === null || String(v).trim() === '' ? true : /^(y|yes|true|1)$/i.test(String(v).trim()))),
});

type Owner = { id: string; name: string; section: string };

/** Job titles or sections the user may edit, keyed by name (and by "section / job title"). */
const ownersInScope = async (auth: AuthContext, kind: MatrixKind) => {
  const byName = new Map<string, Owner[]>();
  const push = (key: string, o: Owner) => byName.set(key, [...(byName.get(key) ?? []), o]);
  if (kind === 'sections') {
    const rows = await models.Section.findAll({ where: { [Op.and]: [sectionScope(auth), { isActive: { [Op.ne]: false } }] }, attributes: ['id', 'name', 'code'] });
    for (const s of rows) {
      const o = { id: s.id as string, name: s.name as string, section: s.name as string };
      push(norm(s.name), o);
      if (s.code) push(norm(s.code), o);
    }
  } else {
    const rows = await models.JobTitle.findAll({
      where: { isActive: { [Op.ne]: false } },
      attributes: ['id', 'name'],
      include: [{ model: models.Section, as: 'section', required: true, attributes: ['id', 'name', 'code'], where: sectionScope(auth) }],
    });
    for (const j of rows) {
      const o = { id: j.id as string, name: j.name as string, section: j.section.name as string };
      push(norm(j.name), o);
    }
  }
  return byName;
};

const currentEntries = async (auth: AuthContext, kind: MatrixKind, id: string) => {
  const row = kind === 'job-titles' ? await getJobTitleMatrix(auth, id) : await getSectionMatrix(auth, id);
  return row.entries.map((e) => e.ppeItemId);
};

const save = (auth: AuthContext, kind: MatrixKind, upserts: Array<Record<string, unknown>>, deletes: Array<Record<string, string>>) =>
  kind === 'job-titles'
    ? saveJobTitleMatrix(auth, { upserts, deletes } as Parameters<typeof saveJobTitleMatrix>[1])
    : saveSectionMatrix(auth, { upserts, deletes } as Parameters<typeof saveSectionMatrix>[1]);

/**
 * PPE matrix from a spreadsheet (v1 job-title and section matrix uploads): one row per owner and item.
 * The file is resolved and checked first; the save is the grid's own all-or-nothing save.
 */
export const importMatrix = async (auth: AuthContext, kind: MatrixKind, input: MatrixImportInput) => {
  const ownerKey = OWNER_KEY[kind];
  const [owners, items] = await Promise.all([
    ownersInScope(auth, kind),
    models.PPEItem.findAll({ where: { isActive: { [Op.ne]: false } }, attributes: ['id', 'name', 'itemCode'] }),
  ]);
  const itemBy = new Map<string, { id: string; name: string }>();
  for (const i of items) {
    itemBy.set(norm(i.name), { id: i.id, name: i.name });
    if (i.itemCode) itemBy.set(norm(i.itemCode), { id: i.id, name: i.name });
  }

  const errors: Array<{ row: number; item: string; message: string }> = [];
  const upserts = new Map<string, Record<string, unknown>>();
  const touched = new Map<string, Set<string>>();
  input.rows.forEach((raw, index) => {
    const row = index + 1;
    const parsed = rowSchema.safeParse(raw);
    const label = `${String(raw.owner ?? '')} · ${String(raw.item ?? '')}`;
    if (!parsed.success) return void errors.push({ row, item: label, message: parsed.error.issues.map((i) => i.message).join('; ') });
    const r = parsed.data;
    let matches = owners.get(norm(r.owner)) ?? [];
    if (matches.length > 1 && r.section) matches = matches.filter((o) => norm(o.section) === norm(r.section));
    if (matches.length === 0) {
      return void errors.push({ row, item: label, message: kind === 'job-titles' ? 'No job title with this name in your area' : 'No section with this name or code in your area' });
    }
    if (matches.length > 1) {
      return void errors.push({ row, item: label, message: `${matches.length} job titles have this name; add the Section column to say which` });
    }
    const item = itemBy.get(norm(r.item));
    if (!item) return void errors.push({ row, item: label, message: 'No active catalogue item has this code or name' });
    const owner = matches[0]!;
    const key = `${owner.id}|${item.id}`;
    if (upserts.has(key)) return void errors.push({ row, item: label, message: 'This item is listed twice for the same owner' });
    upserts.set(key, {
      [ownerKey]: owner.id,
      ppeItemId: item.id,
      quantityRequired: r.quantity,
      replacementFrequency: r.months ?? null,
      ...(kind === 'job-titles' ? { heavyUseFrequency: r.heavyUse ?? null } : {}),
      isMandatory: r.mandatory,
    });
    touched.set(owner.id, (touched.get(owner.id) ?? new Set()).add(item.id));
  });

  const deletes: Array<Record<string, string>> = [];
  if (input.replace && !errors.length) {
    for (const [ownerId, keep] of touched) {
      for (const ppeItemId of await currentEntries(auth, kind, ownerId)) {
        if (!keep.has(ppeItemId)) deletes.push({ [ownerKey]: ownerId, ppeItemId });
      }
    }
  }
  const report = { dryRun: input.dryRun, owners: touched.size, entries: upserts.size, removals: deletes.length, errors };
  if (input.dryRun || errors.length) return report;
  const saved = await save(auth, kind, [...upserts.values()], deletes);
  return { ...report, saved };
};

/** Copies one owner's PPE to others (new in v2; v1 had to re-enter it). */
export const copyMatrix = async (auth: AuthContext, kind: MatrixKind, input: MatrixCopyInput) => {
  const ownerKey = OWNER_KEY[kind];
  const source = kind === 'job-titles' ? await getJobTitleMatrix(auth, input.fromId) : await getSectionMatrix(auth, input.fromId);
  const targets = input.toIds.filter((id) => id !== input.fromId);
  if (!targets.length) throw new AppError('VALIDATION_FAILED', 'Choose somewhere other than the source', { fieldErrors: { toIds: ['Choose somewhere other than the source'] } });
  const entries = source.entries.filter((e) => e.ppeItem?.isActive !== false);
  if (!entries.length) throw new AppError('VALIDATION_FAILED', `${source.name} has no PPE to copy`);
  const upserts = targets.flatMap((id) =>
    entries.map((e) => ({
      [ownerKey]: id,
      ppeItemId: e.ppeItemId,
      quantityRequired: e.quantityRequired,
      replacementFrequency: e.replacementFrequency,
      ...(kind === 'job-titles' ? { heavyUseFrequency: (e as { heavyUseFrequency?: number | null }).heavyUseFrequency ?? null } : {}),
      isMandatory: e.isMandatory,
    }))
  );
  const deletes: Array<Record<string, string>> = [];
  if (input.replace) {
    const wanted = new Set(entries.map((e) => e.ppeItemId));
    for (const id of targets) {
      for (const ppeItemId of await currentEntries(auth, kind, id)) if (!wanted.has(ppeItemId)) deletes.push({ [ownerKey]: id, ppeItemId });
    }
  }
  return save(auth, kind, upserts, deletes);
};

/** Owners set up or not, and entries, for the matrix cards. */
export const matrixSummary = async (auth: AuthContext, kind: MatrixKind) => {
  const scope = sectionScope(auth) as Record<string, string>;
  const where: string[] = [];
  const replacements: Record<string, unknown> = {};
  if (scope.id) (where.push('s.id = :scopeId'), (replacements.scopeId = scope.id));
  if (scope.departmentId) (where.push('s.department_id = :scopeId'), (replacements.scopeId = scope.departmentId));
  const scoped = where.length ? `AND ${where.join(' AND ')}` : '';
  const sql =
    kind === 'sections'
      ? `SELECT COUNT(*) AS owners,
                COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM section_ppe_matrix m WHERE m.section_id = s.id AND m.is_active IS NOT FALSE)) AS configured,
                (SELECT COUNT(*) FROM section_ppe_matrix m JOIN sections s2 ON s2.id = m.section_id
                  WHERE m.is_active IS NOT FALSE ${scoped.replaceAll('s.', 's2.')}) AS entries
         FROM sections s WHERE s.is_active IS NOT FALSE ${scoped}`
      : `SELECT COUNT(*) AS owners,
                COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM job_title_ppe_matrix m WHERE m."jobTitleId" = j.id AND m.is_active IS NOT FALSE)) AS configured,
                (SELECT COUNT(*) FROM job_title_ppe_matrix m JOIN job_titles j2 ON j2.id = m."jobTitleId" JOIN sections s2 ON s2.id = j2."sectionId"
                  WHERE m.is_active IS NOT FALSE ${scoped.replaceAll('s.', 's2.')}) AS entries
         FROM job_titles j JOIN sections s ON s.id = j."sectionId" WHERE j."isActive" IS NOT FALSE ${scoped}`;
  const [r] = await sequelize.query<Record<string, string>>(sql, { replacements, type: QueryTypes.SELECT });
  const owners = Number(r?.owners ?? 0);
  const configured = Number(r?.configured ?? 0);
  return { owners, configured, notConfigured: owners - configured, entries: Number(r?.entries ?? 0) };
};

