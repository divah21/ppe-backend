import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryTypes } from 'sequelize';
import { INDEXES } from '../database/indexes';
import { sequelize } from '../src/core/db';
import { createSession, isSessionActive, purgeStaleSessions } from '../src/core/sessions';
import { spendByDepartment } from '../src/modules/budgets/spend';
import { prepareV2 } from '../src/v2';
import { allocate, pricedItem } from './finance.fixtures';
import { app, createFixtures } from './helpers';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { errorHandler } = require('../middlewares/error_handler');

const fakeRes = () => {
  const res = { statusCode: 0, body: undefined as unknown, status: vi.fn(), json: vi.fn() };
  res.status.mockImplementation((code: number) => ((res.statusCode = code), res));
  res.json.mockImplementation((body: unknown) => ((res.body = body), res));
  return res;
};

describe('health checks', () => {
  it('v2 health checks the database', async () => {
    const res = await request(app).get('/api/v2/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok' } });
  });
});

describe('v1 error handler', () => {
  const env = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = env;
  });

  it('hides unexpected error details in production', () => {
    process.env.NODE_ENV = 'production';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = fakeRes();
    errorHandler(new Error('relation "users" does not exist'), {}, res, () => undefined);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ success: false, message: 'Internal server error' });
  });

  it('keeps the message of deliberate client errors', () => {
    process.env.NODE_ENV = 'production';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = fakeRes();
    errorHandler(Object.assign(new Error('Unexpected token } in JSON'), { status: 400 }), {}, res, () => undefined);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: 'Unexpected token } in JSON' });
  });
});

describe('database time zone', () => {
  const fx = createFixtures();
  afterAll(() => fx.cleanup());

  it('buckets a 00:30 CAT issue on 1 January into the new year', async () => {
    const { department, section } = await fx.org();
    const employee = await fx.employee(section.id);
    const { item } = await pricedItem(fx, { price: 10, quantity: 5 });
    await allocate(fx, { employeeId: employee.id, ppeItemId: item.id, quantity: 1, issueDate: new Date('2026-01-01T00:30:00+02:00') });

    const newYear = await spendByDepartment({ start: '2026-01-01', end: '2027-01-01' }, department.id);
    const oldYear = await spendByDepartment({ start: '2025-01-01', end: '2026-01-01' }, department.id);
    expect(newYear.get(department.id)?.allocationCount).toBe(1);
    expect(oldYear.get(department.id)).toBeUndefined();
  });
});

describe('v2 bootstrap indexes', () => {
  it('creates every secondary index and leaves none invalid', async () => {
    await prepareV2();
    const rows = await sequelize.query<{ relname: string; valid: boolean }>(
      `SELECT c.relname, i.indisvalid AS valid FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
       WHERE c.relname IN (:names)`,
      { type: QueryTypes.SELECT, replacements: { names: INDEXES.map(([name]) => name) } }
    );
    expect(rows.map((r) => r.relname).sort()).toEqual(INDEXES.map(([name]) => name).sort());
    expect(rows.every((r) => r.valid)).toBe(true);
  });
});

describe('auth session purge', () => {
  const fx = createFixtures();
  afterAll(() => fx.cleanup());

  it('deletes sessions that ended over a week ago and keeps live ones', async () => {
    const user = await fx.user('stores');
    const live = await createSession(user.id, {});
    const old = await createSession(user.id, {});
    await sequelize.query(`UPDATE auth_sessions SET revoked_at = NOW() - INTERVAL '8 days' WHERE id = :id`, {
      replacements: { id: old.sessionId },
    });
    await purgeStaleSessions();
    expect(await isSessionActive(live.sessionId)).toBe(true);
    const [left] = await sequelize.query(`SELECT 1 FROM auth_sessions WHERE id = :id`, { replacements: { id: old.sessionId } });
    expect(left).toHaveLength(0);
  });
});
