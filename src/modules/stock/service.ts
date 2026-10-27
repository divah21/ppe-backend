import { Op, QueryTypes, literal, type Order, type Transaction, type WhereOptions } from 'sequelize';
import { inTransaction, models, sequelize, type Row } from '../../core/db';
import { AppError, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import type { AdjustInput, BulkTopupInput, StockCreateInput, StockListQuery } from './schemas';

/* eslint-disable @typescript-eslint/no-require-imports */
const { deductStock, restoreStock } = require('../../../helpers/stock_helper') as {
  deductStock: (id: string, qty: number, o?: { transaction?: Transaction }) => Promise<number | null>;
  restoreStock: (id: string, qty: number, o?: { transaction?: Transaction }) => Promise<number | null>;
};
const { validateRequestedSize } = require('../../../middlewares/size_validation') as {
  validateRequestedSize: (item: Row, size: unknown) => Promise<{ valid: boolean; message?: string }>;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const col = (attr: string) => models.Stock.getAttributes()[attr]!.field!;
const QTY = col('quantity');
const MIN = col('minLevel');
const PRICE = col('unitPriceUSD');

// v1 rule: a line is low when its quantity is at or below its minimum level
const lowSql = (t: string) => `${t}."${QTY}" <= COALESCE(${t}."${MIN}", 0)`;
const valueSql = (t: string) => `${t}."${QTY}" * COALESCE(${t}."${PRICE}", 0)`;
const LOW_STOCK = literal(lowSql('"Stock"'));
const VALUE = literal(valueSql('"Stock"'));

const ITEM_ATTRS = ['id', 'name', 'itemCode', 'category', 'unit'];
const includeItem = { model: models.PPEItem, as: 'ppeItem', attributes: ITEM_ATTRS, required: true };

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const round2 = (n: number) => Math.round(n * 100) / 100;

const fieldError = (field: string, message: string) =>
  new AppError('VALIDATION_FAILED', message, { fieldErrors: { [field]: [message] } });

export const toStock = (row: Row) => {
  const quantity = Number(row.quantity ?? 0);
  const minLevel = num(row.minLevel);
  const unitPriceUSD = num(row.unitPriceUSD);
  return {
    id: row.id as string,
    ppeItem: {
      id: row.ppeItem.id as string,
      name: row.ppeItem.name as string,
      itemCode: (row.ppeItem.itemCode as string | null) ?? null,
      category: (row.ppeItem.category as string | null) ?? null,
      unit: (row.ppeItem.unit as string | null) ?? null,
    },
    size: (row.size as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    gender: (row.gender as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    binLocation: (row.binLocation as string | null) ?? null,
    quantity,
    minLevel,
    maxLevel: num(row.maxLevel),
    reorderPoint: num(row.reorderPoint),
    unitPriceUSD,
    unitCost: num(row.unitCost),
    totalValueUSD: round2(quantity * (unitPriceUSD ?? 0)),
    lowStock: quantity <= (minLevel ?? 0),
    supplier: (row.supplier as string | null) ?? null,
    batchNumber: (row.batchNumber as string | null) ?? null,
    expiryDate: (row.expiryDate as Date | null) ?? null,
    stockAccount: (row.stockAccount as string | null) ?? null,
    lastRestocked: (row.lastRestocked as Date | null) ?? null,
    lastStockTake: (row.lastStockTake as Date | null) ?? null,
    updatedAt: row.updatedAt as Date,
  };
};
export type StockDto = ReturnType<typeof toStock>;

const sortOrder = (q: StockListQuery): Order => {
  const dir = q.sort ? q.order.toUpperCase() : 'ASC';
  switch (q.sort) {
    case 'quantity':
      return [['quantity', dir], ['id', 'ASC']];
    case 'value':
      return [[VALUE, dir], ['id', 'ASC']];
    default:
      return [[{ model: models.PPEItem, as: 'ppeItem' }, 'name', dir], ['size', 'ASC'], ['id', 'ASC']];
  }
};

export const listStock = async (q: StockListQuery) => {
  const where: WhereOptions[] = [];
  if (q.q) {
    const term = likeTerm(q.q);
    where.push({
      [Op.or]: [
        { '$ppeItem.name$': { [Op.iLike]: term } },
        { '$ppeItem.item_code$': { [Op.iLike]: term } },
        { '$ppeItem.category$': { [Op.iLike]: term } },
      ],
    });
  }
  if (q.category) where.push({ '$ppeItem.category$': q.category });
  if (q.ppeItemId) where.push({ ppeItemId: q.ppeItemId });
  if (q.size) where.push({ size: q.size });
  if (q.lowStock === 'true') where.push(LOW_STOCK);
  if (q.lowStock === 'false') where.push({ [Op.not]: LOW_STOCK });

  const { rows, count } = await models.Stock.findAndCountAll({
    where: { [Op.and]: where },
    include: [includeItem],
    order: sortOrder(q),
    ...pageWindow(q),
  });
  return { rows: rows.map(toStock), count };
};

export const stockSummary = async () => {
  const [s] = await sequelize.query<{ lines: string; units: string; value: string; low: string; out: string }>(
    `SELECT COUNT(*) AS lines,
            COALESCE(SUM(s."${QTY}"), 0) AS units,
            COALESCE(SUM(${valueSql('s')}), 0) AS value,
            COUNT(*) FILTER (WHERE ${lowSql('s')}) AS low,
            COUNT(*) FILTER (WHERE s."${QTY}" = 0) AS out
     FROM stocks s JOIN ppe_items p ON p.id = s.ppe_item_id`,
    { type: QueryTypes.SELECT }
  );
  return {
    totalLines: Number(s?.lines ?? 0),
    totalUnits: Number(s?.units ?? 0),
    totalValueUSD: round2(Number(s?.value ?? 0)),
    lowStockCount: Number(s?.low ?? 0),
    outOfStockCount: Number(s?.out ?? 0),
  };
};

export const stockLookups = async () => {
  const items = await models.PPEItem.findAll({
    where: { isActive: true },
    attributes: ['id', 'name', 'itemCode', 'category', 'hasSizeVariants', 'sizeScale'],
    order: [['name', 'ASC']],
  });
  const scales = [...new Set(items.map((i) => i.sizeScale as string | null).filter((s): s is string => !!s))];
  const sizes = scales.length
    ? await sequelize.query<{ code: string; value: string }>(
        `SELECT sc.code, sz.value FROM sizes sz JOIN size_scales sc ON sc.id = sz.scale_id
         WHERE sc.code IN (:scales) ORDER BY sz.sort_order, sz.value`,
        { replacements: { scales }, type: QueryTypes.SELECT }
      )
    : [];
  const byScale = new Map<string, string[]>();
  for (const s of sizes) byScale.set(s.code, [...(byScale.get(s.code) ?? []), s.value]);

  const categories = await models.PPEItem.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
    where: { category: { [Op.ne]: null } },
    order: [['category', 'ASC']],
    raw: true,
  });

  return {
    items: items.map((i) => ({
      id: i.id as string,
      name: i.name as string,
      itemCode: (i.itemCode as string | null) ?? null,
      category: (i.category as string | null) ?? null,
      hasSizeVariants: !!i.hasSizeVariants,
      sizes: i.hasSizeVariants && i.sizeScale ? (byScale.get(i.sizeScale) ?? []) : [],
    })),
    categories: (categories as unknown as Array<{ category: string }>).map((c) => c.category),
  };
};

const RECENT_ISSUES = 10;

export const getStock = async (id: string) => {
  const row = await models.Stock.findByPk(id, { include: [includeItem] });
  if (!row) throw notFound('Stock line');

  const [issues, totals] = await Promise.all([
    models.Allocation.findAll({
      where: { stockId: id },
      attributes: ['id', 'quantity', 'size', 'issueDate', 'status', 'allocationType'],
      include: [
        { model: models.Employee, as: 'employee', attributes: ['id', 'worksNumber', 'firstName', 'lastName'] },
        { model: models.User, as: 'issuedBy', attributes: ['id', 'username'] },
      ],
      order: [['issueDate', 'DESC'], ['createdAt', 'DESC']],
      limit: RECENT_ISSUES,
    }),
    models.Allocation.findOne({
      where: { stockId: id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('quantity')), 0), 'units'],
      ],
      raw: true,
    }) as Promise<{ count: string; units: string } | null>,
  ]);

  return {
    ...toStock(row),
    notes: (row.notes as string | null) ?? null,
    issuedCount: Number(totals?.count ?? 0),
    issuedUnits: Number(totals?.units ?? 0),
    recentIssues: issues.map((a) => ({
      id: a.id as string,
      quantity: Number(a.quantity),
      size: (a.size as string | null) ?? null,
      issueDate: a.issueDate as Date,
      status: a.status as string,
      allocationType: (a.allocationType as string | null) ?? null,
      employee: a.employee
        ? {
            id: a.employee.id as string,
            worksNumber: a.employee.worksNumber as string,
            name: `${a.employee.firstName ?? ''} ${a.employee.lastName ?? ''}`.trim(),
          }
        : null,
      issuedBy: (a.issuedBy?.username as string | undefined) ?? null,
    })),
  };
};
export type StockDetailDto = Awaited<ReturnType<typeof getStock>>;

