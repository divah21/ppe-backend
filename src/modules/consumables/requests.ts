import { Op, QueryTypes, literal, type Transaction, type WhereOptions } from 'sequelize';
import type { z } from 'zod';
import { ROLES, type AuthContext } from '../../core/auth';
import { inTransaction, models, sequelize, type Row } from '../../core/db';
import { AppError, forbidden, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { allowedActions, isAdmin, orgScope, type RequestAction } from './policy';
import type { ApproveInput, CreateRequestInput, FulfilInput, RequestStatus, requestListQuery } from './schemas';
import { allocationIncludes, toAllocation } from './service';
import { STOCK_ON_HAND, dayAfter, dayStart, fieldError, personInclude, toPerson, toRef } from './shared';
import { changeConsumableStock, fromCents, lockStockRow, num, toCents } from './stock';

const {
  ConsumableRequest: Request,
  ConsumableRequestItem: Line,
  ConsumableItem: Item,
  ConsumableAllocation: Allocation,
  Section,
  Department,
} = models;

const ITEM_COUNT = literal(
  '(SELECT COUNT(*) FROM consumable_request_items ri WHERE ri.consumable_request_id = "ConsumableRequest"."id")'
);

const headerIncludes = [
  { model: Section, as: 'section', attributes: ['id', 'name'] },
  { model: Department, as: 'department', attributes: ['id', 'name'] },
  personInclude('requestedBy'),
  personInclude('hodApprover'),
  personInclude('storesApprover'),
];

/** Line value in cents: quantity x unit price, both carried as cents. */
const valueCents = (qtyCents: number, priceCents: number) => Math.round((qtyCents * priceCents) / 100);

const toRequest = (auth: AuthContext, row: Row) => ({
  id: row.id as string,
  requestNumber: (row.requestNumber as string | null) ?? null,
  status: row.status as RequestStatus,
  priority: row.priority as string,
  requestDate: row.requestDate as Date,
  requiredByDate: (row.requiredByDate as Date | null) ?? null,
  purpose: (row.purpose as string | null) ?? null,
  notes: (row.notes as string | null) ?? null,
  section: toRef(row.section),
  department: toRef(row.department),
  requestedBy: toPerson(row.requestedBy),
  hodApprover: toPerson(row.hodApprover),
  hodApprovalDate: (row.hodApprovalDate as Date | null) ?? null,
  hodComments: (row.hodComments as string | null) ?? null,
  storesApprover: toPerson(row.storesApprover),
  storesApprovalDate: (row.storesApprovalDate as Date | null) ?? null,
  storesComments: (row.storesComments as string | null) ?? null,
  fulfilledDate: (row.fulfilledDate as Date | null) ?? null,
  totalValueUSD: num(row.totalValueUSD),
  itemCount: Number(row.get('itemCount') ?? 0),
  createdAt: row.createdAt as Date,
  allowedActions: allowedActions(auth, { status: row.status, requestedById: row.requestedById }),
});

export type RequestDto = ReturnType<typeof toRequest>;

const toLine = (row: Row) => {
  const approved = row.quantityApproved === null ? null : toCents(row.quantityApproved);
  const fulfilled = toCents(row.quantityFulfilled);
  return {
    id: row.id as string,
    consumableItemId: row.consumableItemId as string,
    productCode: row.consumableItem?.productCode as string,
    description: row.consumableItem?.description as string,
    unit: row.consumableItem?.unit as string,
    quantityRequested: Number(row.quantityRequested),
    quantityApproved: num(row.quantityApproved),
    quantityFulfilled: Number(fromCents(fulfilled)),
    outstanding: approved === null ? null : Number(fromCents(Math.max(0, approved - fulfilled))),
    unitPriceUSD: num(row.unitPriceUSD),
    totalValueUSD: num(row.totalValueUSD),
    status: row.status as string,
    remarks: (row.remarks as string | null) ?? null,
    inStock: Number(row.get('inStock') ?? 0),
  };
};

export const listRequests = async (auth: AuthContext, q: z.infer<typeof requestListQuery>) => {
  // Filters narrow the user's scope; they can never widen it
  const where: WhereOptions[] = [orgScope(auth)];
  if (q.status) where.push({ status: q.status });
  if (q.priority) where.push({ priority: q.priority });
  if (q.sectionId) where.push({ sectionId: q.sectionId });
  if (q.departmentId) where.push({ departmentId: q.departmentId });
  if (q.from) where.push({ requestDate: { [Op.gte]: dayStart(q.from) } });
  if (q.to) where.push({ requestDate: { [Op.lt]: dayAfter(q.to) } });
  if (q.q) {
    where.push({
      [Op.or]: [{ requestNumber: { [Op.iLike]: likeTerm(q.q) } }, { purpose: { [Op.iLike]: likeTerm(q.q) } }],
    });
  }

  const { rows, count } = await Request.findAndCountAll({
    where: { [Op.and]: where },
    attributes: { include: [[ITEM_COUNT, 'itemCount']] },
    include: headerIncludes,
    order: q.sort ? [[q.sort, q.order.toUpperCase()]] : [['createdAt', 'DESC']],
    ...pageWindow(q),
  });
  return { rows: rows.map((r) => toRequest(auth, r)), count };
};

export const getRequest = async (auth: AuthContext, id: string, transaction?: Transaction) => {
  const row = await Request.findOne({
    where: { [Op.and]: [orgScope(auth), { id }] },
    attributes: { include: [[ITEM_COUNT, 'itemCount']] },
    include: headerIncludes,
    transaction,
  });
  if (!row) throw notFound('Request');

  const [lines, issues] = await Promise.all([
    Line.findAll({
      where: { consumableRequestId: id },
      attributes: { include: [[literal(STOCK_ON_HAND('"ConsumableRequestItem"."consumable_item_id"')), 'inStock']] },
      include: [{ model: Item, as: 'consumableItem', attributes: ['id', 'productCode', 'description', 'unit'] }],
      order: [[{ model: Item, as: 'consumableItem' }, 'description', 'ASC']],
      transaction,
    }),
    Allocation.findAll({
      where: { consumableRequestId: id },
      include: allocationIncludes,
      order: [['issueDate', 'ASC']],
      transaction,
    }),
  ]);
  return { ...toRequest(auth, row), items: lines.map(toLine), issues: issues.map(toAllocation) };
};

export type RequestDetailDto = Awaited<ReturnType<typeof getRequest>>;

/** Sections the user may raise a request for. */
export const requestSections = async (auth: AuthContext) => {
  let where: WhereOptions;
  if (isAdmin(auth)) where = {};
  else if (auth.role === ROLES.HOD && auth.departmentId) where = { departmentId: auth.departmentId };
  else if (auth.role === ROLES.SECTION_REP && auth.sectionId) where = { id: auth.sectionId };
  else return [];
  const rows = await Section.findAll({
    where: { [Op.and]: [where, { isActive: true }] },
    attributes: ['id', 'name'],
    include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
    order: [['name', 'ASC']],
  });
  return rows.map((r) => ({ id: r.id as string, name: r.name as string, department: toRef(r.department) }));
};

const nextRequestNumber = async (t: Transaction) => {
  // Serialise numbering; a count (as v1 did) repeats numbers once a request is deleted
  await sequelize.query(`SELECT pg_advisory_xact_lock(hashtext('consumable_requests.request_number'))`, { transaction: t });
  const prefix = `CR-${new Date().getFullYear()}-`;
  const [row] = await sequelize.query<{ n: number }>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '^CR-[0-9]{4}-([0-9]+)$') AS INTEGER)), 0) AS n
     FROM consumable_requests WHERE request_number LIKE :like`,
    { replacements: { like: `${prefix}%` }, type: QueryTypes.SELECT, transaction: t }
  );
  return `${prefix}${String(Number(row?.n ?? 0) + 1).padStart(4, '0')}`;
};

export const createRequest = async (auth: AuthContext, input: CreateRequestInput) => {
  const sectionId = input.sectionId ?? auth.sectionId;
  if (!sectionId) throw fieldError('sectionId', 'Choose the section this request is for');
  const section = await Section.findByPk(sectionId);
  if (!section || !section.isActive) throw fieldError('sectionId', 'Choose an active section');
  if (auth.role === ROLES.SECTION_REP && section.id !== auth.sectionId) {
    throw forbidden('You can only request consumables for your own section');
  }
  if (auth.role === ROLES.HOD && section.departmentId !== auth.departmentId) {
    throw forbidden('You can only request consumables for sections in your department');
  }

  const ids = input.items.map((i) => i.consumableItemId);
  const items = await Item.findAll({ where: { id: ids, isActive: true } });
  const byId = new Map(items.map((i) => [i.id as string, i]));
  if (ids.some((id) => !byId.has(id))) throw fieldError('items', 'One or more items are no longer available');

  const id = await inTransaction(async (t) => {
    const lines = input.items.map((line) => {
      const item = byId.get(line.consumableItemId)!;
      const price = toCents(item.unitPriceUSD);
      const qty = toCents(line.quantity);
      return { item, qty, price, total: valueCents(qty, price), remarks: line.remarks };
    });
    const request = await Request.create(
      {
        requestNumber: await nextRequestNumber(t),
        sectionId: section.id,
        departmentId: section.departmentId,
        requestedById: auth.userId,
        status: 'pending-hod-approval',
        priority: input.priority,
        requestDate: new Date(),
        requiredByDate: input.requiredByDate,
        purpose: input.purpose,
        notes: input.notes,
        totalValueUSD: fromCents(lines.reduce((s, l) => s + l.total, 0)),
      },
      // The v1 numbering hook is replaced by nextRequestNumber
      { transaction: t, hooks: false }
    );
    await Line.bulkCreate(
      lines.map((l) => ({
        consumableRequestId: request.id,
        consumableItemId: l.item.id,
        quantityRequested: fromCents(l.qty),
        quantityFulfilled: 0,
        unitPriceUSD: fromCents(l.price),
        totalValueUSD: fromCents(l.total),
        status: 'pending',
        remarks: l.remarks,
      })),
      { transaction: t }
    );
    return request.id as string;
  });
  return getRequest(auth, id);
};

/** Loads and locks a request in the user's scope and checks the action is allowed now. */
const lockForAction = async (auth: AuthContext, id: string, action: RequestAction, t: Transaction) => {
  const row = await Request.findOne({
    where: { [Op.and]: [orgScope(auth), { id }] },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });
  if (!row) throw notFound('Request');
  if (!allowedActions(auth, { status: row.status, requestedById: row.requestedById }).includes(action)) {
    // Same action, wrong moment (someone else got there first) vs. not this user's call
    const anyStatus = allowedActions(auth, { status: actionStatus[action], requestedById: row.requestedById });
    if (anyStatus.includes(action)) {
      throw new AppError('INVALID_TRANSITION', `This request is ${statusLabel(row.status)} and can no longer be changed this way`);
    }
    throw forbidden();
  }
  const lines = await Line.findAll({
    where: { consumableRequestId: id },
    include: [{ model: Item, as: 'consumableItem', attributes: ['id', 'description'] }],
    order: [['consumableItemId', 'ASC']],
    lock: { level: t.LOCK.UPDATE, of: Line },
    transaction: t,
  });
  return { row, lines };
};

const actionStatus: Record<RequestAction, RequestStatus> = {
  approve: 'pending-hod-approval',
  reject: 'pending-hod-approval',
  cancel: 'pending-hod-approval',
  fulfil: 'stores-review',
  'stores-reject': 'stores-review',
};

const statusLabel = (s: string) => s.replace(/-/g, ' ').replace('hod', 'HOD');

/** Maps optional per-line quantities onto the request's lines, rejecting unknown ones. */
const lineQuantities = (lines: Row[], input: Array<{ id: string; quantity: number }> | undefined) => {
  const ids = new Set(lines.map((l) => l.id as string));
  const given = new Map<string, number>();
  for (const l of input ?? []) {
    if (!ids.has(l.id)) throw fieldError('items', 'One of the lines is not on this request');
    given.set(l.id, toCents(l.quantity));
  }
  return given;
};

export const approveRequest = (auth: AuthContext, id: string, input: ApproveInput) =>
  inTransaction(async (t) => {
    const { row, lines } = await lockForAction(auth, id, 'approve', t);
    const given = lineQuantities(lines, input.items);

    let total = 0;
    let anyApproved = false;
    for (const line of lines) {
      const requested = toCents(line.quantityRequested);
      const approved = given.get(line.id) ?? requested;
      if (approved > requested) {
        throw fieldError('items', `You cannot approve more ${line.consumableItem?.description} than was requested`);
      }
      const value = valueCents(approved, toCents(line.unitPriceUSD));
      total += value;
      anyApproved ||= approved > 0;
      await Line.update(
        { quantityApproved: fromCents(approved), totalValueUSD: fromCents(value), status: approved > 0 ? 'approved' : 'rejected' },
        { where: { id: line.id }, transaction: t }
      );
    }
    if (!anyApproved) throw fieldError('items', 'Approve at least one item, or reject the request');

    await Request.update(
      {
        status: 'stores-review',
        hodApproverId: auth.userId,
        hodApprovalDate: new Date(),
        hodComments: input.comments,
        totalValueUSD: fromCents(total),
      },
      { where: { id: row.id }, transaction: t }
    );
    return getRequest(auth, id, t);
  });

export const rejectRequest = (auth: AuthContext, id: string, comments: string) =>
  inTransaction(async (t) => {
    await lockForAction(auth, id, 'reject', t);
    await Line.update({ status: 'rejected' }, { where: { consumableRequestId: id }, transaction: t });
    await Request.update(
      { status: 'hod-rejected', hodApproverId: auth.userId, hodApprovalDate: new Date(), hodComments: comments },
      { where: { id }, transaction: t }
    );
    return getRequest(auth, id, t);
  });

export const storesRejectRequest = (auth: AuthContext, id: string, comments: string) =>
  inTransaction(async (t) => {
    await lockForAction(auth, id, 'stores-reject', t);
    await Line.update({ status: 'rejected' }, { where: { consumableRequestId: id }, transaction: t });
    await Request.update(
      { status: 'stores-rejected', storesApproverId: auth.userId, storesApprovalDate: new Date(), storesComments: comments },
      { where: { id }, transaction: t }
    );
    return getRequest(auth, id, t);
  });

export const cancelRequest = (auth: AuthContext, id: string, comments: string | null) =>
  inTransaction(async (t) => {
    const { row } = await lockForAction(auth, id, 'cancel', t);
    const note = `Cancelled${comments ? `: ${comments}` : ''}`;
    await Request.update(
      { status: 'cancelled', notes: row.notes ? `${row.notes}\n${note}` : note },
      { where: { id }, transaction: t }
    );
    return getRequest(auth, id, t);
  });

export interface Shortage {
  lineId: string;
  description: string;
  wanted: number;
  inStock: number;
}

/**
 * Stores issues approved quantities. Each line is deducted atomically; a line without enough
 * stock is left outstanding (as in v1) and reported, and can be issued later.
 */
export const fulfilRequest = (auth: AuthContext, id: string, input: FulfilInput) =>
  inTransaction(async (t) => {
    const { row, lines } = await lockForAction(auth, id, 'fulfil', t);
    const given = lineQuantities(lines, input.items);

    const plan = lines.map((line) => {
      const approved = toCents(line.quantityApproved ?? line.quantityRequested);
      const fulfilled = toCents(line.quantityFulfilled);
      const outstanding = Math.max(0, approved - fulfilled);
      const issue = given.get(line.id) ?? outstanding;
      if (issue > outstanding) {
        throw fieldError(
          'items',
          `Only ${fromCents(outstanding)} of ${line.consumableItem?.description} is outstanding on this request`
        );
      }
      return { line, approved, fulfilled, issue };
    });
    if (!plan.some((p) => p.issue > 0)) throw fieldError('items', 'Enter a quantity to issue');

    const shortages: Shortage[] = [];
    const issuedAt = new Date();
    // Lines are ordered by item, so concurrent issues lock stock rows in the same order
    for (const p of plan) {
      if (p.issue === 0) continue;
      const stock = await lockStockRow(p.line.consumableItemId, t);
      const left = stock ? await changeConsumableStock(stock.id, -p.issue, t) : null;
      if (!stock || left === null) {
        shortages.push({
          lineId: p.line.id,
          description: p.line.consumableItem?.description,
          wanted: Number(fromCents(p.issue)),
          inStock: stock ? Number(stock.quantity) : 0,
        });
        continue;
      }
      const price = toCents(p.line.unitPriceUSD);
      await Allocation.create(
        {
          consumableRequestId: row.id,
          consumableItemId: p.line.consumableItemId,
          sectionId: row.sectionId,
          departmentId: row.departmentId,
          issuedById: auth.userId,
          quantity: fromCents(p.issue),
          unitPriceUSD: fromCents(price),
          totalValueUSD: fromCents(valueCents(p.issue, price)),
          issueDate: issuedAt,
          batchNumber: stock.batchNumber ?? null,
          purpose: row.purpose,
        },
        // The model hook recomputes the value in floating point
        { transaction: t, hooks: false }
      );
      p.fulfilled += p.issue;
    }

    if (shortages.length === plan.filter((p) => p.issue > 0).length) {
      throw new AppError('INSUFFICIENT_STOCK', 'There is not enough stock to issue any of these items', { shortages });
    }

    let complete = true;
    for (const p of plan) {
      const status = p.approved === 0 ? 'rejected' : p.fulfilled >= p.approved ? 'fulfilled' : p.fulfilled > 0 ? 'partial' : 'approved';
      if (p.approved > 0 && p.fulfilled < p.approved) complete = false;
      await Line.update(
        { quantityFulfilled: fromCents(p.fulfilled), status },
        { where: { id: p.line.id }, transaction: t }
      );
    }

    await Request.update(
      {
        status: complete ? 'fulfilled' : 'partially-fulfilled',
        storesApproverId: auth.userId,
        storesApprovalDate: issuedAt,
        ...(input.comments ? { storesComments: input.comments } : {}),
        fulfilledDate: complete ? issuedAt : null,
      },
      { where: { id }, transaction: t }
    );
    return { ...(await getRequest(auth, id, t)), shortages };
  });
