import { Router } from 'express';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route } from '../../core/http';
import { defineModule } from '../../core/module';
import { forecastSummary, listDemand, listForecast } from './forecast';
import {
  demandQuery,
  forecastQuery,
  forecastSummaryQuery,
  lowStockQuery,
  spendingQuery,
  spendingTotalsQuery,
  stockFilterQuery,
  stockListQuery,
} from './schemas';
import { listSpending, spendingTotals } from './spending';
import { listLowStock, listStockValue, stockFilterOptions, stockValueSummary } from './stock';

const { SHEQ, STORES, HOD } = ROLES;

const router = Router();
router.use(authenticate);

// Same role gates as v1: stock value for admin/SHEQ/stores, spend and forecast for admin/HOD/stores
const stockViewers = requireRole(SHEQ, STORES);
const spendViewers = requireRole(HOD, STORES);
const planners = requireRole(STORES);

router.get('/stock/summary', stockViewers, route(async (req, res) => ok(res, await stockValueSummary(parse(stockFilterQuery, req.query)))));

router.get('/stock/filters', stockViewers, route(async (_req, res) => ok(res, await stockFilterOptions())));

router.get(
  '/stock',
  stockViewers,
  route(async (req, res) => {
    const q = parse(stockListQuery, req.query);
    const { rows, count } = await listStockValue(q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/low-stock',
  stockViewers,
  route(async (req, res) => {
    const q = parse(lowStockQuery, req.query);
    const { rows, count } = await listLowStock(q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/spending/totals',
  spendViewers,
  route(async (req, res) => ok(res, await spendingTotals(getAuth(req), parse(spendingTotalsQuery, req.query))))
);

router.get(
  '/spending',
  spendViewers,
  route(async (req, res) => {
    const q = parse(spendingQuery, req.query);
    const { rows, count } = await listSpending(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/forecast/summary',
  spendViewers,
  route(async (req, res) => ok(res, await forecastSummary(getAuth(req), parse(forecastSummaryQuery, req.query))))
);

router.get(
  '/forecast',
  spendViewers,
  route(async (req, res) => {
    const q = parse(forecastQuery, req.query);
    const { rows, count } = await listForecast(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/demand',
  planners,
  route(async (req, res) => {
    const q = parse(demandQuery, req.query);
    const { rows, count } = await listDemand(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

export default defineModule({ path: '/valuation', router });
