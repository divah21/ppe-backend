# PPE System v2 go-live runbook (Windows server, PM2 + nginx)

v2 runs alongside v1: the API serves `/api/v1` (unchanged) and `/api/v2`, and the web app serves the classic screens plus `/v2`. Nothing is removed, so rolling back is a redeploy of the previous commit.

## Before the window

1. **Access**
   - Get RDP or admin access to the server.
   - Note how the apps run today: `pm2 ls`, and `pm2 show <name>` for each app's script and cwd.
   - Copy the live nginx site config and the current `.env` files somewhere safe.
2. **Database backup**
   - Confirm `pg_dump` is on PATH and that you can connect with the `.env` credentials.
   - `deploy/deploy.ps1` takes a backup automatically. Also take one by hand before the first deploy.
3. **API `.env`**
   - `JWT_SECRET` must be at least 32 characters, or v2 answers 503 while v1 keeps working.
   - `ALLOWED_ORIGINS` must contain `https://ppesystem.eurekasystems.biz`.
   - `FRONTEND_URL` must be set to the same address.
   - Optional: `ACCESS_TOKEN_TTL_MIN` (default 15) and `SESSION_TTL_DAYS` (default 7).
4. **Merge** the `v2` branches into `main` in both repos (PRs `v2 -> main`) after review.

## Deploy

```powershell
# API (repo root)
.\deploy\deploy.ps1 -Branch main
# Web (repo root): first with the classic app as the front door
.\deploy\deploy.ps1 -Branch main
```

The API script:
- Checks `.env`.
- Backs up the database to `C:\ppe-backups`.
- Runs `npm ci` and builds a clean `dist/`.
- Reloads `ppe-api` from `ecosystem.config.cjs` (`dist/app.js`).
- Checks `/api/v2/health`.

On first start the API creates the `auth_sessions` table. That is the only schema change.

**nginx:**
- Compare `deploy/nginx/ppesystem.conf` with the live config.
- What must be true: `/api/` goes to the API on 127.0.0.1:5000, and everything else goes to Next on 127.0.0.1:3000, all on the same domain.
- Reload with `nginx -s reload` after `nginx -t` passes.

If PM2 previously ran differently (for example `node app.js` or a custom `server.js`):
1. `pm2 delete <old name>`.
2. Start the new apps from the ecosystem files.
3. `pm2 save`.

## Smoke test (production, read-only)

1. Sign in at `/v2/login`.
   - The new design shows and the session cookie is httpOnly.
   - A temporary-password account is sent to change its password.
2. Open each v2 section. Lists load, filters work, details open.
3. Approve one real request through its normal flow only if the business agrees to it. Otherwise just check `allowedActions` buttons appear for the right role.
4. Open the classic app (account menu > Classic view). It still works.

## Make v2 the front door

When the smoke test passes:

```powershell
.\deploy\deploy.ps1 -Branch main -V2Default   # in the web repo
```

`/`, `/login` and `/dashboard` then redirect to v2. The classic screens stay reachable by URL.

## Roll back

Both deploy scripts print the previous commit when a health check fails:

```powershell
git checkout <previous sha>; npm ci; npm run build; pm2 reload ppe-api   # or ppe-web
```

If data must be restored (not expected, since v2 only adds `auth_sessions`):

```powershell
pg_restore -c -d <db> <backup.dump>
```
