import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { models, type Row } from './db';
import { AppError, forbidden } from './errors';
import { isSessionActive } from './sessions';

export const ROLES = {
  ADMIN: 'admin',
  SHEQ: 'sheq',
  HOD: 'hod',
  DEPARTMENT_REP: 'department-rep',
  SECTION_REP: 'section-rep',
  STORES: 'stores',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface AuthContext {
  userId: string;
  sessionId: string;
  role: Role;
  /** Department the user acts for: the one they manage, else their own */
  departmentId: string | null;
  /** Section the user acts for: the one they manage, else their own */
  sectionId: string | null;
  employeeId: string | null;
  user: Row;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

export const ACCESS_COOKIE = 'ppe_at';
export const REFRESH_COOKIE = 'ppe_rt';
const REFRESH_PATH = '/api/v2/auth';

const baseCookie: CookieOptions = { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax' };

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookie, path: '/', maxAge: config.accessTokenTtlSec * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...baseCookie, path: REFRESH_PATH, maxAge: config.sessionTtlMs });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie, path: REFRESH_PATH });
};

interface AccessClaims {
  sub: string;
  sid: string;
}

export const signAccessToken = (userId: string, sessionId: string) =>
  jwt.sign({ sid: sessionId } satisfies Omit<AccessClaims, 'sub'>, config.jwtSecret, {
    subject: userId,
    expiresIn: config.accessTokenTtlSec,
    audience: 'ppe-v2',
  });

const verifyAccessToken = (token: string): AccessClaims | null => {
  try {
    const claims = jwt.verify(token, config.jwtSecret, { audience: 'ppe-v2' });
    if (typeof claims === 'string' || !claims.sub || typeof claims.sid !== 'string') return null;
    return { sub: claims.sub, sid: claims.sid };
  } catch {
    return null;
  }
};

const readToken = (req: Request) => {
  const fromCookie = req.cookies?.[ACCESS_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie) return fromCookie;
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
};

export const loadUser = (userId: string) =>
  models.User.findByPk(userId, {
    attributes: { exclude: ['passwordHash'] },
    include: [
      { model: models.Role, as: 'role', attributes: ['id', 'name', 'description', 'permissions'] },
      {
        model: models.Employee,
        as: 'employee',
        include: [
          {
            model: models.Section,
            as: 'section',
            attributes: ['id', 'name', 'departmentId'],
            include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
          },
          { model: models.JobTitle, as: 'jobTitleRef', required: false },
        ],
      },
    ],
  });

export const toAuthContext = (user: Row, sessionId: string): AuthContext => ({
  userId: user.id,
  sessionId,
  role: user.role?.name as Role,
  departmentId: user.departmentId ?? user.employee?.section?.departmentId ?? null,
  sectionId: user.sectionId ?? user.employee?.sectionId ?? null,
  employeeId: user.employeeId ?? null,
  user,
});

// Reachable while the password is still the temporary one an admin issued
const PASSWORD_CHANGE_PATHS = ['/auth/me', '/auth/change-password', '/auth/logout'];

/** Requires a valid v2 access token (cookie, or Bearer for API clients). */
export const authenticate: RequestHandler = (req, _res, next) => {
  attachAuth(req).then(() => next(), next);
};

const attachAuth = async (req: Request) => {
  const token = readToken(req);
  const claims = token ? verifyAccessToken(token) : null;
  if (!claims) throw new AppError('UNAUTHENTICATED', 'Please sign in');

  // Logout, password change and theft revocation end access immediately, not at token expiry
  const [user, live] = await Promise.all([loadUser(claims.sub), isSessionActive(claims.sid)]);
  if (!user || !user.isActive || !live) throw new AppError('UNAUTHENTICATED', 'Please sign in');

  const path = `${req.baseUrl}${req.path}`;
  if (user.mustChangePassword && !PASSWORD_CHANGE_PATHS.some((p) => path.endsWith(p))) {
    throw new AppError('PASSWORD_CHANGE_REQUIRED', 'You must change your temporary password before continuing');
  }

  req.auth = toAuthContext(user, claims.sid);
  // v1 audit and access-log middleware read req.user and req.userRole
  Object.assign(req as Request & { user?: Row; userRole?: string }, { user, userRole: req.auth.role });
};

/** Allows only the listed roles. Admin always passes. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    const role = req.auth?.role;
    if (!role) return next(new AppError('UNAUTHENTICATED', 'Please sign in'));
    if (role !== ROLES.ADMIN && !roles.includes(role)) return next(forbidden());
    next();
  };

/** The signed-in user. Only call behind `authenticate`. */
export const getAuth = (req: Request): AuthContext => {
  if (!req.auth) throw new AppError('UNAUTHENTICATED', 'Please sign in');
  return req.auth;
};
