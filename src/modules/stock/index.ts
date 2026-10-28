import { Router } from 'express';
import { audit, skipAudit } from '../../core/audit';
import { ROLES, authenticate, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { importStock } from './import';
import { adjustBody, bulkTopupBody, shortfallQuery, stockCreateBody, stockImportBody, stockListQuery, stockUpdateBody } from './schemas';
import {
  adjustStock,
  bulkTopup,
  checkTopup,
  createStock,
  deleteStock,
  getStock,
  listStock,
  stockLookups,
  stockMovements,
  stockShortfalls,
  stockSummary,
  updateStock,
} from './service';

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
  '/shortfalls',
  canRead,
  route(async (req, res) => ok(res, await stockShortfalls(parse(shortfallQuery, req.query).q)))
);

router.post(
  '/import',
  canWrite,
  route(async (req, res) => {
    const input = parse(stockImportBody, req.body);
    const report = await importStock(input);
    skipAudit(req);
    // One entry per line, so each line's movements show what the import did to it
    if (!input.dryRun && !report.errors.length) {
      for (const l of report.lines) {
        await audit(req, 'STOCK_IMPORT', 'Stock', l.stockId, {
          quantity: l.newQuantity - l.previousQuantity,
          previousQuantity: l.previousQuantity,
          newQuantity: l.newQuantity,
          reason: input.updateExisting ? 'Spreadsheet import (quantities replaced)' : 'Spreadsheet import',
        });
      }
    }
    return ok(res, report, input.dryRun || report.errors.length ? 200 : 201);
  })
);

router.get(
  '/:id/movements',
  canRead,
  route(async (req, res) => ok(res, await stockMovements(parse(uuidParam, req.params).id)))
);

router.put(
  '/:id',
  canWrite,
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const input = parse(stockUpdateBody, req.body);
    const stock = await updateStock(id, input);
    await audit(req, 'STOCK_UPDATE', 'Stock', id, input);
    return ok(res, stock);
  })
);

router.delete(
  '/:id',
  canWrite,
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const removed = await deleteStock(id);
    await audit(req, 'STOCK_DELETE', 'Stock', id, removed);
    return res.status(204).end();
  })
);

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
    if (input.dryRun) return ok(res, await checkTopup(input));
    const results = await bulkTopup(input);
    for (const r of results) {
      await audit(req, 'STOCK_TOPUP', 'Stock', r.stockId, {
        quantity: r.addedQuantity,
        previousQuantity: r.previousQuantity,
        newQuantity: r.newQuantity,
        reason: r.reason || input.reason,
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
      reasonCode: input.reasonCode,
      reason: input.reason,
      previousQuantity: result.previousQuantity,
      newQuantity: result.quantity,
    });
    return ok(res, result);
  })
);

export default defineModule({ path: '/stock', router });
