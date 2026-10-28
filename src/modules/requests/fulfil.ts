import { Op } from 'sequelize';
import { ROLES, type AuthContext } from '../../core/auth';
import { inTransaction, models, type Row } from '../../core/db';
import { AppError, conflict, forbidden, notFound } from '../../core/errors';
import { requestScope } from './policy';
import type { FulfilInput } from './schemas';
import { STATUS_LABEL, lockRequest, requestNumber, type Transition } from './service';
import { FULFILLABLE, FULFILLERS, type RequestStatus } from './workflow';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { deductStock } = require('../../../helpers/stock_helper') as {
  deductStock: (stockId: string, quantity: number, opts: { transaction: unknown }) => Promise<number | null>;
};

const invalid = (message: string) => new AppError('VALIDATION_FAILED', message, { fieldErrors: { items: [message] } });

export interface IssuedLine {
  requestItemId: string;
  ppeName: string;
  quantity: number;
  size: string | null;
}

export interface FulfilResult extends Transition {
  issued: IssuedLine[];
  outstanding: Array<{ requestItemId: string; ppeName: string; quantity: number; size: string | null }>;
}

// Same default as the renewals screen, so an item without a frequency is not due again at once
const DEFAULT_RENEWAL_MONTHS = 12;

const nextRenewal = (issueDate: Date, months: number | null) => {
  const d = new Date(issueDate);
  d.setMonth(d.getMonth() + (months || DEFAULT_RENEWAL_MONTHS));
  return d;
};

// Allocation types have no 'new'; v1 records a new request as a new-employee issue
const allocationType = (requestType: string | null) => (requestType === 'new' ? 'new-employee' : (requestType ?? 'replacement'));

// These issue the employee's next set, so the set they replace is closed out of renewals
const RENEWING_TYPES = new Set(['annual', 'replacement']);

/**
 * Issues stock against an approved (or partly issued) request, one allocation per line, as the
 * v1 stores fulfilment does. Every line is capped at what is still outstanding on its item, and the
 * whole issue rolls back if any stock line is short.
 */
