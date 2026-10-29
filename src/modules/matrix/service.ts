import { Op, col, fn, literal, where as sqlWhere, type Transaction, type WhereOptions } from 'sequelize';
import { ROLES, type AuthContext } from '../../core/auth';
import { inTransaction, models, sequelize, type Row } from '../../core/db';
import { AppError, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { sectionScope } from './policy';
import type { JobTitleMatrixQuery, JobTitleSaveInput, SectionMatrixQuery, SectionSaveInput } from './schemas';

/** v1 default when neither the matrix nor the PPE item sets a replacement frequency */
export const DEFAULT_REPLACEMENT_MONTHS = 12;

const WHOLE_MINE = new Set<string>([ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES]);

const ITEM_ATTRS = ['id', 'name', 'itemCode', 'category', 'unit', 'replacementFrequency', 'isActive'];

const toItem = (item: Row | null | undefined) =>
  item
    ? {
        id: item.id as string,
        name: item.name as string,
        itemCode: (item.itemCode as string | null) ?? null,
        category: (item.category as string | null) ?? null,
        unit: (item.unit as string | null) ?? null,
        replacementFrequency: (item.replacementFrequency as number | null) ?? null,
        isActive: item.isActive !== false,
      }
    : null;

const ref = (row: Row | null | undefined) => (row ? { id: row.id as string, name: row.name as string } : null);

const toSectionEntry = (row: Row) => ({
  id: row.id as string,
  ppeItemId: row.ppeItemId as string,
  ppeItem: toItem(row.ppeItem),
  quantityRequired: row.quantityRequired as number,
  replacementFrequency: (row.replacementFrequency as number | null) ?? null,
  isMandatory: row.isMandatory !== false,
  notes: (row.notes as string | null) ?? null,
  updatedAt: row.updatedAt as Date,
});

const toJobTitleEntry = (row: Row) => ({
  ...toSectionEntry(row),
  heavyUseFrequency: (row.heavyUseFrequency as number | null) ?? null,
});

export type SectionEntryDto = ReturnType<typeof toSectionEntry>;
export type JobTitleEntryDto = ReturnType<typeof toJobTitleEntry>;

const byItemName = (a: { ppeItem: { name: string } | null }, b: { ppeItem: { name: string } | null }) =>
  (a.ppeItem?.name ?? '').localeCompare(b.ppeItem?.name ?? '');

const sectionInclude = (auth: AuthContext, departmentId?: string) => ({
  model: models.Section,
  as: 'section',
  required: true,
  attributes: ['id', 'name', 'departmentId'],
  where: { [Op.and]: [sectionScope(auth), departmentId ? { departmentId } : {}] },
  include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
});

const lower = (s: string) => s.trim().toLowerCase();

// Matrix rows written before job titles were entities carry only the job title's name
const legacyByName = (names: string[]): WhereOptions => ({
  [Op.and]: [{ jobTitleId: null }, sqlWhere(fn('lower', fn('trim', col('job_title'))), { [Op.in]: names.map(lower) })],
});

// Same rule as resolveEntries: a legacy row counts unless the job title has its own row for the item
const JOB_TITLE_HAS_ENTRY = (extra = '') => `EXISTS (
  SELECT 1 FROM job_title_ppe_matrix m
  WHERE m.is_active IS NOT FALSE ${extra}
    AND (m."jobTitleId" = "JobTitle"."id"
      OR (m."jobTitleId" IS NULL AND lower(trim(m.job_title)) = lower(trim("JobTitle"."name"))
        AND NOT EXISTS (SELECT 1 FROM job_title_ppe_matrix o
          WHERE o."jobTitleId" = "JobTitle"."id" AND o.ppe_item_id = m.ppe_item_id))))`;

const SECTION_HAS_ENTRY = (extra = '') => `EXISTS (
  SELECT 1 FROM section_ppe_matrix m
  WHERE m.is_active IS NOT FALSE ${extra} AND m.section_id = "Section"."id")`;

const itemFilter = (ppeItemId?: string) => (ppeItemId ? `AND m.ppe_item_id = ${sequelize.escape(ppeItemId)}` : '');

/* ------------------------------------------------------------------ job-title matrix */

/**
 * The entries a job title holds. Legacy rows held by its name are shared with every job title
 * of that name, so they are never changed by a save for one job title: its own row (linked by
 * id) overrides the legacy row for the same item, and an inactive own row hides it (a removal).
 */
const resolveEntries = (jt: Row, rows: Row[]): Row[] => {
  const byItem = new Map<string, Row>();
  const name = lower(jt.name);
  for (const r of rows) {
    if (!r.jobTitleId && r.isActive !== false && lower(r.jobTitle ?? '') === name) byItem.set(r.ppeItemId, r);
  }
  for (const r of rows) if (r.jobTitleId === jt.id) byItem.set(r.ppeItemId, r);
  return [...byItem.values()].filter((r) => r.isActive !== false);
};

/** Own rows (active or not) and active legacy rows of some job titles */
const jobTitleMatrixRows = (jobTitles: Row[], opts: { transaction?: Transaction; lock?: boolean } = {}) =>
  models.JobTitlePPEMatrix.findAll({
    where: {
      [Op.or]: [
        { jobTitleId: jobTitles.map((jt) => jt.id) },
        { [Op.and]: [{ isActive: { [Op.not]: false } }, legacyByName(jobTitles.map((jt) => jt.name))] },
      ],
    },
    ...(opts.lock && opts.transaction
      ? { lock: opts.transaction.LOCK.UPDATE }
      : { include: [{ model: models.PPEItem, as: 'ppeItem', attributes: ITEM_ATTRS }] }),
    transaction: opts.transaction,
  });

const loadJobTitleEntries = async (jobTitles: Row[], t?: Transaction) => {
  const rows = jobTitles.length ? await jobTitleMatrixRows(jobTitles, { transaction: t }) : [];
  return new Map<string, Row[]>(jobTitles.map((jt) => [jt.id as string, resolveEntries(jt, rows)]));
};

const toJobTitleRow = (jt: Row, entries: Row[], categories: Map<string, Row>) => ({
  id: jt.id as string,
  name: jt.name as string,
  code: (jt.code as string | null) ?? null,
  isActive: jt.isActive !== false,
  section: ref(jt.section),
  department: ref(jt.section?.department),
  ppeCategory: ref(jt.ppeCategoryId ? categories.get(jt.ppeCategoryId) : null),
  entries: entries.map(toJobTitleEntry).sort(byItemName),
});

export type JobTitleMatrixRow = ReturnType<typeof toJobTitleRow>;

export const listJobTitleMatrix = async (auth: AuthContext, q: JobTitleMatrixQuery) => {
  const where: WhereOptions[] = [];
  if (q.sectionId) where.push({ sectionId: q.sectionId });
  if (q.jobTitleId) where.push({ id: q.jobTitleId });
  if (q.q) where.push({ name: { [Op.iLike]: likeTerm(q.q) } });
  if (q.status) where.push({ isActive: q.status === 'active' });
  if (q.configured === 'yes') where.push(literal(JOB_TITLE_HAS_ENTRY()));
  if (q.configured === 'no') where.push(literal(`NOT ${JOB_TITLE_HAS_ENTRY()}`));
  if (q.ppeItemId) where.push(literal(JOB_TITLE_HAS_ENTRY(itemFilter(q.ppeItemId))));

  const { rows, count } = await models.JobTitle.findAndCountAll({
    where: { [Op.and]: where },
    include: [sectionInclude(auth, q.departmentId)],
    order: q.sort
      ? [['name', q.order.toUpperCase()], ['id', 'ASC']]
      : [[{ model: models.Section, as: 'section' }, 'name', 'ASC'], ['name', 'ASC'], ['id', 'ASC']],
    distinct: true,
    ...pageWindow(q),
  });

  const [entries, categories] = await Promise.all([loadJobTitleEntries(rows), loadCategories(rows)]);
  return { rows: rows.map((jt) => toJobTitleRow(jt, entries.get(jt.id)!, categories)), count };
};

const loadCategories = async (jobTitles: Row[]) => {
  const ids = [...new Set(jobTitles.map((jt) => jt.ppeCategoryId).filter(Boolean))];
  if (!ids.length) return new Map<string, Row>();
  const rows = await models.JobTitle.findAll({ where: { id: ids }, attributes: ['id', 'name'] });
  return new Map(rows.map((r) => [r.id as string, r]));
};

export const getJobTitleMatrix = async (auth: AuthContext, jobTitleId: string) => {
  const jt = await models.JobTitle.findOne({ where: { id: jobTitleId }, include: [sectionInclude(auth)] });
  if (!jt) throw notFound('Job title');
  const [entries, categories] = await Promise.all([loadJobTitleEntries([jt]), loadCategories([jt])]);
  return toJobTitleRow(jt, entries.get(jt.id)!, categories);
};

/** Loads and row-locks the owners (job titles or sections) of a batch, in id order to avoid deadlocks. */
const lockOwners = async (
  auth: AuthContext,
  model: 'JobTitle' | 'Section',
  ids: string[],
  t: Transaction
): Promise<Map<string, Row>> => {
  const scoped =
    model === 'JobTitle'
      ? await models.JobTitle.findAll({ where: { id: ids }, attributes: ['id'], include: [{ ...sectionInclude(auth), attributes: [], include: [] }], transaction: t })
      : await models.Section.findAll({ where: { [Op.and]: [{ id: ids }, sectionScope(auth)] }, attributes: ['id'], transaction: t });
  const visible = new Set(scoped.map((r) => r.id as string));
  const missing = ids.filter((id) => !visible.has(id));
  if (missing.length) {
    throw new AppError('NOT_FOUND', model === 'JobTitle' ? 'Some job titles no longer exist' : 'Some sections no longer exist', {
      ids: missing,
    });
  }
  const locked = await models[model].findAll({
    where: { id: ids },
    order: [['id', 'ASC']],
    lock: t.LOCK.UPDATE,
    transaction: t,
  });
  return new Map(locked.map((r) => [r.id as string, r]));
};

const loadPpeItems = async (ids: string[], t: Transaction) => {
  const items = await models.PPEItem.findAll({ where: { id: ids }, attributes: ITEM_ATTRS, transaction: t });
  const usable = new Map(items.filter((i) => i.isActive !== false).map((i) => [i.id as string, i]));
  const bad = ids.filter((id) => !usable.has(id));
  if (bad.length) {
    throw new AppError('VALIDATION_FAILED', 'Some PPE items no longer exist or are inactive', {
      fieldErrors: { upserts: ['Some PPE items no longer exist or are inactive'] },
      ppeItemIds: bad,
    });
  }
  return usable;
};

const unique = <T>(values: T[]) => [...new Set(values)];

const months = (value: number | null | undefined, item: Row) =>
  value ?? (item.replacementFrequency as number | null) ?? DEFAULT_REPLACEMENT_MONTHS;

export interface SaveResult {
  created: number;
  updated: number;
  deleted: number;
}

export const saveJobTitleMatrix = (auth: AuthContext, input: JobTitleSaveInput): Promise<SaveResult> =>
  inTransaction(async (t) => {
    const ids = unique([...input.upserts, ...input.deletes].map((e) => e.jobTitleId)).sort();
    const jobTitles = await lockOwners(auth, 'JobTitle', ids, t);
    const items = await loadPpeItems(unique(input.upserts.map((e) => e.ppeItemId)), t);
    const names = unique([...jobTitles.values()].map((jt) => lower(jt.name)));

    const existing = await jobTitleMatrixRows([...jobTitles.values()], { transaction: t, lock: true });
    const own = (jobTitleId: string, ppeItemId: string) =>
      existing.find((r) => r.jobTitleId === jobTitleId && r.ppeItemId === ppeItemId);
    // Active legacy row held by the job title's name; shared, so it is never changed here
    const legacy = (jobTitleId: string, ppeItemId: string) => {
      const name = lower(jobTitles.get(jobTitleId)!.name);
      return existing.find((r) => !r.jobTitleId && r.ppeItemId === ppeItemId && lower(r.jobTitle ?? '') === name);
    };

    // v1's unique index is on (job title name, item): a same-named job title in another
    // section may already hold the name, in which case the row is linked by id only
    const takenNames = new Set(
      (
        await models.JobTitlePPEMatrix.findAll({
          attributes: ['jobTitle', 'ppeItemId'],
          where: {
            [Op.and]: [
              sqlWhere(fn('lower', fn('trim', col('job_title'))), { [Op.in]: names }),
              { ppeItemId: [...items.keys()] },
            ],
          },
          transaction: t,
        })
      ).map((r) => `${lower(r.jobTitle ?? '')}:${r.ppeItemId}`)
    );

    let created = 0;
    let updated = 0;
    for (const e of input.upserts) {
      const item = items.get(e.ppeItemId)!;
      const jt = jobTitles.get(e.jobTitleId)!;
      const row = own(e.jobTitleId, e.ppeItemId);
      if (row) {
        const wasRemoved = row.isActive === false;
        await row.update(
          {
            quantityRequired: e.quantityRequired,
            ...(e.replacementFrequency !== undefined && { replacementFrequency: months(e.replacementFrequency, item) }),
            ...(e.heavyUseFrequency !== undefined && { heavyUseFrequency: e.heavyUseFrequency }),
            ...(e.isMandatory !== undefined && { isMandatory: e.isMandatory }),
            ...(e.notes !== undefined && { notes: e.notes }),
            category: item.category ?? row.category,
            isActive: true,
          },
          { transaction: t }
        );
        if (wasRemoved) created++;
        else updated++;
        continue;
      }
      // Editing a shared legacy row gives this job title its own copy; fields left out keep the legacy values
      const base = legacy(e.jobTitleId, e.ppeItemId);
      const nameKey = `${lower(jt.name)}:${e.ppeItemId}`;
      await models.JobTitlePPEMatrix.create(
        {
          jobTitleId: e.jobTitleId,
          jobTitle: takenNames.has(nameKey) ? null : jt.name,
          ppeItemId: e.ppeItemId,
          quantityRequired: e.quantityRequired,
          replacementFrequency:
            e.replacementFrequency !== undefined || !base
              ? months(e.replacementFrequency, item)
              : ((base.replacementFrequency as number | null) ?? null),
          heavyUseFrequency: e.heavyUseFrequency !== undefined ? e.heavyUseFrequency : ((base?.heavyUseFrequency as number | null) ?? null),
          isMandatory: e.isMandatory ?? (base ? base.isMandatory !== false : true),
          notes: e.notes !== undefined ? e.notes : ((base?.notes as string | null) ?? null),
          category: item.category ?? base?.category ?? null,
          isActive: true,
        },
        { transaction: t }
      );
      takenNames.add(nameKey);
      if (base) updated++;
      else created++;
    }

    let deleted = 0;
    const doomed: string[] = [];
    for (const d of input.deletes) {
      const row = own(d.jobTitleId, d.ppeItemId);
      const shared = legacy(d.jobTitleId, d.ppeItemId);
      if (shared) {
        // Hide the shared legacy row for this job title only
        if (!row) {
          await models.JobTitlePPEMatrix.create(
            {
              jobTitleId: d.jobTitleId,
              jobTitle: null,
              ppeItemId: d.ppeItemId,
              quantityRequired: shared.quantityRequired,
              category: shared.category ?? null,
              isActive: false,
            },
            { transaction: t }
          );
          deleted++;
        } else if (row.isActive !== false) {
          await row.update({ isActive: false }, { transaction: t });
          deleted++;
        }
      } else if (row) {
        if (row.isActive !== false) deleted++;
        doomed.push(row.id as string);
      }
    }
    if (doomed.length) await models.JobTitlePPEMatrix.destroy({ where: { id: doomed }, transaction: t });

    return { created, updated, deleted };
  });

export const deleteJobTitleEntry = (auth: AuthContext, id: string) =>
  inTransaction(async (t) => {
    const row = await models.JobTitlePPEMatrix.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
    // An inactive row is not shown as an entry (it may be hiding a legacy row)
    if (!row || row.isActive === false) throw notFound('Matrix entry');
    if (!row.jobTitleId) {
      // A legacy row is shared by every job title of that name
      if (!WHOLE_MINE.has(auth.role)) throw notFound('Matrix entry');
      await row.destroy({ transaction: t });
      return;
    }
    const jt = await models.JobTitle.findOne({
      where: { id: row.jobTitleId },
      attributes: ['id', 'name'],
      include: [{ ...sectionInclude(auth), attributes: [], include: [] }],
      transaction: t,
    });
    if (!jt) throw notFound('Matrix entry');
    const shared = await models.JobTitlePPEMatrix.count({
      where: { [Op.and]: [{ ppeItemId: row.ppeItemId, isActive: { [Op.not]: false } }, legacyByName([jt.name])] },
      transaction: t,
    });
    if (shared) await row.update({ isActive: false }, { transaction: t });
    else await row.destroy({ transaction: t });
  });

/* ------------------------------------------------------------------ section matrix */

const loadSectionEntries = async (sections: Row[]) => {
  const bySection = new Map<string, Row[]>(sections.map((s) => [s.id as string, []]));
  if (!sections.length) return bySection;
  const rows = await models.SectionPPEMatrix.findAll({
    where: { sectionId: sections.map((s) => s.id), isActive: { [Op.not]: false } },
    include: [{ model: models.PPEItem, as: 'ppeItem', attributes: ITEM_ATTRS }],
  });
  for (const row of rows) bySection.get(row.sectionId)?.push(row);
  return bySection;
};

const toSectionRow = (s: Row, entries: Row[]) => ({
  id: s.id as string,
  name: s.name as string,
  code: (s.code as string | null) ?? null,
  isActive: s.isActive !== false,
  department: ref(s.department),
  entries: entries.map(toSectionEntry).sort(byItemName),
});

export type SectionMatrixRow = ReturnType<typeof toSectionRow>;

export const listSectionMatrix = async (auth: AuthContext, q: SectionMatrixQuery) => {
  const where: WhereOptions[] = [sectionScope(auth)];
  if (q.departmentId) where.push({ departmentId: q.departmentId });
  if (q.sectionId) where.push({ id: q.sectionId });
  if (q.q) where.push({ name: { [Op.iLike]: likeTerm(q.q) } });
  if (q.status) where.push({ isActive: q.status === 'active' });
  if (q.configured === 'yes') where.push(literal(SECTION_HAS_ENTRY()));
  if (q.configured === 'no') where.push(literal(`NOT ${SECTION_HAS_ENTRY()}`));
  if (q.ppeItemId) where.push(literal(SECTION_HAS_ENTRY(itemFilter(q.ppeItemId))));

  const { rows, count } = await models.Section.findAndCountAll({
    where: { [Op.and]: where },
    include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
    order: q.sort
      ? [['name', q.order.toUpperCase()], ['id', 'ASC']]
      : [[{ model: models.Department, as: 'department' }, 'name', 'ASC'], ['name', 'ASC'], ['id', 'ASC']],
    distinct: true,
    ...pageWindow(q),
  });
  const entries = await loadSectionEntries(rows);
  return { rows: rows.map((s) => toSectionRow(s, entries.get(s.id)!)), count };
};

export const getSectionMatrix = async (auth: AuthContext, sectionId: string) => {
  const s = await models.Section.findOne({
    where: { [Op.and]: [sectionScope(auth), { id: sectionId }] },
    include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
  });
  if (!s) throw notFound('Section');
  return toSectionRow(s, (await loadSectionEntries([s])).get(s.id)!);
};

export const saveSectionMatrix = (auth: AuthContext, input: SectionSaveInput): Promise<SaveResult> =>
  inTransaction(async (t) => {
    const ids = unique([...input.upserts, ...input.deletes].map((e) => e.sectionId)).sort();
    await lockOwners(auth, 'Section', ids, t);
    await loadPpeItems(unique(input.upserts.map((e) => e.ppeItemId)), t);

    const existing = await models.SectionPPEMatrix.findAll({
      where: { sectionId: ids },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    const find = (sectionId: string, ppeItemId: string) =>
      existing.find((r) => r.sectionId === sectionId && r.ppeItemId === ppeItemId);

    let created = 0;
    let updated = 0;
    for (const e of input.upserts) {
      const row = find(e.sectionId, e.ppeItemId);
      if (row) {
        await row.update(
          {
            quantityRequired: e.quantityRequired,
            ...(e.replacementFrequency !== undefined && { replacementFrequency: e.replacementFrequency }),
            ...(e.isMandatory !== undefined && { isMandatory: e.isMandatory }),
            ...(e.notes !== undefined && { notes: e.notes }),
            isActive: true,
          },
          { transaction: t }
        );
        updated++;
      } else {
        await models.SectionPPEMatrix.create(
          {
            sectionId: e.sectionId,
            ppeItemId: e.ppeItemId,
            quantityRequired: e.quantityRequired,
            replacementFrequency: e.replacementFrequency ?? null,
            isMandatory: e.isMandatory ?? true,
            notes: e.notes ?? null,
            isActive: true,
          },
          { transaction: t }
        );
        created++;
      }
    }

    const doomed = input.deletes.map((d) => find(d.sectionId, d.ppeItemId)?.id).filter((id): id is string => !!id);
    const deleted = doomed.length ? await models.SectionPPEMatrix.destroy({ where: { id: doomed }, transaction: t }) : 0;
    return { created, updated, deleted };
  });

export const deleteSectionEntry = (auth: AuthContext, id: string) =>
  inTransaction(async (t) => {
    const row = await models.SectionPPEMatrix.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
    if (!row) throw notFound('Matrix entry');
    const visible = await models.Section.count({ where: { [Op.and]: [{ id: row.sectionId }, sectionScope(auth)] }, transaction: t });
    if (!visible) throw notFound('Matrix entry');
    await row.destroy({ transaction: t });
  });

/* ------------------------------------------------------------------ lookups */

export const sectionOptions = async (auth: AuthContext, departmentId?: string) => {
  const rows = await models.Section.findAll({
    where: { [Op.and]: [sectionScope(auth), { isActive: { [Op.not]: false } }, departmentId ? { departmentId } : {}] },
    attributes: ['id', 'name', 'departmentId'],
    order: [['name', 'ASC']],
  });
  return rows.map((r) => ({ id: r.id as string, name: r.name as string, departmentId: (r.departmentId as string | null) ?? null }));
};

export const ppeItemOptions = async () => {
  const rows = await models.PPEItem.findAll({
    where: { isActive: { [Op.not]: false } },
    attributes: ITEM_ATTRS,
    order: [['name', 'ASC']],
  });
  return rows.map((r) => toItem(r)!);
};

/* ------------------------------------------------------------------ eligibility */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Adds calendar months, clamping to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export const addMonths = (date: Date, count: number) => {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + count);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
};

export type EligibilitySource = 'jobTitle' | 'section';

export interface EligibilityItem {
  ppeItemId: string;
  ppeItem: NonNullable<ReturnType<typeof toItem>>;
  source: EligibilitySource;
  quantity: number;
  replacementMonths: number;
  isMandatory: boolean;
  lastIssueDate: Date | null;
  lastAllocationStatus: string | null;
  nextDueDate: Date | null;
  /** Never issued, or the replacement date has passed */
  isDue: boolean;
  daysUntilDue: number;
}

export interface Eligibility {
  employee: {
    id: string;
    worksNumber: string;
    name: string;
    /** id is null for a legacy job title held only as text */
    jobTitle: { id: string | null; name: string } | null;
    section: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
  };
  items: EligibilityItem[];
  summary: { total: number; due: number; fromJobTitle: number; fromSection: number };
}

const activeEntry = { isActive: { [Op.not]: false } };
const activeItem = () => ({
  model: models.PPEItem,
  as: 'ppeItem',
  required: true,
  where: { isActive: { [Op.not]: false } },
  attributes: ITEM_ATTRS,
});

/**
 * Job-title matrix rows for an employee, most specific first (v1): what the matrix screen shows
 * for their job title, else what it shows for the PPE category job title it maps to, else legacy
 * rows held by the job title text on the employee record. Inactive PPE items are left out.
 */
interface MatrixSubject {
  sectionId: string | null;
  jobTitleRef: Row | null;
  jobTitle: string | null;
}

const jobTitleEntriesFor = async (employee: MatrixSubject, t?: Transaction) => {
  const usable = (rows: Row[]) => rows.filter((r) => r.ppeItem && r.ppeItem.isActive !== false);
  const shownFor = async (jt: Row) => resolveEntries(jt, await jobTitleMatrixRows([jt], { transaction: t }));

  const jobTitle = employee.jobTitleRef as Row | null;
  if (jobTitle) {
    const rows = await shownFor(jobTitle);
    if (rows.length) return usable(rows);
    const category = jobTitle.ppeCategoryId
      ? await models.JobTitle.findByPk(jobTitle.ppeCategoryId, { attributes: ['id', 'name'], transaction: t })
      : null;
    if (category) {
      const fallback = await shownFor(category);
      if (fallback.length) return usable(fallback);
    }
  }
  const name = employee.jobTitle as string | null;
  if (!name?.trim() || (jobTitle && lower(name) === lower(jobTitle.name))) return [];
  return models.JobTitlePPEMatrix.findAll({
    where: { [Op.and]: [activeEntry, legacyByName([name])] },
    include: [activeItem()],
    transaction: t,
  });
};

/**
 * What PPE an employee is entitled to and when each item is next due. The section matrix is
 * the baseline for everyone in the section and the job-title matrix overrides or extends it.
 * `placement` answers for a section and job title the employee is not in yet (a transfer preview).
 * Does no access check: callers must have scoped the employee already. Returns null when the
 * employee does not exist.
 */
export const computeEligibility = async (
  employeeId: string,
  opts: { transaction?: Transaction; now?: Date; placement?: { sectionId: string; jobTitleId: string | null } } = {}
): Promise<Eligibility | null> => {
  const t = opts.transaction;
  const now = opts.now ?? new Date();
  const employee = await models.Employee.findByPk(employeeId, {
    include: [
      { model: models.Section, as: 'section', attributes: ['id', 'name'], include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }] },
      { model: models.JobTitle, as: 'jobTitleRef', attributes: ['id', 'name', 'ppeCategoryId'] },
    ],
    transaction: t,
  });
  if (!employee) return null;

  // A picked job title replaces the legacy free-text one, as saving the employee does
  const { placement } = opts;
  const matrixOf: MatrixSubject = placement
    ? {
        sectionId: placement.sectionId,
        jobTitleRef: placement.jobTitleId
          ? await models.JobTitle.findByPk(placement.jobTitleId, { attributes: ['id', 'name', 'ppeCategoryId'], transaction: t })
          : null,
        jobTitle: placement.jobTitleId ? null : employee.jobTitle,
      }
    : { sectionId: employee.sectionId, jobTitleRef: employee.jobTitleRef ?? null, jobTitle: employee.jobTitle };

  const [sectionRows, jobTitleRows] = await Promise.all([
    matrixOf.sectionId
      ? models.SectionPPEMatrix.findAll({
          where: { [Op.and]: [activeEntry, { sectionId: matrixOf.sectionId }] },
          include: [activeItem()],
          transaction: t,
        })
      : Promise.resolve([] as Row[]),
    jobTitleEntriesFor(matrixOf, t),
  ]);

  const entitled = new Map<string, { row: Row; source: EligibilitySource }>();
  for (const row of sectionRows) entitled.set(row.ppeItemId, { row, source: 'section' });
  for (const row of jobTitleRows) entitled.set(row.ppeItemId, { row, source: 'jobTitle' });

  const latest = new Map<string, Row>();
  if (entitled.size) {
    const allocations = await models.Allocation.findAll({
      where: { employeeId, ppeItemId: [...entitled.keys()] },
      attributes: ['id', 'ppeItemId', 'issueDate', 'nextRenewalDate', 'replacementFrequency', 'status'],
      order: [['issueDate', 'DESC'], ['createdAt', 'DESC']],
      transaction: t,
    });
    for (const a of allocations) if (!latest.has(a.ppeItemId)) latest.set(a.ppeItemId, a);
  }

  const items: EligibilityItem[] = [...entitled.values()].map(({ row, source }) => {
    const item = row.ppeItem as Row;
    const replacementMonths = months(row.replacementFrequency, item);
    const last = latest.get(row.ppeItemId);
    const nextDueDate = last
      ? last.nextRenewalDate
        ? new Date(last.nextRenewalDate)
        : addMonths(new Date(last.issueDate), (last.replacementFrequency as number | null) || replacementMonths)
      : null;
    const isDue = !nextDueDate || now >= nextDueDate;
    return {
      ppeItemId: row.ppeItemId as string,
      ppeItem: toItem(item)!,
      source,
      quantity: row.quantityRequired as number,
      replacementMonths,
      isMandatory: row.isMandatory !== false,
      lastIssueDate: last ? new Date(last.issueDate) : null,
      lastAllocationStatus: (last?.status as string | undefined) ?? null,
      nextDueDate,
      isDue,
      daysUntilDue: isDue || !nextDueDate ? 0 : Math.ceil((nextDueDate.getTime() - now.getTime()) / DAY_MS),
    };
  });
  items.sort((a, b) => Number(b.isDue) - Number(a.isDue) || a.ppeItem.name.localeCompare(b.ppeItem.name));

  return {
    employee: {
      id: employee.id,
      worksNumber: employee.worksNumber,
      name: `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
      jobTitle: ref(employee.jobTitleRef) ?? (employee.jobTitle ? { id: null, name: employee.jobTitle as string } : null),
      section: ref(employee.section),
      department: ref(employee.section?.department),
    },
    items,
    summary: {
      total: items.length,
      due: items.filter((i) => i.isDue).length,
      fromJobTitle: items.filter((i) => i.source === 'jobTitle').length,
      fromSection: items.filter((i) => i.source === 'section').length,
    },
  };
};

/** Eligibility for an employee the user may see; anyone else is a 404. */
export const getEligibility = async (auth: AuthContext, employeeId: string) => {
  const visible = WHOLE_MINE.has(auth.role)
    ? await models.Employee.count({ where: { id: employeeId } })
    : await models.Employee.count({
        where: { id: employeeId },
        include: [{ model: models.Section, as: 'section', required: true, attributes: [], where: sectionScope(auth) }],
      });
  if (!visible) throw notFound('Employee');
  const result = await computeEligibility(employeeId);
  if (!result) throw notFound('Employee');
  return result;
};
