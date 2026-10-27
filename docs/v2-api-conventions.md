# v2 API conventions

The v2 API is TypeScript under `src/`, mounted at `/api/v2` next to the untouched v1 routes. It reuses the existing Sequelize models (`models/`) and the database. Follow these rules for every module.

## Module layout

```
src/modules/<module>/
  index.ts      default export defineModule({ path: '/<module>', router }); routes only
  schemas.ts    zod schemas for params, query and bodies
  service.ts    business logic and queries (no req/res)
  policy.ts     who may see or do what (optional, when scoping is non-trivial)
tests/<module>.test.ts
```

Modules are discovered automatically: never edit `src/v2.ts` or another module to register yours.

## Requests and responses

- Wrap handlers in `route(async (req, res) => ...)` and validate with `parse(schema, req.body | req.query | req.params)`.
- Lists use `listQuery([...sortable keys], { filters })`, `pageWindow(q)`, and `paged(res, rows, count, q)`. The response is `{ data: [...], meta: { page, pageSize, total, pageCount } }`. Never return unbounded lists. Exception: lookup endpoints for dropdowns (`GET /<module>/options`) return `{ data: [{ id, name }] }`.
- Single resources and actions: `ok(res, dto)` and `ok(res, dto, 201)` for creates; `res.status(204).end()` for deletes.
- Errors: throw `AppError` / `badRequest` / `forbidden` / `notFound` / `conflict`. The handler emits `{ error: { code, message, details } }`. Messages are written for end users.
- Return plain camelCase DTOs (map rows in the service). Never return `passwordHash` or whole Sequelize instances with sensitive includes.
- Search: `q` matches with `Op.iLike` and `likeTerm(q)`.

## Auth and scoping

- Every route except auth uses `authenticate`. Use `requireRole(ROLES.X, ...)` for role gates; admin always passes.
- `getAuth(req)` gives `{ userId, role, departmentId, sectionId, employeeId }`.
- Scope rules (enforce in the service, for list AND detail AND every mutation):
  - `admin`, `sheq`, `stores`: whole mine.
  - `hod`, `department-rep`: their `departmentId` only.
  - `section-rep`: their `sectionId` only.
  - A record out of scope is a 404 on detail and is excluded from lists, so its existence does not leak.
- Query parameters never widen scope (ignore a `departmentId` filter outside the user's department).

## Data integrity

- Multi-row writes run in `inTransaction(async (t) => ...)` and pass `{ transaction: t }` to every query.
- Stock changes only via `helpers/stock_helper.js` (`deductStock`, `restoreStock`). It returns `null` when there is not enough stock: throw `new AppError('INSUFFICIENT_STOCK', ...)`.
- Lock the row being transitioned (`lock: { level: t.LOCK.UPDATE, of: Model }`) so double clicks cannot apply twice.
- Workflow entities return `allowedActions: string[]` computed server-side for the current user; the UI shows only those.

## Tests

`npm test` runs vitest against the local database (never a remote one). Use `tests/helpers.ts`:
`createFixtures()` for zz- prefixed rows plus `cleanup()`, `signIn(username)` for a cookie session, `write(agent, 'post', url)` for mutations. Cover the happy path, validation (422), auth (401), role (403) and scoping (404 / filtered) for each endpoint.

## Don'ts

- No new npm dependencies without agreement.
- Don't change v1 routes or models, except to fix a bug you can prove with a test (mention it in the PR).
- No `any` in new code except reading model attributes from `Row`.
