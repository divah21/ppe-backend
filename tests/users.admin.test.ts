import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { models } from '../src/core/db';
import { prepareV2 } from '../src/v2';
import { createFixtures, signIn } from './helpers';

type Agent = Awaited<ReturnType<typeof signIn>>;
const fx = createFixtures();
let admin: Agent;
let adminUser: { id: string };

beforeAll(async () => {
  await prepareV2();
  adminUser = await fx.user('admin');
  admin = await signIn(adminUser.username);
});
afterAll(() => fx.cleanup());

describe('GET /users/summary', () => {
  it('counts accounts for the cards', async () => {
    await fx.user('stores', { mustChangePassword: true });
    const res = await admin.get('/api/v2/users/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.active).toBeGreaterThan(0);
    expect(res.body.data.mustChangePassword).toBeGreaterThan(0);
    expect(res.body.data.signedInLast30Days).toBeGreaterThan(0);
  });
});

describe('DELETE /users/:id', () => {
  it('deletes an unused account but keeps used ones and your own', async () => {
    const unused = await fx.user('stores');
    expect((await admin.delete(`/api/v2/users/${unused.id}`)).status).toBe(204);
    expect(await models.User.findByPk(unused.id)).toBeNull();

    const used = await fx.user('stores');
    await signIn(used.username);
    const refused = await admin.delete(`/api/v2/users/${used.id}`);
    expect(refused.status).toBe(409);
    expect(refused.body.error?.message ?? refused.body.message).toMatch(/Deactivate it instead/);

    expect((await admin.delete(`/api/v2/users/${adminUser.id}`)).status).toBe(409);
  });
});
