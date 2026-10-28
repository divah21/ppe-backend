import { Op, type IncludeOptions, type WhereOptions } from 'sequelize';
import { ROLES, type AuthContext, type Role } from '../../core/auth';
import { models } from '../../core/db';
import type { FailureStatus } from './schemas';

const NONE = '00000000-0000-0000-0000-000000000000';
const WHOLE_MINE = new Set<Role>([ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES]);
const DEPARTMENT_BOUND = new Set<Role>([ROLES.HOD, ROLES.DEPARTMENT_REP]);

/**
 * Where clauses on Employee and its Section that limit records to the user's scope.
 * Department and section filters narrow the scope but never widen it.
 */
export const employeeScope = (auth: AuthContext, filters: { departmentId?: string; sectionId?: string } = {}) => {
  const employee: WhereOptions[] = [];
  const section: WhereOptions[] = [];

  if (auth.role === ROLES.SECTION_REP) employee.push({ sectionId: auth.sectionId ?? NONE });
  else if (DEPARTMENT_BOUND.has(auth.role)) section.push({ departmentId: auth.departmentId ?? NONE });
  else if (!WHOLE_MINE.has(auth.role)) employee.push({ id: NONE });

  if (filters.sectionId) employee.push({ sectionId: filters.sectionId });
  if (filters.departmentId) section.push({ departmentId: filters.departmentId });

  return { employee: { [Op.and]: employee }, section: section.length ? { [Op.and]: section } : null };
};

/** Section include for an Employee query; required when the scope filters on it. */
export const sectionInclude = (section: WhereOptions | null, bare = false): IncludeOptions => ({
  model: models.Section,
  as: 'section',
  required: !!section,
  attributes: bare ? [] : ['id', 'name', 'departmentId'],
  where: section ?? undefined,
  include: bare ? [] : [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
});

/** Employee include that limits failure reports to the user's scope; `bare` selects no columns (for aggregates). */
export const scopedEmployee = (
  auth: AuthContext,
  filters?: { departmentId?: string; sectionId?: string },
  bare = false
): IncludeOptions => {
  const scope = employeeScope(auth, filters);
  return {
    model: models.Employee,
    as: 'employee',
    required: true,
    attributes: bare ? [] : ['id', 'firstName', 'lastName', 'worksNumber', 'sectionId'],
    where: scope.employee,
    include: [sectionInclude(scope.section, bare)],
  };
};

export type FailureAction = 'review' | 'process' | 'replace' | 'resolve';

const CAN: Record<FailureAction, { roles: Role[]; from: FailureStatus[] }> = {
  review: { roles: [ROLES.SHEQ], from: ['pending-sheq-review'] },
  process: { roles: [ROLES.STORES], from: ['sheq-approved'] },
  replace: { roles: [ROLES.STORES], from: ['sheq-approved', 'stores-processing'] },
  resolve: { roles: [ROLES.STORES], from: ['sheq-approved', 'stores-processing'] },
};

export const ACTION_ROLES = {
  review: CAN.review.roles,
  fulfil: CAN.replace.roles,
};

const hasRole = (auth: AuthContext, roles: Role[]) => auth.role === ROLES.ADMIN || roles.includes(auth.role);

export const canDo = (auth: AuthContext, action: FailureAction, status: FailureStatus) =>
  hasRole(auth, CAN[action].roles) && CAN[action].from.includes(status);

export const allowedActions = (auth: AuthContext, status: FailureStatus) =>
  (Object.keys(CAN) as FailureAction[]).filter((a) => canDo(auth, a, status));
