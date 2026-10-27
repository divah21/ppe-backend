import { Router } from 'express';
import { audit } from '../../core/audit';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import { REQUESTER_ROLES } from './policy';
import {
  approveRequest,
  cancelRequest,
  createRequest,
  fulfilRequest,
  getRequest,
  listRequests,
  rejectRequest,
  requestSections,
  storesRejectRequest,
} from './requests';
import {
  adjustStockBody,
  allocationListQuery,
  approveRequestBody,
  bulkItemsBody,
  cancelBody,
  createRequestBody,
  fulfilRequestBody,
  itemCreateBody,
  itemListQuery,
  itemUpdateBody,
  reasonBody,
  receiveStockBody,
  requestListQuery,
  stockListQuery,
} from './schemas';
import {
  adjustStock,
  bulkImportItems,
  categories,
  createItem,
  getItem,
  getStockRecord,
  itemOptions,
  listAllocations,
  listItems,
  listStock,
  receiveStock,
  stockSummary,
  updateItem,
} from './service';

const router = Router();
router.use(authenticate);

const stores = requireRole(ROLES.STORES);

// ---------------------------------------------------------------- items

router.get(
  '/items',
  route(async (req, res) => {
    const q = parse(itemListQuery, req.query);
    const { rows, count } = await listItems(q);
    return paged(res, rows, count, q);
  })
);

router.get('/items/options', route(async (_req, res) => ok(res, await itemOptions())));
router.get('/categories', route(async (_req, res) => ok(res, await categories())));

router.get('/items/:id', route(async (req, res) => ok(res, await getItem(parse(uuidParam, req.params).id))));

router.post(
  '/items',
  stores,
  route(async (req, res) => ok(res, await createItem(parse(itemCreateBody, req.body)), 201))
);

router.post(
  '/items/bulk',
  stores,
  route(async (req, res) => {
    const result = await bulkImportItems(parse(bulkItemsBody, req.body));
    await audit(req, 'CONSUMABLE_ITEMS_IMPORTED', 'ConsumableItem', null, result);
    return ok(res, result);
  })
);

router.put(
  '/items/:id',
  stores,
  route(async (req, res) =>
    ok(res, await updateItem(parse(uuidParam, req.params).id, parse(itemUpdateBody, req.body)))
  )
);

// ---------------------------------------------------------------- stock

router.get(
  '/stock',
  route(async (req, res) => {
    const q = parse(stockListQuery, req.query);
    const { rows, count } = await listStock(q);
    return paged(res, rows, count, q);
  })
);

router.get('/stock/summary', route(async (_req, res) => ok(res, await stockSummary())));

router.get('/stock/:id', route(async (req, res) => ok(res, await getStockRecord(parse(uuidParam, req.params).id))));

router.post(
  '/stock',
  stores,
  route(async (req, res) => {
    const input = parse(receiveStockBody, req.body);
    const stock = await receiveStock(input);
    await audit(req, 'CONSUMABLE_STOCK_RECEIVED', 'ConsumableStock', stock.id, {
      consumableItemId: input.consumableItemId,
      quantity: input.quantity,
    });
    return ok(res, stock, 201);
  })
);

router.post(
  '/stock/:id/adjust',
  stores,
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const input = parse(adjustStockBody, req.body);
    const { stock, previousQuantity } = await adjustStock(id, input);
    await audit(req, 'CONSUMABLE_STOCK_ADJUSTED', 'ConsumableStock', id, {
      ...input,
      previousQuantity,
      newQuantity: stock.quantity,
    });
    return ok(res, stock);
  })
);

// ---------------------------------------------------------------- requests

router.get(
  '/requests',
  route(async (req, res) => {
    const q = parse(requestListQuery, req.query);
    const { rows, count } = await listRequests(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get('/requests/sections', route(async (req, res) => ok(res, await requestSections(getAuth(req)))));

router.get(
  '/requests/:id',
  route(async (req, res) => ok(res, await getRequest(getAuth(req), parse(uuidParam, req.params).id)))
);

router.post(
  '/requests',
  requireRole(...REQUESTER_ROLES),
  route(async (req, res) => ok(res, await createRequest(getAuth(req), parse(createRequestBody, req.body)), 201))
);

router.post(
  '/requests/:id/approve',
  requireRole(ROLES.HOD),
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const result = await approveRequest(getAuth(req), id, parse(approveRequestBody, req.body));
    await audit(req, 'CONSUMABLE_REQUEST_APPROVED', 'ConsumableRequest', id, { requestNumber: result.requestNumber });
    return ok(res, result);
  })
);

router.post(
  '/requests/:id/reject',
  requireRole(ROLES.HOD),
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const { comments } = parse(reasonBody, req.body);
    const result = await rejectRequest(getAuth(req), id, comments);
    await audit(req, 'CONSUMABLE_REQUEST_REJECTED', 'ConsumableRequest', id, { requestNumber: result.requestNumber });
    return ok(res, result);
  })
);

router.post(
  '/requests/:id/fulfil',
  stores,
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const result = await fulfilRequest(getAuth(req), id, parse(fulfilRequestBody, req.body));
    await audit(req, 'CONSUMABLE_REQUEST_ISSUED', 'ConsumableRequest', id, {
      requestNumber: result.requestNumber,
      status: result.status,
      shortages: result.shortages.length,
    });
    return ok(res, result);
  })
);

router.post(
  '/requests/:id/stores-reject',
  stores,
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const { comments } = parse(reasonBody, req.body);
    const result = await storesRejectRequest(getAuth(req), id, comments);
    await audit(req, 'CONSUMABLE_REQUEST_STORES_REJECTED', 'ConsumableRequest', id, { requestNumber: result.requestNumber });
    return ok(res, result);
  })
);

router.post(
  '/requests/:id/cancel',
  route(async (req, res) => {
    const { id } = parse(uuidParam, req.params);
    const { comments } = parse(cancelBody, req.body);
    const result = await cancelRequest(getAuth(req), id, comments);
    await audit(req, 'CONSUMABLE_REQUEST_CANCELLED', 'ConsumableRequest', id, { requestNumber: result.requestNumber });
    return ok(res, result);
  })
);

// ---------------------------------------------------------------- issues

router.get(
  '/allocations',
  route(async (req, res) => {
    const q = parse(allocationListQuery, req.query);
    const { rows, count } = await listAllocations(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

export default defineModule({ path: '/consumables', router });
