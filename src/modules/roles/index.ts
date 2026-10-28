import { Router } from 'express';
import { authenticate } from '../../core/auth';
import { ok, route } from '../../core/http';
import { defineModule } from '../../core/module';
import { roleOptions } from './service';

const router = Router();
router.use(authenticate);

router.get(
  '/options',
  route(async (_req, res) => ok(res, await roleOptions()))
);

export default defineModule({ path: '/roles', router });
