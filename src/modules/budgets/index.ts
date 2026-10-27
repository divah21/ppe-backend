import { Router } from 'express';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, parse, route, uuidParam } from '../../core/http';
import { defineModule } from '../../core/module';
import {
  budgetBody,
  budgetListQuery,
  budgetUpdateBody,
  companyBody,
  companyListQuery,
  companyUpdateBody,
  yearQuery,
} from './schemas';
import {
  budgetSummary,
  createBudget,
  createCompanyBudget,
  deleteBudget,
  deleteCompanyBudget,
  getBudget,
  getCompanyBudget,
  listBudgets,
  listCompanyBudgets,
  updateBudget,
  updateCompanyBudget,
} from './service';
import { suggestedBudgets } from './suggested';

const { ADMIN, SHEQ, STORES, HOD, DEPARTMENT_REP } = ROLES;

const router = Router();
router.use(authenticate);

const readers = requireRole(SHEQ, STORES, HOD, DEPARTMENT_REP);
const wholeMine = requireRole(SHEQ, STORES);
const admin = requireRole(ADMIN);

router.get(
  '/summary',
  readers,
  route(async (req, res) => ok(res, await budgetSummary(getAuth(req), parse(yearQuery, req.query).fiscalYear)))
);

router.get(
  '/suggested',
  readers,
  route(async (req, res) => ok(res, await suggestedBudgets(getAuth(req), parse(yearQuery, req.query).fiscalYear)))
);

router.get(
  '/company',
  wholeMine,
  route(async (req, res) => {
    const q = parse(companyListQuery, req.query);
    const { rows, count } = await listCompanyBudgets(q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/company/:id',
  wholeMine,
  route(async (req, res) => ok(res, await getCompanyBudget(parse(uuidParam, req.params).id)))
);

router.post(
  '/company',
  admin,
  route(async (req, res) => ok(res, await createCompanyBudget(getAuth(req), parse(companyBody, req.body)), 201))
);

router.put(
  '/company/:id',
  admin,
  route(async (req, res) =>
    ok(res, await updateCompanyBudget(parse(uuidParam, req.params).id, parse(companyUpdateBody, req.body)))
  )
);

router.delete(
  '/company/:id',
  admin,
  route(async (req, res) => {
    await deleteCompanyBudget(parse(uuidParam, req.params).id);
    res.status(204).end();
  })
);

router.get(
  '/',
  readers,
  route(async (req, res) => {
    const q = parse(budgetListQuery, req.query);
    const { rows, count } = await listBudgets(getAuth(req), q);
    return paged(res, rows, count, q);
  })
);

router.get(
  '/:id',
  readers,
  route(async (req, res) => ok(res, await getBudget(getAuth(req), parse(uuidParam, req.params).id)))
);

router.post(
  '/',
  admin,
  route(async (req, res) => ok(res, await createBudget(parse(budgetBody, req.body)), 201))
);

router.put(
  '/:id',
  admin,
  route(async (req, res) =>
    ok(res, await updateBudget(getAuth(req), parse(uuidParam, req.params).id, parse(budgetUpdateBody, req.body)))
  )
);

router.delete(
  '/:id',
  admin,
  route(async (req, res) => {
    await deleteBudget(parse(uuidParam, req.params).id);
    res.status(204).end();
  })
);

export default defineModule({ path: '/budgets', router });