// A retried or stale write carries the quantity the client saw; refuse it rather than apply it twice
const assertExpected = (expected: number | undefined, current: number) => {
  if (expected !== undefined && expected !== current) {
    throw new AppError(
      'CONFLICT',
      `Stock for this line changed to ${current} since you opened it. Check the amount and save again.`,
      { quantity: current }
    );
  }
};

const lockStock = (id: string, t: Transaction) =>
  models.Stock.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

/**
 * Receives a stock line. Like v1, an existing line for the same item, size, colour, gender and
 * location is topped up (and its details refreshed) instead of creating a duplicate.
 */
export const createStock = async (input: StockCreateInput) => {
  const result = await inTransaction(async (t) => {
    // Serialises concurrent receipts of the same item so the merge check cannot race. NO KEY UPDATE
    // still lets other transactions insert rows that reference the item (their FK check takes KEY
    // SHARE), so an issue holding a stock row lock cannot deadlock against a receipt.
    const item = await models.PPEItem.findByPk(input.ppeItemId, { transaction: t, lock: t.LOCK.NO_KEY_UPDATE });
    if (!item) throw fieldError('ppeItemId', 'Choose a PPE item from the catalogue');

    const sized = await validateRequestedSize(item, input.size);
    if (!sized.valid) throw fieldError('size', sized.message ?? 'Choose a valid size');

    const variant = {
      ppeItemId: input.ppeItemId,
      size: input.size,
      color: input.color,
      gender: input.gender,
      location: input.location,
    };
    // Prefer the line already holding this batch: topping up another line of the same variant
    // with that batch number would collide with the unique (variant, batch) index.
    const findLine = (where: WhereOptions) =>
      models.Stock.findOne({ where, order: [['createdAt', 'ASC']], transaction: t, lock: t.LOCK.UPDATE });
    const existing =
      (input.batchNumber ? await findLine({ ...variant, batchNumber: input.batchNumber }) : null) ??
      (await findLine(variant));
    assertExpected(input.expectedQuantity, existing ? Number(existing.quantity) : 0);

    if (!existing) {
      const row = await models.Stock.create(
        {
          ...variant,
          quantity: input.quantity,
          minLevel: input.minLevel ?? 10,
          maxLevel: input.maxLevel ?? null,
          reorderPoint: input.reorderPoint ?? null,
          unitPriceUSD: input.unitPriceUSD,
          unitCost: input.unitCost ?? null,
          supplier: input.supplier,
          batchNumber: input.batchNumber,
          expiryDate: input.expiryDate ?? null,
          binLocation: input.binLocation,
          stockAccount: input.stockAccount,
          notes: input.notes,
          lastRestocked: input.quantity > 0 ? new Date() : null,
        },
        { transaction: t }
      );
      return { id: row.id as string, merged: false, previousQuantity: 0, quantity: input.quantity };
    }

    const keep = <T>(next: T | null | undefined, current: unknown) => (next ?? current) as T;
    const minLevel = keep(input.minLevel, existing.minLevel);
    const maxLevel = keep(input.maxLevel, existing.maxLevel);
    if (maxLevel != null && minLevel != null && maxLevel < minLevel) {
      throw fieldError('maxLevel', 'Maximum level must be at least the minimum level');
    }
    await existing.update(
      {
        minLevel,
        maxLevel,
        reorderPoint: keep(input.reorderPoint, existing.reorderPoint),
        unitPriceUSD: input.unitPriceUSD,
        unitCost: keep(input.unitCost, existing.unitCost),
        supplier: keep(input.supplier, existing.supplier),
        batchNumber: keep(input.batchNumber, existing.batchNumber),
        expiryDate: keep(input.expiryDate, existing.expiryDate),
        binLocation: keep(input.binLocation, existing.binLocation),
        stockAccount: keep(input.stockAccount, existing.stockAccount),
        notes: keep(input.notes, existing.notes),
        ...(input.quantity > 0 ? { lastRestocked: new Date() } : {}),
      },
      { transaction: t }
    );
    const previousQuantity = Number(existing.quantity);
    const quantity = input.quantity > 0 ? await restoreStock(existing.id, input.quantity, { transaction: t }) : previousQuantity;
    if (quantity === null) throw notFound('Stock line');
    return { id: existing.id as string, merged: true, previousQuantity, quantity };
  });

  return { ...result, stock: toStock((await models.Stock.findByPk(result.id, { include: [includeItem] }))!) };
};

