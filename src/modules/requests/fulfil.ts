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

const nextRenewal = (issueDate: Date, months: number | null) => {
  if (!months) return null;
  const d = new Date(issueDate);
  d.setMonth(d.getMonth() + months);
  return d;
};

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
    const stocks = await models.Stock.findAll({ where: { id: stockIds }, transaction: t });
    const stockById = new Map(stocks.map((s) => [s.id as string, s]));

    const outstanding = new Map(items.map((i) => [i.id as string, Number(i.quantity) - Number(i.approvedQuantity ?? 0)]));
    const issuedByItem = new Map<string, number>();
    const issued: IssuedLine[] = [];
    let totalCost = 0;
    const issueDate = new Date();

    for (const line of input.items) {
      const item = itemById.get(line.requestItemId);
      if (!item) throw invalid('One of the items is not on this request');
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

/** v1 adds the issue cost to the department's budget for the current fiscal year. */
const spendBudget = async (request: Row, amount: number, t: Parameters<typeof lockRequest>[2]) => {
  if (amount <= 0) return;
  const section = request.sectionId
    ? await models.Section.findByPk(request.sectionId, { attributes: ['departmentId'], transaction: t })
    : null;
  const departmentId = section?.departmentId ?? request.departmentId;
  if (!departmentId) return;
  const budget = await models.Budget.findOne({
    where: { departmentId, fiscalYear: new Date().getFullYear() },
    order: [['createdAt', 'ASC']],
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!budget) return;
  const spent = (parseFloat(budget.totalSpent) || 0) + amount;
  await budget.update(
    { totalSpent: spent, remainingBudget: (parseFloat(budget.allocatedAmount) || 0) - spent },
    { transaction: t }
  );
};

/** Stock lines stores can issue from, per outstanding item (matching size first). */
export const stockOptions = async (auth: AuthContext, id: string) => {
  const request = await models.Request.findOne({ where: { [Op.and]: [requestScope(auth), { id }] }, attributes: ['id'] });
  if (!request) throw notFound('Request');
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
        matchesSize: !size || !s.size || String(s.size).toLowerCase() === size.toLowerCase(),
      }))
      .sort((a, b) => Number(b.matchesSize) - Number(a.matchesSize) || b.quantity - a.quantity);
    return {
      requestItemId: i.id as string,
      ppeItemName: (i.ppeItem?.name as string | undefined) ?? 'PPE item',
      size,
      outstanding: Math.max(0, Number(i.quantity) - Number(i.approvedQuantity ?? 0)),
      stock: lines,
    };
  });
};
