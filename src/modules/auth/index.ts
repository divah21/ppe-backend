import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { audit } from '../../core/audit';
import {
  REFRESH_COOKIE,
  authenticate,
  clearAuthCookies,
  getAuth,
  loadUser,
  setAuthCookies,
  signAccessToken,
} from '../../core/auth';
import { models } from '../../core/db';
import { AppError, badRequest, notFound } from '../../core/errors';
import { ok, parse, route } from '../../core/http';
import { defineModule } from '../../core/module';
import { createSession, revokeSession, revokeUserSessions, rotateSession } from '../../core/sessions';
import { changePasswordBody, loginBody } from './schemas';
import { toMe, verifyCredentials } from './service';

const router = Router();

// Keyed per account (staff share one site IP), mirroring the v1 login limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `v2-login:${req.ip}:${String(req.body?.username ?? '').trim().toLowerCase()}`,
  handler: (_req, res) =>
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many failed attempts for this account. Try again in 15 minutes.' },
    }),
});

router.post(
  '/login',
  loginLimiter,
  route(async (req, res) => {
    const { username, password } = parse(loginBody, req.body);
    const found = await verifyCredentials(username, password);
    if (!found) throw new AppError('UNAUTHENTICATED', 'Incorrect username or password');
    if (!found.isActive) throw new AppError('FORBIDDEN', 'This account is inactive. Contact your administrator.');

    const { sessionId, refreshToken } = await createSession(found.id, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
    setAuthCookies(res, signAccessToken(found.id, sessionId), refreshToken);
    await found.update({ lastLogin: new Date() });

    const user = await loadUser(found.id);
    await audit(req, 'LOGIN', 'User', found.id, { via: 'v2' }, found.id);
    return ok(res, toMe(user!));
  })
);

router.post(
  '/refresh',
  route(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    const rotated = typeof token === 'string' ? await rotateSession(token) : null;
    const user = rotated ? await models.User.findByPk(rotated.userId, { attributes: ['id', 'isActive'] }) : null;
    if (!rotated || !user?.isActive) {
      if (rotated) await revokeSession(rotated.sessionId);
      clearAuthCookies(res);
      throw new AppError('UNAUTHENTICATED', 'Your session has ended. Please sign in again.');
    }
    setAuthCookies(res, signAccessToken(rotated.userId, rotated.sessionId), rotated.refreshToken);
    return ok(res, { refreshed: true });
  })
);

router.post(
  '/logout',
  route(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    const sessionId = typeof token === 'string' ? token.split('.')[0] : undefined;
    if (sessionId && /^[0-9a-f-]{36}$/i.test(sessionId)) await revokeSession(sessionId);
    clearAuthCookies(res);
    res.status(204).end();
  })
);

router.get(
  '/me',
  authenticate,
  route(async (req, res) => ok(res, toMe(getAuth(req).user)))
);

router.post(
  '/change-password',
  authenticate,
  route(async (req, res) => {
    const { currentPassword, newPassword } = parse(changePasswordBody, req.body);
    const auth = getAuth(req);
    const user = await models.User.findByPk(auth.userId);
    if (!user) throw notFound('User');
    if (!(await user.verifyPassword(currentPassword))) throw badRequest('Your current password is incorrect');

    await user.update({ passwordHash: newPassword, mustChangePassword: false });
    // Other devices must sign in again with the new password
    await revokeUserSessions(auth.userId, auth.sessionId);
    await audit(req, 'UPDATE', 'User', auth.userId, { action: 'password_change', via: 'v2' });
    return ok(res, toMe((await loadUser(auth.userId))!));
  })
);

export default defineModule({ path: '/auth', router });