export const fulfilRequest = (auth: AuthContext, id: string, input: FulfilInput) =>
  inTransaction<FulfilResult>(async (t) => {
    if (auth.role !== ROLES.ADMIN && !FULFILLERS.includes(auth.role)) throw forbidden();
    const request = await lockRequest(auth, id, t);
    const from = request.status as RequestStatus;
    if (!FULFILLABLE.includes(from)) {
      throw new AppError('INVALID_TRANSITION', `This request is ${STATUS_LABEL[from].toLowerCase()} and cannot be issued`);
    }

    const items = await models.RequestItem.findAll({
      where: { requestId: id },
      include: [{ model: models.PPEItem, as: 'ppeItem' }],
      transaction: t,
    });
    const itemById = new Map(items.map((i) => [i.id as string, i]));
    const stockIds = [...new Set(input.items.map((l) => l.stockId))];
    // Locked in id order up front so two issues drawing on the same lines cannot deadlock
    const stocks = await models.Stock.findAll({
      where: { id: stockIds },
      order: [['id', 'ASC']],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    const stockById = new Map(stocks.map((s) => [s.id as string, s]));

    const outstanding = new Map(items.map((i) => [i.id as string, Number(i.quantity) - Number(i.approvedQuantity ?? 0)]));
    const issuedByItem = new Map<string, number>();
    const issued: IssuedLine[] = [];
    let totalCost = 0;
    const issueDate = new Date();
    const renewed = new Set<string>();

    for (const line of input.items) {
      const item = itemById.get(line.requestItemId);
      if (!item) throw invalid('One of the items is not on this request');
      // The client echoes what it saw issued; compared with the value loaded under the request lock
      if (line.issued !== undefined && line.issued !== Number(item.approvedQuantity ?? 0)) {
        throw conflict('Items on this request were issued while you were working. Check the request and try again.');
      }
      const stock = stockById.get(line.stockId);
      if (!stock || stock.ppeItemId !== item.ppeItemId) {
        throw invalid(`Choose a stock line of ${item.ppeItem?.name ?? 'the requested item'}`);
      }

      const left = outstanding.get(item.id) ?? 0;
      const quantity = Math.min(line.quantity, left);
      if (quantity <= 0) continue;

      const remaining = await deductStock(stock.id, quantity, { transaction: t });
      if (remaining === null) {
        const fresh = await models.Stock.findByPk(stock.id, { attributes: ['quantity'], transaction: t });
        throw new AppError(
          'INSUFFICIENT_STOCK',
          `Not enough ${item.ppeItem?.name ?? 'stock'}${stock.size ? ` (size ${stock.size})` : ''} in stock: ${fresh?.quantity ?? 0} available, ${quantity} needed`,
          { requestItemId: item.id, stockId: stock.id, available: Number(fresh?.quantity ?? 0), requested: quantity }
        );
      }

      if (RENEWING_TYPES.has(request.requestType) && !renewed.has(item.ppeItemId)) {
        renewed.add(item.ppeItemId);
        await closePrevious(request, item.ppeItemId, issueDate, t);
      }

      const months = item.ppeItem?.replacementFrequency ? parseInt(item.ppeItem.replacementFrequency, 10) : null;
      const cost = (parseFloat(stock.unitPriceUSD) || 0) * quantity;
      const size: string | null = stock.size || item.size || null;
      const sizeNote = item.size && stock.size && stock.size !== item.size ? `; size override: ${item.size} → ${stock.size}` : '';
      await models.Allocation.create(
        {
          employeeId: request.employeeId,
          ppeItemId: item.ppeItemId,
          requestId: request.id,
          requestItemId: item.id,
          stockId: stock.id,
          issuedById: auth.userId,
          quantity,
          size,
          issueDate,
          allocationType: allocationType(request.requestType),
          nextRenewalDate: nextRenewal(issueDate, months && !Number.isNaN(months) ? months : null),
          status: 'active',
          totalCost: cost,
          notes: `Allocated from request #${requestNumber(request.id)}${sizeNote}`,
        },
        { transaction: t }
      );

      outstanding.set(item.id, left - quantity);
      issuedByItem.set(item.id, (issuedByItem.get(item.id) ?? 0) + quantity);
      totalCost += cost;
      issued.push({ requestItemId: item.id, ppeName: item.ppeItem?.name ?? 'PPE item', quantity, size });
    }

    if (issued.length === 0) throw conflict('Everything on this request has already been issued');

    for (const [itemId, qty] of issuedByItem) {
      const item = itemById.get(itemId)!;
      await item.update({ approvedQuantity: Number(item.approvedQuantity ?? 0) + qty }, { transaction: t });
    }

    const stillOpen = items.filter((i) => (outstanding.get(i.id) ?? 0) > 0);
    const to: RequestStatus = stillOpen.length ? 'partially-fulfilled' : 'fulfilled';
    await request.update(
      {
        status: to,
        fulfilledDate: issueDate,
        fulfilledByUserId: auth.userId,
        ...(input.note ? { storesComment: input.note } : {}),
      },
      { transaction: t }
    );

    await spendBudget(request, totalCost, t);

    return {
      from,
      to,
      issued,
      outstanding: stillOpen.map((i) => ({
        requestItemId: i.id as string,
        ppeName: (i.ppeItem?.name as string | undefined) ?? 'PPE item',
        quantity: outstanding.get(i.id) ?? 0,
        size: (i.size as string | null) ?? null,
      })),
    };
  });

/** Marks the employee's earlier allocations of the item as replaced by this request. */
const closePrevious = async (request: Row, ppeItemId: string, issueDate: Date, t: Parameters<typeof lockRequest>[2]) => {
  if (!request.employeeId) return;
  const prior = await models.Allocation.findAll({
    where: { employeeId: request.employeeId, ppeItemId, status: ['active', 'expired'], issueDate: { [Op.lt]: issueDate } },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  const note = `Replaced by request #${requestNumber(request.id)}`;
  for (const p of prior) {
    await p.update({ status: 'replaced', notes: [p.notes, note].filter(Boolean).join('; ') }, { transaction: t });
  }
};

/**
 * v1 adds the issue cost to the department's budget for the current fiscal year (the department of
 * the employee's section). Overspending is recorded, never a reason to refuse the issue: the model's
 * min(0) rule on the legacy remainingBudget column would otherwise reject the save and roll back the
 * whole issue, so validation is skipped and the legacy columns are written here, floored at 0.
 */
const spendBudget = async (request: Row, amount: number, t: Parameters<typeof lockRequest>[2]) => {
  if (amount <= 0) return;
  const employee = request.employeeId
    ? await models.Employee.findByPk(request.employeeId, { attributes: ['sectionId'], transaction: t })
    : null;
  const sectionId = employee?.sectionId ?? request.sectionId;
  const section = sectionId ? await models.Section.findByPk(sectionId, { attributes: ['departmentId'], transaction: t }) : null;
  const departmentId = section?.departmentId ?? request.departmentId;
  if (!departmentId) return;
  const budget = await models.Budget.findOne({
    where: { departmentId, fiscalYear: new Date().getFullYear() },
    order: [['createdAt', 'ASC']],
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!budget) return;
  const allocated = parseFloat(budget.allocatedAmount) || 0;
  const spent = Math.round(((parseFloat(budget.totalSpent) || 0) + amount) * 100) / 100;
  await budget.update(
    { totalSpent: spent, totalBudget: allocated, allocatedBudget: spent, remainingBudget: Math.max(0, allocated - spent) },
    { transaction: t, validate: false }
  );
};

// Employee.gender is MALE/FEMALE/OTHER; stock variants are male/female/unisex
const stockGender = (g: unknown) => {
  const v = typeof g === 'string' ? g.toLowerCase() : null;
  return v === 'male' || v === 'female' ? v : null;
};

/** Stock lines stores can issue from, per outstanding item (matching size and gender first). */
export const stockOptions = async (auth: AuthContext, id: string) => {
  const request = await models.Request.findOne({
    where: { [Op.and]: [requestScope(auth), { id }] },
    attributes: ['id', 'employeeId'],
  });
  if (!request) throw notFound('Request');
  const employee = request.employeeId
    ? await models.Employee.findByPk(request.employeeId, { attributes: ['gender'] })
    : null;
  const gender = stockGender(employee?.gender);
  const items = await models.RequestItem.findAll({
    where: { requestId: id },
    include: [{ model: models.PPEItem, as: 'ppeItem', attributes: ['id', 'name'] }],
    order: [['createdAt', 'ASC']],
  });
  const stocks = items.length
    ? await models.Stock.findAll({
        where: { ppeItemId: [...new Set(items.map((i) => i.ppeItemId))], quantity: { [Op.gt]: 0 } },
        order: [['quantity', 'DESC']],
      })
    : [];

  return items.map((i) => {
    const size = (i.size as string | null) ?? null;
    const lines = stocks
      .filter((s) => s.ppeItemId === i.ppeItemId)
      .map((s) => ({
        stockId: s.id as string,
        size: (s.size as string | null) ?? null,
        color: (s.color as string | null) ?? null,
        location: [s.location, s.binLocation].filter(Boolean).join(' / ') || null,
        quantity: Number(s.quantity),
        unitPriceUSD: s.unitPriceUSD === null ? null : Number(s.unitPriceUSD),
        gender: (s.gender as string | null) ?? null,
        matchesSize: !size || !s.size || String(s.size).toLowerCase() === size.toLowerCase(),
        matchesGender: !gender || !stockGender(s.gender) || stockGender(s.gender) === gender,
      }))
      .sort(
        (a, b) =>
          Number(b.matchesSize && b.matchesGender) - Number(a.matchesSize && a.matchesGender) ||
          Number(b.matchesSize) - Number(a.matchesSize) ||
          b.quantity - a.quantity
      );
    return {
      requestItemId: i.id as string,
      ppeItemName: (i.ppeItem?.name as string | undefined) ?? 'PPE item',
      size,
      issued: Number(i.approvedQuantity ?? 0),
      outstanding: Math.max(0, Number(i.quantity) - Number(i.approvedQuantity ?? 0)),
      stock: lines,
    };
  });
};
