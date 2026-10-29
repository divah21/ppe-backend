import { Op, QueryTypes, fn, col, literal, where as sqlWhere, type Transaction, type WhereOptions } from 'sequelize';
import type { z } from 'zod';
import { ROLES, type AuthContext } from '../../core/auth';
import { inTransaction, models, sequelize, type Row } from '../../core/db';
import { AppError, conflict, forbidden, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { seesInactive } from '../ppe-items/policy';
import { importTransaction, savepoint } from '../../core/import';
import { sizeScaleImportRow, type CreateSizeScaleInput, type SizeInput, type SizeScaleImportInput, type UpdateSizeScaleInput, type sizeScaleListQuery } from './schemas';

const SIZE_COUNT = literal('(SELECT COUNT(*) FROM sizes z WHERE z.scale_id = "SizeScale"."id")');
const ITEM_COUNT = literal('(SELECT COUNT(*) FROM ppe_items p WHERE p.size_scale = "SizeScale"."code")');
const SIZE_ORDER: [string, string][] = [
  ['sortOrder', 'ASC'],
  ['value', 'ASC'],
];

const visibility = (auth: AuthContext): WhereOptions => (seesInactive(auth) ? {} : { isActive: true });

export const toSize = (row: Row) => ({
  id: row.id as string,
  value: row.value as string,
  label: (row.label as string | null) ?? null,
  sortOrder: Number(row.sortOrder ?? 0),
  euSize: (row.euSize as string | null) ?? null,
  usSize: (row.usSize as string | null) ?? null,
  ukSize: (row.ukSize as string | null) ?? null,
});

export const toSizeScale = (row: Row) => ({
  id: row.id as string,
  code: row.code as string,
  name: row.name as string,
  categoryGroup: (row.categoryGroup as string | null) ?? null,
  description: (row.description as string | null) ?? null,
  isActive: !!row.isActive,
  sizeCount: Number(row.get('sizeCount') ?? 0),
  itemCount: Number(row.get('itemCount') ?? 0),
  createdAt: row.createdAt as Date,
});

export type SizeDto = ReturnType<typeof toSize>;
export type SizeScaleDto = ReturnType<typeof toSizeScale>;

export const listSizeScales = async (auth: AuthContext, q: z.infer<typeof sizeScaleListQuery>) => {
  const where: WhereOptions[] = [visibility(auth)];
  if (q.q) where.push({ [Op.or]: [{ name: { [Op.iLike]: likeTerm(q.q) } }, { code: { [Op.iLike]: likeTerm(q.q) } }] });
  if (q.status) where.push({ isActive: q.status === 'active' });
  if (q.categoryGroup) where.push({ categoryGroup: q.categoryGroup });

  const { rows, count } = await models.SizeScale.findAndCountAll({
    where: { [Op.and]: where },
    attributes: { include: [[SIZE_COUNT, 'sizeCount'], [ITEM_COUNT, 'itemCount']] },
    order: [
      [q.sort ?? 'name', q.sort ? q.order.toUpperCase() : 'ASC'],
      ['id', 'ASC'],
    ],
    ...pageWindow(q),
  });
  return { rows: rows.map(toSizeScale), count };
};

export const sizeScaleOptions = async () => {
  const rows = await models.SizeScale.findAll({
    where: { isActive: true },
    attributes: ['id', 'code', 'name', 'categoryGroup'],
    order: [['name', 'ASC']],
  });
  return rows.map((r) => ({
    id: r.id as string,
    code: r.code as string,
    name: r.name as string,
    categoryGroup: (r.categoryGroup as string | null) ?? null,
  }));
};

export const sizesOfScale = async (scaleId: string, transaction?: Transaction) =>
  (await models.Size.findAll({ where: { scaleId }, order: SIZE_ORDER, transaction })).map(toSize);

export const getSizeScale = async (auth: AuthContext, id: string) => {
  const row = await models.SizeScale.findOne({
    where: { [Op.and]: [visibility(auth), { id }] },
    attributes: { include: [[SIZE_COUNT, 'sizeCount'], [ITEM_COUNT, 'itemCount']] },
  });
  if (!row) throw notFound('Size scale');
  return { ...toSizeScale(row), sizes: await sizesOfScale(id) };
};

/** The unique index on code is case-sensitive; serialise the case-insensitive check below. */
const lockScaleCodes = (transaction: Transaction) =>
  sequelize.query(`SELECT pg_advisory_xact_lock(hashtext('size_scales.code'))`, { transaction });

const codeTaken = async (code: string, exceptId: string | null, transaction: Transaction) => {
  await lockScaleCodes(transaction);
  const clash = await models.SizeScale.findOne({
    where: {
      [Op.and]: [sqlWhere(fn('upper', col('code')), code), ...(exceptId ? [{ id: { [Op.ne]: exceptId } }] : [])],
    },
    transaction,
  });
  if (clash) throw conflict(`A size scale with code ${code} already exists`, { fieldErrors: { code: ['This code is already used'] } });
};

const sizeValues = (s: SizeInput, sortOrder: number) => ({
  value: s.value,
  label: s.label,
  euSize: s.euSize,
  usSize: s.usSize,
  ukSize: s.ukSize,
  sortOrder,
});

export const createSizeScale = async (auth: AuthContext, input: CreateSizeScaleInput) => {
  const id = await inTransaction(async (t) => {
    await codeTaken(input.code, null, t);
    const { sizes, ...scale } = input;
    const row = await models.SizeScale.create(scale, { transaction: t });
    if (sizes.length) {
      await models.Size.bulkCreate(
        sizes.map((s, i) => ({ scaleId: row.id, ...sizeValues(s, i + 1) })),
        { transaction: t }
      );
    }
    return row.id as string;
  });
  return getSizeScale(auth, id);
};

const lockScale = async (id: string, t: Transaction) => {
  const row = await models.SizeScale.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!row) throw notFound('Size scale');
  return row;
};

