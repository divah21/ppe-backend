import { ROLES, type AuthContext, type Role } from '../../core/auth';
import { forbidden } from '../../core/errors';

const WHOLE_MINE = new Set<Role>([ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES]);
const DEPARTMENT_BOUND = new Set<Role>([ROLES.HOD, ROLES.DEPARTMENT_REP]);

// Never matches a real row: department-bound users without a department see nothing
export const NO_ID = '00000000-0000-0000-0000-000000000000';

export const seesWholeMine = (auth: AuthContext) => WHOLE_MINE.has(auth.role);

/**
 * The department a finance read is limited to: null for whole-mine roles, the user's own
 * department for HODs and department reps. Other roles have no finance access.
 */
export const departmentScope = (auth: AuthContext): string | null => {
  if (WHOLE_MINE.has(auth.role)) return null;
  if (DEPARTMENT_BOUND.has(auth.role)) return auth.departmentId ?? NO_ID;
  throw forbidden();
};

/** A requested department filter, narrowed so it never widens the user's scope. */
export const effectiveDepartment = (auth: AuthContext, requested?: string) => {
  const scoped = departmentScope(auth);
  if (scoped === null) return requested ?? null;
  return requested && requested !== scoped ? NO_ID : scoped;
};
