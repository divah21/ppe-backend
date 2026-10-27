import { Op, QueryTypes, fn, col, literal, where as sqlWhere, type Order, type Transaction, type WhereOptions } from 'sequelize';
import type { z } from 'zod';
import type { AuthContext } from '../../core/auth';
import { inTransaction, models, sequelize, type Row } from '../../core/db';
import { AppError, conflict, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { orgScope } from './policy';
import type {
  AdjustStockInput,
  BulkItemsInput,
  ItemCreateInput,
  ItemUpdateInput,
  ReceiveStockInput,
  allocationListQuery,
  itemListQuery,
  stockListQuery,
} from './schemas';
import { STOCK_ON_HAND, dayAfter, dayStart, fieldError, personInclude, toPerson, toRef } from './shared';
import { changeConsumableStock, fromCents, lockStockRow, num, toCents } from './stock';

const { ConsumableItem: Item, ConsumableStock: Stock, ConsumableAllocation: Allocation } = models;

const LOW_STOCK_DEFAULT = 5;

// ---------------------------------------------------------------- items

const ITEM_ON_HAND = literal(STOCK_ON_HAND('"ConsumableItem"."id"'));

export const toItem = (row: Row) => ({
  id: row.id as string,
  productCode: row.productCode as string,
  description: row.description as string,
  category: row.category as string,
  stockAccount: (row.stockAccount as string | null) ?? null,
  unit: row.unit as string,
  unitPrice: num(row.unitPrice),
  unitPriceUSD: num(row.unitPriceUSD),
  minLevel: (row.minLevel as number | null) ?? null,
  maxLevel: (row.maxLevel as number | null) ?? null,
  reorderPoint: (row.reorderPoint as number | null) ?? null,
  isActive: !!row.isActive,
  notes: (row.notes as string | null) ?? null,
  inStock: Number(row.get('inStock') ?? 0),
  createdAt: row.createdAt as Date,
  updatedAt: row.updatedAt as Date,
});

export type ItemDto = ReturnType<typeof toItem>;

const itemSearch = (q: string) => ({
  [Op.or]: [{ productCode: { [Op.iLike]: likeTerm(q) } }, { description: { [Op.iLike]: likeTerm(q) } }],
});

export const listItems = async (q: z.infer<typeof itemListQuery>) => {
  const where: WhereOptions[] = [];
  if (q.q) where.push(itemSearch(q.q));
  if (q.status) where.push({ isActive: q.status === 'active' });
  if (q.category) where.push({ category: q.category });

  const { rows, count } = await Item.findAndCountAll({
    where: { [Op.and]: where },
    attributes: { include: [[ITEM_ON_HAND, 'inStock']] },
    order: [[q.sort ?? 'description', q.sort ? q.order.toUpperCase() : 'ASC']],
    ...pageWindow(q),
  });
  return { rows: rows.map(toItem), count };
};

export const getItem = async (id: string) => {
  const row = await Item.findByPk(id, { attributes: { include: [[ITEM_ON_HAND, 'inStock']] } });
  if (!row) throw notFound('Item');
  return toItem(row);
};

/** Active items for pickers, with what is on hand. */
export const itemOptions = async () => {
  const rows = await Item.findAll({
    where: { isActive: true },
    attributes: ['id', 'productCode', 'description', 'unit', 'unitPriceUSD', [ITEM_ON_HAND, 'inStock']],
    order: [['description', 'ASC']],
  });
  return rows.map((r) => ({
    id: r.id as string,
    name: r.description as string,
    productCode: r.productCode as string,
    unit: r.unit as string,
    unitPriceUSD: num(r.unitPriceUSD),
    inStock: Number(r.get('inStock') ?? 0),
  }));
};

export const categories = async () => {
  const rows = await Item.findAll({
    attributes: [[fn('DISTINCT', col('category')), 'category']],
    order: [[col('category'), 'ASC']],
    raw: true,
  });
  return (rows as unknown as Array<{ category: string | null }>).map((r) => r.category).filter((c): c is string => !!c);
};

const findByCode = (productCode: string, transaction?: Transaction) =>
  Item.findOne({
    where: sqlWhere(fn('lower', col('product_code')), productCode.toLowerCase()),
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });

export const createItem = async (input: ItemCreateInput) => {
  if (await findByCode(input.productCode)) throw conflict(`An item with product code ${input.productCode} already exists`);
  const row = await Item.create(input);
  return getItem(row.id);
};

export const updateItem = async (id: string, input: ItemUpdateInput) => {
  const row = await Item.findByPk(id);
  if (!row) throw notFound('Item');
  await row.update(input);
  return getItem(id);
};

/**
 * Imports a stock sheet: creates new items, optionally updates existing ones, and sets the
 * on-hand quantity where one is given (as v1 did). All or nothing.
 */
export const bulkImportItems = ({ items, updateExisting }: BulkItemsInput) =>
  inTransaction(async (t) => {
    const result = { created: 0, updated: 0, skipped: 0, stockSet: 0 };
    for (const it of items) {
      let item = await findByCode(it.productCode, t);
      if (item) {
        if (!updateExisting) {
          result.skipped++;
          continue;
        }
        await item.update(
          {
            description: it.description,
            category: it.category ? it.category.toUpperCase() : item.category,
            unit: it.unit || item.unit,
            unitPrice: it.unitPrice ?? item.unitPrice,
            unitPriceUSD: it.unitPriceUSD ?? item.unitPriceUSD,
            stockAccount: it.stockAccount || item.stockAccount,
          },
          { transaction: t }
        );
        result.updated++;
      } else {
        item = await Item.create(
          {
            productCode: it.productCode,
            description: it.description,
            category: (it.category || 'CONS').toUpperCase(),
            unit: it.unit || 'EA',
            unitPrice: it.unitPrice,
            unitPriceUSD: it.unitPriceUSD,
            stockAccount: it.stockAccount || '710019',
          },
          { transaction: t }
        );
        result.created++;
      }

      if (it.quantity !== null && it.quantity > 0) {
        const stock = await ensureStockRow(item, { unitPrice: it.unitPrice, unitPriceUSD: it.unitPriceUSD }, t);
        await setStockQuantity(stock, toCents(it.quantity), t);
        await Stock.update({ lastRestocked: new Date() }, { where: { id: stock.id }, transaction: t });
        result.stockSet++;
      }
    }
    return result;
  });

// ---------------------------------------------------------------- stock

const ITEM_ALIAS = 'consumableItem';

export const toStock = (row: Row) => {
  const item = row.consumableItem as Row;
  const minLevel = (item.minLevel as number | null) ?? LOW_STOCK_DEFAULT;
  const quantity = Number(row.quantity);
  return {
    id: row.id as string,
    consumableItemId: row.consumableItemId as string,
    productCode: item.productCode as string,
    description: item.description as string,
    category: item.category as string,
    unit: item.unit as string,
    itemActive: !!item.isActive,
    quantity,
    minLevel,
    isLow: quantity <= minLevel,
    unitPrice: num(row.unitPrice),
    unitPriceUSD: num(row.unitPriceUSD),
    totalValue: num(row.totalValue),
    totalValueUSD: num(row.totalValueUSD),
    location: (row.location as string | null) ?? null,
    binLocation: (row.binLocation as string | null) ?? null,
    batchNumber: (row.batchNumber as string | null) ?? null,
    expiryDate: (row.expiryDate as Date | null) ?? null,
    lastRestocked: (row.lastRestocked as Date | null) ?? null,
    lastStockTake: (row.lastStockTake as Date | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    updatedAt: row.updatedAt as Date,
  };
};

export type StockDto = ReturnType<typeof toStock>;

const LOW_STOCK_SQL = `"ConsumableStock"."quantity" <= COALESCE("${ITEM_ALIAS}"."min_level", ${LOW_STOCK_DEFAULT})`;

const stockOrder = (q: z.infer<typeof stockListQuery>): Order => {
  const dir = q.sort ? q.order.toUpperCase() : 'ASC';
  const itemCol = { model: Item, as: ITEM_ALIAS };
  switch (q.sort) {
    case 'productCode':
      return [[itemCol, 'productCode', dir]];
    case 'quantity':
    case 'totalValueUSD':
    case 'lastRestocked':
      return [[q.sort, dir], [itemCol, 'description', 'ASC']];
    default:
      return [[itemCol, 'description', dir]];
  }
};

export const listStock = async (q: z.infer<typeof stockListQuery>) => {
  const itemWhere: WhereOptions[] = [];
  if (q.q) itemWhere.push(itemSearch(q.q));
  if (q.category) itemWhere.push({ category: q.category });
  const where: WhereOptions[] = [];
  if (q.lowStock === 'true') where.push(literal(LOW_STOCK_SQL));
  if (q.lowStock === 'false') where.push(literal(`NOT (${LOW_STOCK_SQL})`));

  const { rows, count } = await Stock.findAndCountAll({
    where: { [Op.and]: where },
    include: [{ model: Item, as: ITEM_ALIAS, required: true, where: { [Op.and]: itemWhere } }],
    order: stockOrder(q),
    ...pageWindow(q),
  });
  return { rows: rows.map(toStock), count };
};

export const stockSummary = async () => {
  const [row] = await sequelize.query<{ items: string; value: string | null; low: string }>(
    `SELECT COUNT(*) AS items,
            COALESCE(SUM(s.total_value_u_s_d), 0) AS value,
            COUNT(*) FILTER (WHERE s.quantity <= COALESCE(i.min_level, ${LOW_STOCK_DEFAULT})) AS low
     FROM consumable_stocks s JOIN consumable_items i ON i.id = s.consumable_item_id
     WHERE i.is_active`,
    { type: QueryTypes.SELECT }
  );
  return { totalItems: Number(row?.items ?? 0), totalValueUSD: Number(row?.value ?? 0), lowStockCount: Number(row?.low ?? 0) };
};

const getStock = async (id: string, transaction?: Transaction) => {
  const row = await Stock.findByPk(id, { include: [{ model: Item, as: ITEM_ALIAS }], transaction });
  if (!row) throw notFound('Stock record');
  return toStock(row);
};

export const getStockRecord = (id: string) => getStock(id);

/** The item's stock record, created empty if it has none. Call with the item row locked. */
const ensureStockRow = async (
  item: Row,
  prices: { unitPrice?: number | null; unitPriceUSD?: number | null },
  t: Transaction,
  extra: Record<string, unknown> = {}
) => {
  const existing = await lockStockRow(item.id, t);
  if (existing) return existing;
  return Stock.create(
    {
      consumableItemId: item.id,
      quantity: 0,
      unitPrice: prices.unitPrice ?? item.unitPrice ?? null,
      unitPriceUSD: prices.unitPriceUSD ?? item.unitPriceUSD ?? null,
      ...extra,
    },
    { transaction: t }
  );
};

/** Sets an absolute quantity on a locked stock row. */
const setStockQuantity = async (stock: Row, targetCents: number, t: Transaction) => {
  const delta = targetCents - toCents(stock.quantity);
  if (delta !== 0 && (await changeConsumableStock(stock.id, delta, t)) === null) {
    throw new AppError('INSUFFICIENT_STOCK', 'The stock level changed while saving. Try again.');
  }
};

/** Goods received into stores: adds to the item's stock record (creating it if needed). */
export const receiveStock = (input: ReceiveStockInput) =>
  inTransaction(async (t) => {
    // Locking the item serialises receipts, so two first receipts cannot create two records
    const item = await Item.findByPk(input.consumableItemId, { lock: t.LOCK.UPDATE, transaction: t });
    if (!item) throw fieldError('consumableItemId', 'Choose an item');

    const details = Object.fromEntries(
      Object.entries({
        unitPrice: input.unitPrice,
        unitPriceUSD: input.unitPriceUSD,
        location: input.location,
        binLocation: input.binLocation,
        batchNumber: input.batchNumber,
        expiryDate: input.expiryDate,
        notes: input.notes,
      }).filter(([, v]) => v !== null && v !== undefined)
    );
    const stock = await ensureStockRow(item, input, t, { location: input.location ?? 'Main Store' });
    await Stock.update({ ...details, lastRestocked: new Date() }, { where: { id: stock.id }, transaction: t });
    // Positive change: only fails if the row vanished
    if ((await changeConsumableStock(stock.id, toCents(input.quantity), t)) === null) throw notFound('Stock record');
    return getStock(stock.id, t);
  });

/** Stock take or correction. Removing more than is on hand is refused rather than clamped to 0. */
export const adjustStock = (id: string, input: AdjustStockInput) =>
  inTransaction(async (t) => {
    const stock = await Stock.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
    if (!stock) throw notFound('Stock record');
    const current = toCents(stock.quantity);
    const amount = toCents(input.quantity);
    const delta = input.type === 'add' ? amount : input.type === 'remove' ? -amount : amount - current;

    if (delta !== 0 && (await changeConsumableStock(stock.id, delta, t)) === null) {
      throw new AppError('INSUFFICIENT_STOCK', `Only ${fromCents(current)} in stock; you cannot remove ${fromCents(amount)}`);
    }
    const line = `[${new Date().toISOString()}] ${input.type} ${fromCents(amount)}: ${input.reason}`;
    await Stock.update(
      {
        notes: stock.notes ? `${stock.notes}\n${line}` : line,
        ...(input.type === 'set' ? { lastStockTake: new Date() } : {}),
      },
      { where: { id }, transaction: t }
    );
    return { stock: await getStock(id, t), previousQuantity: Number(fromCents(current)) };
  });

// ---------------------------------------------------------------- allocations (issues)

export const allocationIncludes = [
  { model: Item, as: 'consumableItem', attributes: ['id', 'productCode', 'description', 'unit'] },
  { model: models.Section, as: 'section', attributes: ['id', 'name'] },
  { model: models.Department, as: 'department', attributes: ['id', 'name'] },
  { model: models.ConsumableRequest, as: 'request', attributes: ['id', 'requestNumber'] },
  personInclude('issuedBy'),
];

export const toAllocation = (row: Row) => ({
  id: row.id as string,
  consumableRequestId: (row.consumableRequestId as string | null) ?? null,
  requestNumber: (row.request?.requestNumber as string | null) ?? null,
  item: {
    id: row.consumableItem?.id as string,
    productCode: row.consumableItem?.productCode as string,
    description: row.consumableItem?.description as string,
    unit: row.consumableItem?.unit as string,
  },
  section: toRef(row.section),
  department: toRef(row.department),
  issuedBy: toPerson(row.issuedBy),
  quantity: Number(row.quantity),
  unitPriceUSD: num(row.unitPriceUSD),
  totalValueUSD: num(row.totalValueUSD),
  issueDate: row.issueDate as Date,
  batchNumber: (row.batchNumber as string | null) ?? null,
});

export type AllocationDto = ReturnType<typeof toAllocation>;

export const listAllocations = async (auth: AuthContext, q: z.infer<typeof allocationListQuery>) => {
  const where: WhereOptions[] = [orgScope(auth)];
  if (q.consumableItemId) where.push({ consumableItemId: q.consumableItemId });
  if (q.consumableRequestId) where.push({ consumableRequestId: q.consumableRequestId });
  if (q.sectionId) where.push({ sectionId: q.sectionId });
  if (q.departmentId) where.push({ departmentId: q.departmentId });
  if (q.from) where.push({ issueDate: { [Op.gte]: dayStart(q.from) } });
  if (q.to) where.push({ issueDate: { [Op.lt]: dayAfter(q.to) } });
  if (q.q) {
    where.push({
      [Op.or]: [
        { '$consumableItem.product_code$': { [Op.iLike]: likeTerm(q.q) } },
        { '$consumableItem.description$': { [Op.iLike]: likeTerm(q.q) } },
      ],
    });
  }

  const { rows, count } = await Allocation.findAndCountAll({
    where: { [Op.and]: where },
    include: allocationIncludes,
    order: [[q.sort ?? 'issueDate', q.sort ? q.order.toUpperCase() : 'DESC']],
    ...pageWindow(q),
  });
  return { rows: rows.map(toAllocation), count };
};