export const updateSizeScale = async (auth: AuthContext, id: string, input: UpdateSizeScaleInput) => {
  await inTransaction(async (t) => {
    const row = await lockScale(id, t);
    const oldCode = row.code as string;
    // Codes are saved in capitals, but legacy scales may not be: saving their details must not
    // silently rename them (and every item pointing at them) when only the case differs.
    if (input.code.toUpperCase() === oldCode.toUpperCase()) input = { ...input, code: oldCode };
    if (input.code !== oldCode) {
      await codeTaken(input.code, id, t);
      // Items reference their scale by code, so a renamed code follows through to them
      await models.PPEItem.update({ sizeScale: input.code }, { where: { sizeScale: oldCode }, transaction: t });
    }
    await row.update(input, { transaction: t });
  });
  return getSizeScale(auth, id);
};

export const deleteSizeScale = async (id: string) => {
  await inTransaction(async (t) => {
    const row = await lockScale(id, t);
    const items = await models.PPEItem.count({ where: { sizeScale: row.code }, transaction: t });
    if (items > 0) {
      throw conflict(
        `${items} PPE item${items === 1 ? ' uses' : 's use'} this size scale. Move ${items === 1 ? 'it' : 'them'} to another scale first, or mark the scale inactive.`
      );
    }
    await models.Size.destroy({ where: { scaleId: id }, transaction: t });
    await row.destroy({ transaction: t });
  });
};

/** Size values of this scale that stock, requests or issues already record. */
const valuesInUse = async (code: string, values: string[], t: Transaction) => {
  if (!values.length) return [];
  const rows = await sequelize.query<{ size: string }>(
    `SELECT DISTINCT u.size FROM (
       SELECT size, ppe_item_id FROM stocks
       UNION ALL SELECT size, ppe_item_id FROM request_items
       UNION ALL SELECT size, ppe_item_id FROM allocations
     ) u JOIN ppe_items p ON p.id = u.ppe_item_id
     WHERE p.size_scale = :code AND LOWER(u.size) IN (:values)
     ORDER BY u.size`,
    { replacements: { code, values: values.map((v) => v.toLowerCase()) }, type: QueryTypes.SELECT, transaction: t }
  );
  return rows.map((r) => r.size);
};

