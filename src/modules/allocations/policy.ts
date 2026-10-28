import { ROLES, type AuthContext } from '../../core/auth';

const NONE = '00000000-0000-0000-0000-000000000000';
const WHOLE_MINE = new Set<string>([ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES]);
const DEPARTMENT_BOUND = new Set<string>([ROLES.HOD, ROLES.DEPARTMENT_REP]);
const ISSUERS = new Set<string>([ROLES.ADMIN, ROLES.STORES]);

/** Which slice of the mine the user may see. Unknown roles see nothing. */
export type Scope = { kind: 'all' } | { kind: 'department'; id: string } | { kind: 'section'; id: string };

export const scopeOf = (auth: AuthContext): Scope => {
  if (WHOLE_MINE.has(auth.role)) return { kind: 'all' };
  if (DEPARTMENT_BOUND.has(auth.role)) return { kind: 'department', id: auth.departmentId ?? NONE };
  if (auth.role === ROLES.SECTION_REP) return { kind: 'section', id: auth.sectionId ?? NONE };
  return { kind: 'section', id: NONE };
};

/** Stores issue, return and renew PPE (v1 rule). */
export const canIssue = (auth: AuthContext) => ISSUERS.has(auth.role);

export const allowedActions = (auth: AuthContext, status: string) =>
  canIssue(auth) && (status === 'active' || status === 'expired') ? ['return', 'renew'] : [];
