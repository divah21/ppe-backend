# PPE System v2 go-live runbook (Windows server, PM2 + nginx)

v2 runs alongside v1: the API serves `/api/v1` (unchanged) and `/api/v2`, and the web app serves the classic screens plus `/v2`. Nothing is removed, so rolling back is a redeploy of the previous commit.

## Before the window

1. **Access**
   - Get RDP or admin access to the server.
   - Note how the apps run today: `pm2 ls`, and `pm2 show <name>` for each app's script and cwd.
   - Copy the live nginx site config and the current `.env` files somewhere safe.
   - `node -v` must print 20.9 or later (Next 16). Both deploy scripts refuse to run on older Node.
   - Set the Windows time zone to CAT (`tzutil /g` should print `South Africa Standard Time` or another UTC+02:00 zone). The v2 API pins `TZ=Africa/Harare` through PM2, but the v1 code uses the host zone.
2. **Database backup**
   - Confirm `pg_dump` is on PATH and that you can connect with the `.env` credentials.
   - `deploy/deploy.ps1` takes a backup automatically. Also take one by hand before the first deploy.
3. **API `.env`**
   - `JWT_SECRET` must be at least 32 characters, or v2 answers 503 while v1 keeps working.
   - `ALLOWED_ORIGINS` must contain `https://ppesystem.eurekasystems.biz`.
   - `FRONTEND_URL` must be set to the same address.
   - Optional: `ACCESS_TOKEN_TTL_MIN` (default 15) and `SESSION_TTL_DAYS` (default 7).
   - `.env.example` in each repo lists every setting.
4. **Web `.env`**
   - `NEXT_PUBLIC_API_URL` must be set (`/api/v1` behind nginx) in `.env.local` or `.env.production.local`. It is baked in at build time, and the web deploy script stops without it.
5. **Merge** the `v2` branches into `main` in both repos (PRs `v2 -> main`) after review.

## Deploy

```powershell
# API (repo root)
.\deploy\deploy.ps1 -Branch main
# Web (repo root): the classic app stays the front door until you switch it
.\deploy\deploy.ps1 -Branch main
```

The API script:
- Checks `.env`.
- Backs up the database to `C:\ppe-backups`.
- Runs `npm ci` and compiles into `dist.new/`, which replaces `dist/` only when the build succeeds. If install or build fails, it checks out the previous commit and reinstalls its packages; the running API is not reloaded.
- Reloads `ppe-api` from `ecosystem.config.cjs` (`dist/app.js`, `TZ=Africa/Harare`).
- Checks `/api/v2/health` for up to 60 seconds.

The web script runs `npm ci`, the v2 typecheck and `next build` in place, so the site serves errors for the few minutes the build takes. If any of those fail, it rebuilds the previous commit and reloads `ppe-web`.

On first start the API creates the `auth_sessions` table. That is the only schema change.

**nginx:**
- Compare `deploy/nginx/ppesystem.conf` with the live config.
- What must be true: `/api/` goes to the API on 127.0.0.1:5000, and everything else goes to Next on 127.0.0.1:3000, all on the same domain.
- It also sets `X-Frame-Options: DENY` and a `frame-ancestors 'none'` CSP on the Next pages, repeats the security headers in `location /_next/static/` (a location with its own `add_header` inherits none), gzips API JSON and hides version headers.
- Reload with `nginx -s reload` after `nginx -t` passes.
- Check: `curl -sI https://ppesystem.eurekasystems.biz/v2/login` shows `X-Frame-Options` and `Content-Security-Policy`, and a `/_next/static/...` file shows `Strict-Transport-Security` next to `Cache-Control`.

If PM2 previously ran differently (for example `node app.js` or a custom `server.js`):
1. `pm2 delete <old name>`.
2. Start the new apps from the ecosystem files.
3. `pm2 save`.

Check the API runs on CAT: `pm2 env <ppe-api id> | findstr TZ` prints `Africa/Harare`. A process started before this change keeps its old environment until `pm2 delete ppe-api` and a fresh start, or a reload with `--update-env` (the deploy script does this).

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
.\deploy\deploy.ps1 -Branch main -FrontDoor v2   # in the web repo
```

`/`, `/login` and `/dashboard` then redirect to v2. The classic screens stay reachable by URL.

The choice is saved in `deploy\.front-door` (git-ignored), so later `.\deploy\deploy.ps1 -Branch main` runs keep v2 as the front door. To go back, deploy with `-FrontDoor classic`.

## Roll back

A failed install or build is rolled back by the scripts themselves (see Deploy). When the reload or health check fails, both scripts print the rollback commands for the previous commit:

```powershell
git checkout <previous sha>; npm ci; npm run build; pm2 reload ppe-api   # or ppe-web
```

**First v2 deploy.** The previous `main` has no build script and no ecosystem files, so the commands above do not roll back: `npm run build` fails and `pm2 reload ppe-api` restarts the v2 `dist/app.js`. The scripts detect this and print this path instead. Use the PM2 name, script and cwd recorded in "Before the window":

```powershell
# API
git checkout <previous sha>; npm ci; Remove-Item -Recurse -Force dist
pm2 delete ppe-api
pm2 start app.js --name <old name>
pm2 save
# Web
git checkout <previous sha>; npm ci; npm run build
pm2 delete ppe-web
# start the old web process as recorded, then
pm2 save
```

If data must be restored (not expected, since v2 only adds `auth_sessions`):

```powershell
pg_restore -c -d <db> <backup.dump>
```
