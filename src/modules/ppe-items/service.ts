import { Op, QueryTypes, col, fn, literal, where as sqlWhere, type Transaction, type WhereOptions } from 'sequelize';
import type { z } from 'zod';
import type { AuthContext } from '../../core/auth';
import { inTransaction, models, sequelize, type Row } from '../../core/db';
import { AppError, conflict, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { seesInactive, stockEligibilitySql } from './policy';
import type { PpeItemInput, ReplacementFrequencyInput, ppeItemListQuery, ppeItemOptionsQuery } from './schemas';

const escape = (v: string) => sequelize.escape(v);
const visibility = (auth: AuthContext): WhereOptions => (seesInactive(auth) ? {} : { isActive: true });

const stockOnHand = (auth: AuthContext) =>
  literal(
    `(SELECT COALESCE(SUM(s.quantity), 0) FROM stocks s WHERE s.ppe_item_id = "PPEItem"."id" AND ${stockEligibilitySql(auth, escape)})`
  );
const SCALE_NAME = literal('(SELECT ss.name FROM size_scales ss WHERE ss.code = "PPEItem"."size_scale")');

const attributes = (auth: AuthContext) => ({
  include: [
    [stockOnHand(auth), 'stockOnHand'],
    [SCALE_NAME, 'sizeScaleName'],
  ] as [ReturnType<typeof literal>, string][],
});

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export const toPpeItem = (row: Row) => ({
  id: row.id as string,
  itemCode: (row.itemCode as string | null) ?? null,
  itemRefCode: (row.itemRefCode as string | null) ?? null,
  name: row.name as string,
  productName: (row.productName as string | null) ?? null,
  itemType: row.itemType as string,
  category: (row.category as string | null) ?? null,
  description: (row.description as string | null) ?? null,
  unit: (row.unit as string | null) ?? 'EA',
  replacementFrequency: (row.replacementFrequency as number | null) ?? null,
  heavyUseFrequency: (row.heavyUseFrequency as number | null) ?? null,
  isMandatory: !!row.isMandatory,
  accountCode: (row.accountCode as string | null) ?? null,
  accountDescription: (row.accountDescription as string | null) ?? null,
  supplier: (row.supplier as string | null) ?? null,
  hasSizeVariants: !!row.hasSizeVariants,
  hasColorVariants: !!row.hasColorVariants,
  sizeScale: (row.sizeScale as string | null) ?? null,
  sizeScaleName: (row.get('sizeScaleName') as string | null) ?? null,
  availableSizes: strings(row.availableSizes),
  availableColors: strings(row.availableColors),
  targetGender: (row.targetGender as string | null) ?? null,
  isActive: !!row.isActive,
  stockOnHand: Number(row.get('stockOnHand') ?? 0),
  createdAt: row.createdAt as Date,
  updatedAt: row.updatedAt as Date,
});

export type PpeItemDto = ReturnType<typeof toPpeItem>;

const SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  itemCode: 'itemCode',
  category: 'category',
  replacementFrequency: 'replacementFrequency',
  createdAt: 'createdAt',
};

export const listPpeItems = async (auth: AuthContext, q: z.infer<typeof ppeItemListQuery>) => {
  const where: WhereOptions[] = [visibility(auth)];
  if (q.q) {
    const term = likeTerm(q.q);
    where.push({
      [Op.or]: [
        { name: { [Op.iLike]: term } },
        { itemCode: { [Op.iLike]: term } },
        { itemRefCode: { [Op.iLike]: term } },
        { productName: { [Op.iLike]: term } },
      ],
    });
  }
  if (q.category) where.push({ category: q.category });
  if (q.itemType) where.push({ itemType: q.itemType });
  if (q.status) where.push({ isActive: q.status === 'active' });
  if (q.sizeScale) where.push({ sizeScale: q.sizeScale });

  const dir = q.sort ? q.order.toUpperCase() : 'ASC';
  const order =
    q.sort === 'stockOnHand'
      ? [[literal('"stockOnHand"'), dir], ['name', 'ASC']]
      : [[SORT_COLUMNS[q.sort ?? 'name'], dir], ['id', 'ASC']];

  const { rows, count } = await models.PPEItem.findAndCountAll({
    where: { [Op.and]: where },
    attributes: attributes(auth),
    order: order as never,
    ...pageWindow(q),
  });
  return { rows: rows.map(toPpeItem), count };
};

