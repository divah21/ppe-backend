import type { WhereOptions } from 'sequelize';
import { ROLES, type AuthContext, type Role } from '../../core/auth';

const NONE = '00000000-0000-0000-0000-000000000000';
const WHOLE_MINE = new Set<string>([ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES]);

/** v1 rules: the job-title matrix is maintained by admin, SHEQ and stores... */
export const JOB_TITLE_EDITORS: Role[] = [ROLES.SHEQ, ROLES.STORES];
/** ...and the section matrix by admin and stores only. */
export const SECTION_EDITORS: Role[] = [ROLES.STORES];

/**
 * Conditions on the Section model limiting what the user may see: the whole mine, their
 * department, or their own section.
 */
export const sectionScope = (auth: AuthContext): WhereOptions => {
  if (WHOLE_MINE.has(auth.role)) return {};
  if (auth.role === ROLES.SECTION_REP) return { id: auth.sectionId ?? NONE };
  return { departmentId: auth.departmentId ?? NONE };
};
