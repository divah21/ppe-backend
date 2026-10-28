import { Router } from 'express';
import { ROLES, authenticate, getAuth, requireRole } from '../../core/auth';
import { ok, paged, pageWindow, parse, route } from '../../core/http';
import { defineModule } from '../../core/module';
import { backupRunning, createBackup, listBackups, resolveBackup } from './backups';
import { backupListQuery, backupParam, categoryParam } from './schemas';
import { getCategory, listSettings, ppeItemOptions, updateCategory } from './service';

const router = Router();
router.use(authenticate, requireRole(ROLES.ADMIN));

router.get(
  '/',
  route(async (_req, res) => ok(res, await listSettings()))
);

router.get(
  '/backups',
  route(async (req, res) => {
    const q = parse(backupListQuery, req.query);
    const all = await listBackups();
    if (q.order === 'asc') all.reverse();
    const { offset, limit } = pageWindow(q);
    return paged(res, all.slice(offset, offset + limit), all.length, q);
  })
);

router.get(
  '/backups/status',
  route(async (_req, res) => {
    const [backups, database] = await Promise.all([listBackups(), getCategory('database')]);
    const value = (key: string) => database.settings.find((s) => s.key === key)?.value ?? null;
    return ok(res, {
      autoBackup: value('autoBackup'),
      backupTime: value('backupTime'),
      retentionDays: value('backupRetention'),
      totalBackups: backups.length,
      latest: backups[0] ?? null,
      running: backupRunning(),
    });
  })
);

router.post(
  '/backups',
  route(async (req, res) => ok(res, await createBackup(req), 201))
);

router.get(
  '/backups/:filename',
  route(async (req, res) => {
    const { filename } = parse(backupParam, req.params);
    const file = await resolveBackup(filename);
    res.setHeader('Cache-Control', 'no-store');
    await new Promise<void>((resolve, reject) => res.download(file, filename, (err) => (err && !res.headersSent ? reject(err) : resolve())));
  })
);

router.get(
  '/allocation/item-options',
  route(async (_req, res) => ok(res, await ppeItemOptions()))
);

router.get(
  '/:category',
  route(async (req, res) => ok(res, await getCategory(parse(categoryParam, req.params).category)))
);

router.put(
  '/:category',
  route(async (req, res) => {
    const { category } = parse(categoryParam, req.params);
    return ok(res, await updateCategory(req, category, req.body, getAuth(req).userId));
  })
);

export default defineModule({ path: '/settings', router });
