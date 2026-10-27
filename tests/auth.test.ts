import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareV2 } from '../src/v2';
import { ORIGIN, PASSWORD, app, createFixtures, signIn, write } from './helpers';

const fx = createFixtures();
let admin: Awaited<ReturnType<typeof fx.user>>;

const cookieNamed = (res: request.Response, name: string) =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${name}=`));

beforeAll(async () => {
  await prepareV2();
  admin = await fx.user('admin');
});
afterAll(() => fx.cleanup());

describe('v2 auth', () => {
  it('signs in with httpOnly cookies and returns the profile', async () => {
    const res = await request(app)
      .post('/api/v2/auth/login')
      .set('Origin', ORIGIN)
      .send({ username: admin.username, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ username: admin.username, role: 'admin', mustChangePassword: false });
    expect(cookieNamed(res, 'ppe_at')).toMatch(/HttpOnly/);
    expect(cookieNamed(res, 'ppe_rt')).toMatch(/Path=\/api\/v2\/auth/);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  it('rejects a wrong password without saying which part was wrong', async () => {
    const res = await request(app)
      .post('/api/v2/auth/login')
      .set('Origin', ORIGIN)
      .send({ username: admin.username, password: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'UNAUTHENTICATED', message: 'Incorrect username or password' });
  });

  it('validates the body with a 422 envelope', async () => {
    const res = await request(app).post('/api/v2/auth/login').set('Origin', ORIGIN).send({ username: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('requires a session for /me', async () => {
    const res = await request(app).get('/api/v2/auth/me');
    expect(res.status).toBe(401);
  });

  it('rotates the refresh token and revokes the session when an old one is replayed', async () => {
    const agent = await signIn(admin.username);
    const first = await write(agent, 'post', '/api/v2/auth/refresh');
    expect(first.status).toBe(200);
    const oldToken = cookieNamed(first, 'ppe_rt');
    expect(oldToken).toBeDefined();

    const second = await write(agent, 'post', '/api/v2/auth/refresh');
    expect(second.status).toBe(200);

    const replay = await request(app)
      .post('/api/v2/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', oldToken!.split(';')[0]!);
    expect(replay.status).toBe(401);

    // The thief's replay ended the session for the real holder too
    const after = await write(agent, 'post', '/api/v2/auth/refresh');
    expect(after.status).toBe(401);
  });

  it('signs out and ends the session', async () => {
    const agent = await signIn(admin.username);
    expect((await agent.get('/api/v2/auth/me')).status).toBe(200);
    expect((await write(agent, 'post', '/api/v2/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/v2/auth/me')).status).toBe(401);
    expect((await write(agent, 'post', '/api/v2/auth/refresh')).status).toBe(401);
  });

  it('blocks cross-site writes', async () => {
    const res = await request(app)
      .post('/api/v2/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ username: admin.username, password: PASSWORD });
    expect(res.status).toBe(403);
  });

  it('locks a temporary-password account to the password change, then unlocks it', async () => {
    const temp = await fx.user('section-rep', { mustChangePassword: true });
    const agent = await signIn(temp.username);
    const me = await agent.get('/api/v2/auth/me');
    expect(me.body.data.mustChangePassword).toBe(true);

    const reuse = await write(agent, 'post', '/api/v2/auth/change-password').send({
      currentPassword: PASSWORD,
      newPassword: PASSWORD,
    });
    expect(reuse.status).toBe(422);

    const changed = await write(agent, 'post', '/api/v2/auth/change-password').send({
      currentPassword: PASSWORD,
      newPassword: 'Brand-new-pass-9',
    });
    expect(changed.status).toBe(200);
    expect(changed.body.data.mustChangePassword).toBe(false);
  });

  it('returns the v2 404 envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v2/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
