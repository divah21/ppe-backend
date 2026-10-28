import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { ORIGIN, app } from './helpers';

beforeAll(() => prepareV2());

describe('v2 login flood guard', () => {
  it('cuts off one host failing across many accounts with the v2 envelope', async () => {
    // Distinct usernames so the per-account limiter never trips; missing password fails fast with 422
    for (let i = 0; i < 600; i++) {
      const res = await request(app)
        .post('/api/v2/auth/login')
        .set('Origin', ORIGIN)
        .send({ username: `zz-flood-${i}` });
      expect(res.status).toBe(422);
    }
    const res = await request(app)
      .post('/api/v2/auth/login')
      .set('Origin', ORIGIN)
      .send({ username: 'zz-flood-last', password: 'guess' });
    expect(res.status).toBe(429);
    expect(res.body.error).toEqual({
      code: 'RATE_LIMITED',
      message: 'Too many sign-in attempts from this network. Try again later.',
    });
  }, 120_000);
});