const OPTIONS_LIMIT = 500;

export const ppeItemOptions = async (q: z.infer<typeof ppeItemOptionsQuery>) => {
  const where: WhereOptions[] = [{ isActive: true }];
  if (q.q) where.push({ [Op.or]: [{ name: { [Op.iLike]: likeTerm(q.q) } }, { itemCode: { [Op.iLike]: likeTerm(q.q) } }] });
  if (q.itemType) where.push({ itemType: q.itemType });
  if (q.category) where.push({ category: q.category });
  const rows = await models.PPEItem.findAll({
    where: { [Op.and]: where },
    attributes: ['id', 'name', 'itemCode', 'category', 'itemType', 'hasSizeVariants', 'sizeScale'],
    order: [['name', 'ASC']],
    limit: OPTIONS_LIMIT,
  });
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    itemCode: (r.itemCode as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    itemType: r.itemType as string,
    hasSizeVariants: !!r.hasSizeVariants,
    sizeScale: (r.sizeScale as string | null) ?? null,
  }));
};

export const ppeCategories = async (auth: AuthContext) => {
  const rows = await models.PPEItem.findAll({
    where: { [Op.and]: [visibility(auth), { category: { [Op.ne]: null } }] },
    attributes: ['category', [fn('COUNT', col('id')), 'count']],
    group: ['category'],
    order: [['category', 'ASC']],
  });
  return rows.map((r) => ({ name: r.category as string, count: Number(r.get('count')) }));
};

const findVisible = async (auth: AuthContext, id: string) => {
  const row = await models.PPEItem.findOne({ where: { [Op.and]: [visibility(auth), { id }] }, attributes: attributes(auth) });
  if (!row) throw notFound('PPE item');
  return row;
};

const scaleSizes = async (code: string | null) => {
  if (!code) return null;
  const scale = await models.SizeScale.findOne({ where: { code }, attributes: ['id', 'code', 'name'] });
  if (!scale) return null;
  const sizes = await models.Size.findAll({
    where: { scaleId: scale.id },
    attributes: ['value', 'label'],
    order: [
      ['sortOrder', 'ASC'],
      ['value', 'ASC'],
    ],
  });
  return {
    scale: { id: scale.id as string, code: scale.code as string, name: scale.name as string },
    sizes: sizes.map((s) => ({ value: s.value as string, label: (s.label as string | null) ?? (s.value as string) })),
  };
};

export const getPpeItem = async (auth: AuthContext, id: string) => {
  const row = await findVisible(auth, id);
  const item = toPpeItem(row);
  const showValue = seesInactive(auth);

  const [bySizeRows, scale] = await Promise.all([
    sequelize.query<{ size: string | null; quantity: string; value: string; low: string }>(
      `SELECT NULLIF(s.size, '') AS size, SUM(s.quantity) AS quantity,
              SUM(s.quantity * COALESCE(s.unit_price_u_s_d, 0)) AS value,
              COUNT(*) FILTER (WHERE s.min_level IS NOT NULL AND s.quantity <= s.min_level) AS low
         FROM stocks s
        WHERE s.ppe_item_id = :id AND ${stockEligibilitySql(auth, escape)}
        GROUP BY NULLIF(s.size, '')`,
      { replacements: { id }, type: QueryTypes.SELECT }
    ),
    item.hasSizeVariants ? scaleSizes(item.sizeScale) : Promise.resolve(null),
  ]);

  const rank = new Map((scale?.sizes ?? []).map((s, i) => [s.value, i]));
  const bySize = bySizeRows
    .map((r) => ({
      size: r.size,
      quantity: Number(r.quantity),
      valueUSD: showValue ? Math.round(Number(r.value) * 100) / 100 : null,
      belowMinimum: Number(r.low) > 0,
    }))
    .sort(
      (a, b) =>
        (rank.get(a.size ?? '') ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.size ?? '') ?? Number.MAX_SAFE_INTEGER) ||
        (a.size ?? '').localeCompare(b.size ?? '', undefined, { numeric: true })
    );

  return {
    ...item,
    sizeScaleRef: scale?.scale ?? null,
    stock: {
      onHand: bySize.reduce((n, r) => n + r.quantity, 0),
      valueUSD: showValue ? Math.round(bySize.reduce((n, r) => n + (r.valueUSD ?? 0), 0) * 100) / 100 : null,
      bySize,
    },
  };
};

