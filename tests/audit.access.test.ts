import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { createFixtures, signIn } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;
const fx = createFixtures();
let admin: Agent, stores: Agent;

beforeAll(async () => {
  await prepareV2();
  admin = await signIn((await fx.user('admin')).username);
  stores = await signIn((await fx.user('stores')).username);
});
afterAll(() => fx.cleanup());

describe('audit stats and access logs', () => {
  it('counts recent activity for the cards', async () => {
    const res = await admin.get('/api/v2/audit-logs/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.signInsLast7Days).toBeGreaterThan(0);
    expect(res.body.data.total).toBeGreaterThanOrEqual(res.body.data.last24Hours);
  });

  it('lists pages people opened, newest first, and archives the log', async () => {
    await admin.get('/api/v2/audit-logs/facets').query({ probe: fx.tag });
    const res = await admin.get('/api/v2/audit-logs/access').query({ q: `probe=${fx.tag}` });
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ method: 'GET', url: expect.stringContaining(fx.tag) });
    expect(res.body.meta.total).toBe(1);

    expect((await admin.post('/api/v2/audit-logs/access/archive')).body.data.archived).toBe(true);
    expect((await admin.get('/api/v2/audit-logs/access').query({ q: `probe=${fx.tag}` })).body.meta.total).toBe(0);
    expect((await stores.get('/api/v2/audit-logs/access')).status).toBe(403);
  });
});
