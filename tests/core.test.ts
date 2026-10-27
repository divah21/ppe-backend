import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from './helpers';

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