/** Sizes a person can pick for this item (v1 /sizes/for-item), narrowed to its available sizes. */
export const ppeItemSizes = async (auth: AuthContext, id: string) => {
  const item = toPpeItem(await findVisible(auth, id));
  if (!item.hasSizeVariants || !item.sizeScale) return { scale: null, sizes: [{ value: 'Std', label: 'Std' }] };
  const found = await scaleSizes(item.sizeScale);
  if (!found) throw new AppError('BAD_REQUEST', 'This item refers to a size scale that no longer exists');
  const allowed = new Set(item.availableSizes);
  return { scale: found.scale, sizes: allowed.size ? found.sizes.filter((s) => allowed.has(s.value)) : found.sizes };
};

const invalid = (field: string, message: string) =>
  new AppError('VALIDATION_FAILED', 'Some fields are invalid', { fieldErrors: { [field]: [message] } });

const assertCodesFree = async (input: PpeItemInput, exceptId: string | null, t: Transaction) => {
  const not = exceptId ? [{ id: { [Op.ne]: exceptId } }] : [];
  const sameCode = await models.PPEItem.findOne({
    where: { [Op.and]: [sqlWhere(fn('lower', col('item_code')), input.itemCode.toLowerCase()), ...not] },
    attributes: ['id'],
    transaction: t,
  });
  if (sameCode) {
    throw conflict(`Item code ${input.itemCode} is already used`, { fieldErrors: { itemCode: ['This code is already used'] } });
  }
  if (input.itemRefCode) {
    const sameRef = await models.PPEItem.findOne({
      where: { [Op.and]: [sqlWhere(fn('lower', col('item_ref_code')), input.itemRefCode.toLowerCase()), ...not] },
      attributes: ['id'],
      transaction: t,
    });
    if (sameRef) {
      throw conflict(`Reference code ${input.itemRefCode} is already used`, {
        fieldErrors: { itemRefCode: ['This reference code is already used'] },
      });
    }
  }
};

/**
 * Resolves the chosen scale (case-insensitive) to its stored code and checks the available sizes
 * belong to it. The scale row is share-locked so it cannot be deleted while being assigned.
 */
const resolveScale = async (input: PpeItemInput, currentCode: string | null, t: Transaction) => {
  if (!input.sizeScale) return { code: null, values: [] as string[], availableSizes: null };
  const scale = await models.SizeScale.findOne({
    where: sqlWhere(fn('upper', col('code')), input.sizeScale.toUpperCase()),
    transaction: t,
    lock: t.LOCK.SHARE,
  });
  if (!scale) throw invalid('sizeScale', 'Choose an existing size scale');
  if (!scale.isActive && scale.code !== currentCode) throw invalid('sizeScale', 'This size scale is inactive');

  const values = (await models.Size.findAll({ where: { scaleId: scale.id }, attributes: ['value'], transaction: t })).map(
    (s) => s.value as string
  );
  const canonical = new Map(values.map((v) => [v.toLowerCase(), v]));
  let availableSizes: string[] | null = null;
  if (input.availableSizes) {
    const unknown = input.availableSizes.filter((v) => !canonical.has(v.toLowerCase()));
    if (unknown.length) throw invalid('availableSizes', `Not in the ${scale.name} scale: ${unknown.join(', ')}`);
    availableSizes = [...new Set(input.availableSizes.map((v) => canonical.get(v.toLowerCase())!))];
  }
  return { code: scale.code as string, values, availableSizes };
};

