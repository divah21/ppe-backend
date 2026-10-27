import { ROLES, type AuthContext, type Role } from '../../core/auth';

/** Roles that maintain the catalogue (v1: admin and stores). */
export const CATALOGUE_EDITORS: Role[] = [ROLES.STORES];

const SEES_RETIRED = new Set<string>([ROLES.ADMIN, ROLES.STORES, ROLES.SHEQ]);

/** Everyone else only sees active items and scales; retired ones are a 404 to them. */
export const seesInactive = (auth: AuthContext) => SEES_RETIRED.has(auth.role);

const WHOLE_MINE = new Set<string>([ROLES.ADMIN, ROLES.STORES, ROLES.SHEQ]);

/**
 * SQL condition (on stock alias `s`) limiting stock to what the user's department or section
 * may draw from. NULL eligibility lists mean the stock is open to everyone.
 */
export const stockEligibilitySql = (auth: AuthContext, escape: (v: string) => string) => {
  if (WHOLE_MINE.has(auth.role)) return 'TRUE';
  const parts = [
    auth.departmentId
      ? `(s.eligible_departments IS NULL OR ${escape(auth.departmentId)}::uuid = ANY(s.eligible_departments))`
      : 's.eligible_departments IS NULL',
  ];
  if (auth.role === ROLES.SECTION_REP) {
    parts.push(
      auth.sectionId
        ? `(s.eligible_sections IS NULL OR ${escape(auth.sectionId)}::uuid = ANY(s.eligible_sections))`
        : 's.eligible_sections IS NULL'
    );
  }
  return parts.join(' AND ');
};