export const adjustStock = async (id: string, { delta, expectedQuantity }: AdjustInput) => {
  const change = await inTransaction(async (t) => {
    const row = await lockStock(id, t);
    if (!row) throw notFound('Stock line');
    const previousQuantity = Number(row.quantity);
    assertExpected(expectedQuantity, previousQuantity);
    const quantity =
      delta < 0
        ? await deductStock(id, -delta, { transaction: t })
        : await restoreStock(id, delta, { transaction: t });
    if (quantity === null) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        `Only ${previousQuantity} in stock, so ${-delta} cannot be removed`,
        { available: previousQuantity }
      );
    }
    return { previousQuantity, quantity };
  });
  return { ...change, stock: await getStock(id) };
};

export const bulkTopup = async ({ items }: BulkTopupInput) =>
  inTransaction(async (t) => {
    const ids = items.map((i) => i.stockId);
    // Lock in a stable order so two overlapping batches cannot deadlock
    const rows = await models.Stock.findAll({
      where: { id: { [Op.in]: ids } },
      order: [['id', 'ASC']],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const found = new Map(rows.map((r) => [r.id as string, r]));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length) throw new AppError('NOT_FOUND', 'Some stock lines no longer exist', { missing });
    const changed = items.filter(
      (i) => i.expectedQuantity !== undefined && i.expectedQuantity !== Number(found.get(i.stockId)!.quantity)
    );
    if (changed.length) {
      throw new AppError(
        'CONFLICT',
        'Stock changed on some lines since you opened them. Check the amounts and save again.',
        { quantities: Object.fromEntries(changed.map((i) => [i.stockId, Number(found.get(i.stockId)!.quantity)])) }
      );
    }

    const now = new Date();
    const results = [];
    for (const { stockId, quantity } of items) {
      const row = found.get(stockId)!;
      const next = await restoreStock(stockId, quantity, { transaction: t });
      if (next === null) throw notFound('Stock line');
      await models.Stock.update({ lastRestocked: now }, { where: { id: stockId }, transaction: t });
      results.push({ stockId, previousQuantity: Number(row.quantity), addedQuantity: quantity, newQuantity: next });
    }
    return results;
  });