const STANDARD_SIZE = 'std';

/** Refuses a scale change that would strand stock held in sizes the new scale doesn't have. */
const assertStockFitsScale = async (itemId: string, values: string[], t: Transaction) => {
  const rows = await sequelize.query<{ size: string }>(
    `SELECT DISTINCT s.size FROM stocks s
      WHERE s.ppe_item_id = :itemId AND s.quantity > 0 AND COALESCE(s.size, '') <> ''`,
    { replacements: { itemId }, type: QueryTypes.SELECT, transaction: t }
  );
  const allowed = new Set(values.map((v) => v.toLowerCase()));
  const stranded = rows.map((r) => r.size).filter((s) => s.toLowerCase() !== STANDARD_SIZE && !allowed.has(s.toLowerCase()));
  if (stranded.length) {
    throw conflict(
      `Stock is held in size${stranded.length === 1 ? '' : 's'} ${stranded.join(', ')}, which the chosen scale doesn't have. Move or adjust that stock first.`,
      { fieldErrors: { sizeScale: ['Stock is held in sizes this scale does not have'] } }
    );
  }
};

export const createPpeItem = async (auth: AuthContext, input: PpeItemInput) => {
  const id = await inTransaction(async (t) => {
    await assertCodesFree(input, null, t);
    const scale = await resolveScale(input, null, t);
    const row = await models.PPEItem.create(
      { ...input, sizeScale: scale.code, availableSizes: scale.availableSizes, isActive: true },
      { transaction: t }
    );
    return row.id as string;
  });
  return getPpeItem(auth, id);
};

const lockItem = async (id: string, t: Transaction) => {
  const row = await models.PPEItem.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!row) throw notFound('PPE item');
  return row;
};

export const updatePpeItem = async (auth: AuthContext, id: string, input: PpeItemInput) => {
  await inTransaction(async (t) => {
    const row = await lockItem(id, t);
    await assertCodesFree(input, id, t);
    const current = (row.hasSizeVariants ? row.sizeScale : null) as string | null;
    const scale = await resolveScale(input, row.sizeScale ?? null, t);
    if (scale.code !== current) await assertStockFitsScale(id, scale.values, t);
    await row.update({ ...input, sizeScale: scale.code, availableSizes: scale.availableSizes }, { transaction: t });
  });
  return getPpeItem(auth, id);
};

export const setPpeItemActive = async (auth: AuthContext, id: string, active: boolean) => {
  await inTransaction(async (t) => {
    const row = await lockItem(id, t);
    if (!!row.isActive === active) return;
    if (!active) {
      const onHand = Number((await models.Stock.sum('quantity', { where: { ppeItemId: id }, transaction: t })) ?? 0);
      if (onHand > 0) {
        throw conflict(`${onHand} ${row.unit ?? 'EA'} of this item are still in stock. Issue or write off the stock before deactivating it.`);
      }
    }
    await row.update({ isActive: active }, { transaction: t });
  });
  return getPpeItem(auth, id);
};

export const setReplacementFrequency = async (input: ReplacementFrequencyInput) =>
  inTransaction(async (t) => {
    const where: WhereOptions[] = [{ isActive: true }, { itemType: 'PPE' }];
    if (input.category) where.push({ category: input.category });
    if (input.itemIds) where.push({ id: { [Op.in]: input.itemIds } });
    const [updatedCount] = await models.PPEItem.update(
      { replacementFrequency: input.replacementFrequency },
      { where: { [Op.and]: where }, transaction: t }
    );
    return { updatedCount, replacementFrequency: input.replacementFrequency };
  });
