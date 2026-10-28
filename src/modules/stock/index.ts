import { Router } from 'express';
import { audit } from '../../core/audit';
import { ROLES, authenticate, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { adjustBody, bulkTopupBody, stockCreateBody, stockListQuery } from './schemas';
import { adjustStock, bulkTopup, createStock, getStock, listStock, stockLookups, stockSummary } from './service';

const router = Router();
router.use(authenticate);

const canRead = requireRole(ROLES.STORES, ROLES.SHEQ);
const canWrite = requireRole(ROLES.STORES);

router.get(
  '/',
  canRead,
  route(async (req, res) => {
    const q = parse(stockListQuery, req.query);
    const { rows, count } = await listStock(q);
    return paged(res, rows, count, q);
  })
);

router.get('/summary', canRead, route(async (_req, res) => ok(res, await stockSummary())));

router.get('/lookups', canRead, route(async (_req, res) => ok(res, await stockLookups())));

router.get(
  '/:id',
  canRead,
  route(async (req, res) => ok(res, await getStock(parse(uuidParam, req.params).id)))
);

router.post(
  '/',
  canWrite,
  route(async (req, res) => {
    const input = parse(stockCreateBody, req.body);
    const result = await createStock(input);
    await audit(req, result.merged ? 'STOCK_TOPUP' : 'STOCK_CREATE', 'Stock', result.id, {
      quantity: input.quantity,
      previousQuantity: result.previousQuantity,
      newQuantity: result.quantity,
    });
    return ok(res, { merged: result.merged, stock: result.stock }, result.merged ? 200 : 201);
  })
);

router.post(
  '/bulk-topup',
  canWrite,
  route(async (req, res) => {
    const input = parse(bulkTopupBody, req.body);
    const results = await bulkTopup(input);
    for (const r of results) {
      await audit(req, 'STOCK_TOPUP', 'Stock', r.stockId, {
        quantity: r.addedQuantity,
        previousQuantity: r.previousQuantity,
        newQuantity: r.newQuantity,
        reason: input.reason,
        bulk: true,
      });
    }
    return ok(res, { updated: results });
  })
);

router.post(
  '/:id/adjust',
  canWrite,
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const input = parse(adjustBody, req.body);
    const result = await adjustStock(id, input);
    await audit(req, 'STOCK_ADJUST', 'Stock', id, {
      delta: input.delta,
      reason: input.reason,
      previousQuantity: result.previousQuantity,
      newQuantity: result.quantity,
    });
    return ok(res, result);
  })
);

export default defineModule({ path: '/stock', router });
