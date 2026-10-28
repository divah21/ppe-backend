import { Router } from 'express';
import { authenticate, getAuth } from '../../core/auth';
import { ok, parse, route } from '../../core/http';
import { defineModule } from '../../core/module';
import { dashboardQuery } from './schemas';
import { dashboardSummary } from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/summary',
  route(async (req, res) => ok(res, await dashboardSummary(getAuth(req), parse(dashboardQuery, req.query))))
);

export default defineModule({ path: '/dashboard', router });
