import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { ORIGIN, PASSWORD, app, createFixtures, signIn, write } from './helpers';

const fx = createFixtures();
let admin: Awaited<ReturnType<typeof fx.user>>;

const v1Login = async (username: string, password = PASSWORD) => {
  const res = await request(app).post('/api/v1/auth/login').send({ username, password });
  expect(res.status).toBe(200);
  return res.body.data as { accessToken: string; refreshToken: string };
};
const profile = (token: string) => request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${token}`);
const refresh = (refreshToken: string) => request(app).post('/api/v1/auth/refresh').send({ refreshToken });

beforeAll(async () => {
  await prepareV2();
  admin = await fx.user('admin');
});
afterAll(() => fx.cleanup());

describe('v1 bearer tokens', () => {
  it('accepts a fresh token and refreshes it', async () => {
    const { accessToken, refreshToken } = await v1Login(admin.username);
    expect((await profile(accessToken)).status).toBe(200);
    const res = await refresh(refreshToken);
    expect(res.status).toBe(200);
    expect((await profile(res.body.data.accessToken)).status).toBe(200);
  });

  it('does not accept a refresh token as an access token, or the reverse', async () => {
    const { accessToken, refreshToken } = await v1Login(admin.username);
    expect((await profile(refreshToken)).status).toBe(401);
    expect((await refresh(accessToken)).status).toBe(401);
  });

  it('rejects tokens issued before the password-version claim existed', async () => {
    const legacy = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    expect((await profile(legacy)).status).toBe(401);
  });

  it('revokes every v1 token when the password is changed in v2', async () => {
    const user = await fx.user('stores');
    const { accessToken, refreshToken } = await v1Login(user.username);
    const agent = await signIn(user.username);
    const changed = await write(agent, 'post', '/api/v2/auth/change-password').send({
      currentPassword: PASSWORD,
      newPassword: 'New-pass-456',
    });
    expect(changed.status).toBe(200);

    expect((await profile(accessToken)).status).toBe(401);
    expect((await refresh(refreshToken)).status).toBe(401);
    const fresh = await v1Login(user.username, 'New-pass-456');
    expect((await profile(fresh.accessToken)).status).toBe(200);
  });

  it('never exposes the password hash on the attached user', async () => {
    const { accessToken } = await v1Login(admin.username);
    const res = await profile(accessToken);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });
});