/** Keeps items' available-size lists in step with renamed and removed sizes. */
const syncItemSizes = async (code: string, renamed: Map<string, string>, removed: Set<string>, t: Transaction) => {
  if (!renamed.size && !removed.size) return;
  const items = await models.PPEItem.findAll({
    where: { sizeScale: code, availableSizes: { [Op.ne]: null } },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  for (const item of items) {
    const current = item.availableSizes;
    if (!Array.isArray(current)) continue;
    const next = current.filter((v: unknown) => !removed.has(String(v))).map((v: unknown) => renamed.get(String(v)) ?? v);
    if (JSON.stringify(next) !== JSON.stringify(current)) await item.update({ availableSizes: next }, { transaction: t });
  }
};

/**
 * Replaces the scale's sizes with `sizes`, in that order. Sizes are matched by id, or by value
 * for rows sent without one. Renaming or removing a size that stock, requests or issues use is
 * refused, and only an admin may remove sizes (v1 rule).
 */
export const replaceSizes = async (auth: AuthContext, id: string, sizes: SizeInput[]) => {
  await inTransaction(async (t) => {
    const scale = await lockScale(id, t);
    const existing = await models.Size.findAll({ where: { scaleId: id }, transaction: t });
    const byId = new Map(existing.map((s) => [s.id as string, s]));

    const claimed = new Set(sizes.map((s) => s.id).filter((x): x is string => !!x));
    for (const sid of claimed) {
      if (!byId.has(sid)) throw new AppError('CONFLICT', 'Some sizes were changed by someone else. Reload and try again.');
    }
    const unclaimedByValue = new Map(existing.filter((s) => !claimed.has(s.id)).map((s) => [s.value as string, s]));
    const planned = sizes.map((s) => {
      const match = s.id ? byId.get(s.id) : unclaimedByValue.get(s.value);
      if (match) claimed.add(match.id);
      return { input: s, row: match };
    });

    const removedRows = existing.filter((s) => !claimed.has(s.id));
    const renamedRows = planned.filter((p) => p.row && p.row.value !== p.input.value);

    if (removedRows.length && auth.role !== ROLES.ADMIN) throw forbidden('Only an administrator can remove sizes');

    const touched = [...removedRows.map((r) => r.value as string), ...renamedRows.map((p) => p.row!.value as string)];
    const inUse = await valuesInUse(scale.code, touched, t);
    if (inUse.length) {
      throw conflict(
        `Size${inUse.length === 1 ? '' : 's'} ${inUse.join(', ')} ${inUse.length === 1 ? 'is' : 'are'} recorded on stock, requests or issues, so ${inUse.length === 1 ? 'it' : 'they'} can't be renamed or removed.`,
        { values: inUse }
      );
    }

    const renamed = new Map(renamedRows.map((p) => [p.row!.value as string, p.input.value]));
    const removed = new Set(removedRows.map((r) => r.value as string));

    if (removedRows.length) {
      await models.Size.destroy({ where: { id: removedRows.map((r) => r.id) }, transaction: t });
    }
    // Park renamed values first so swaps (S <-> M) don't trip the unique (scale, value) index
    for (const p of renamedRows) await p.row!.update({ value: `~${p.row!.id}` }, { transaction: t });

    for (const [i, p] of planned.entries()) {
      const values = sizeValues(p.input, i + 1);
      if (p.row) await p.row.update(values, { transaction: t });
      else await models.Size.create({ scaleId: id, ...values }, { transaction: t });
    }

    await syncItemSizes(scale.code, renamed, removed, t);
  });
  return getSizeScale(auth, id);
};

/**
 * Creates size scales from a spreadsheet (v1 size bulk upload), one row per scale with its sizes
 * listed in order. An existing scale is left alone, or with updateExisting gains the sizes it lacks.
 */
export const importSizeScales = async (input: SizeScaleImportInput) => {
  const report = { dryRun: input.dryRun, created: 0, extended: 0, unchanged: 0, sizesAdded: 0, errors: [] as Array<{ row: number; item: string; message: string }> };
  await importTransaction(
    async (t) => {
      await lockScaleCodes(t);
      const seen = new Set<string>();
      for (const [index, raw] of input.rows.entries()) {
        const row = index + 1;
        const label = String(raw.code ?? raw.name ?? 'Unnamed scale');
        const parsed = sizeScaleImportRow.safeParse(raw);
        if (!parsed.success) {
          report.errors.push({ row, item: label, message: parsed.error.issues.map((i) => i.message).join('; ') });
          continue;
        }
        const r = parsed.data;
        if (seen.has(r.code)) {
          report.errors.push({ row, item: r.code, message: 'This scale code is listed twice in the file' });
          continue;
        }
        seen.add(r.code);
        try {
          await savepoint(t, async (sp) => {
            const existing = await models.SizeScale.findOne({ where: sqlWhere(fn('upper', col('code')), r.code), transaction: sp, lock: sp.LOCK.UPDATE });
            if (!existing) {
              const scale = await models.SizeScale.create(
                { code: r.code, name: r.name, categoryGroup: r.categoryGroup, description: r.description, isActive: true },
                { transaction: sp }
              );
              await models.Size.bulkCreate(r.sizes.map((value, i) => ({ scaleId: scale.id, value, sortOrder: i + 1 })), { transaction: sp });
              report.created += 1;
              report.sizesAdded += r.sizes.length;
              return;
            }
            if (!input.updateExisting) {
              report.unchanged += 1;
              return;
            }
            const current = await models.Size.findAll({ where: { scaleId: existing.id }, attributes: ['value', 'sortOrder'], transaction: sp });
            const have = new Set(current.map((z) => String(z.value).toLowerCase()));
            const missing = r.sizes.filter((v) => !have.has(v.toLowerCase()));
            const last = Math.max(0, ...current.map((z) => Number(z.sortOrder ?? 0)));
            await existing.update({ name: r.name, categoryGroup: r.categoryGroup ?? existing.categoryGroup }, { transaction: sp });
            if (missing.length) {
              await models.Size.bulkCreate(missing.map((value, i) => ({ scaleId: existing.id, value, sortOrder: last + i + 1 })), { transaction: sp });
            }
            report.extended += 1;
            report.sizesAdded += missing.length;
          });
        } catch {
          report.errors.push({ row, item: r.code, message: 'This scale could not be saved. Check its sizes and try again.' });
        }
      }
    },
    () => !input.dryRun && report.errors.length === 0
  );
  return report;
};

/** Figures for the size scales cards. */
export const sizeScaleSummary = async () => {
  const [r] = await sequelize.query<Record<string, string>>(
    `SELECT (SELECT COUNT(*) FROM size_scales) AS scales,
            (SELECT COUNT(*) FROM size_scales WHERE is_active IS NOT FALSE) AS active,
            (SELECT COUNT(*) FROM sizes) AS sizes,
            (SELECT COUNT(*) FROM ppe_items p WHERE p.has_size_variants AND p.is_active IS NOT FALSE
               AND EXISTS (SELECT 1 FROM size_scales sc WHERE sc.code = p.size_scale)) AS items`,
    { type: QueryTypes.SELECT }
  );
  const n = (k: string) => Number(r?.[k] ?? 0);
  return { scales: n('scales'), active: n('active'), sizes: n('sizes'), items: n('items') };
};
