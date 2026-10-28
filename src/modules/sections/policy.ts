import type { WhereOptions } from 'sequelize';
import { ROLES, type AuthContext } from '../../core/auth';

export const NO_ID = '00000000-0000-0000-0000-000000000000';
export const WHOLE_MINE = new Set<string>([ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES]);
export const DEPARTMENT_BOUND = new Set<string>([ROLES.HOD, ROLES.DEPARTMENT_REP]);

/** Sections a user may see: the whole mine, their department's, or only their own. */
export const sectionScope = (auth: AuthContext): WhereOptions => {
  if (WHOLE_MINE.has(auth.role)) return {};
  if (DEPARTMENT_BOUND.has(auth.role)) return { departmentId: auth.departmentId ?? NO_ID };
  if (auth.role === ROLES.SECTION_REP) return { id: auth.sectionId ?? NO_ID };
  return { id: NO_ID };
};
