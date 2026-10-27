import { Op, literal, type WhereOptions } from 'sequelize';
import { ROLES, type AuthContext, type Role } from '../../core/auth';
import { sequelize } from '../../core/db';

const NONE = '00000000-0000-0000-0000-000000000000';
const WHOLE_MINE = new Set<Role>([ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES]);

/** Roles v1 lets add and edit employees; admin is implied by requireRole. */
export const EDITOR_ROLES = [ROLES.SECTION_REP, ROLES.DEPARTMENT_REP] as const;

const inDepartment = (departmentId: string | null) =>
  literal(`(SELECT s.id FROM sections s WHERE s.department_id = ${sequelize.escape(departmentId ?? NONE)})`);

/** Employees the user may see: section reps their section, HOD and department reps their department. */
export const employeeScope = (auth: AuthContext): WhereOptions => {
  if (WHOLE_MINE.has(auth.role)) return {};
  if (auth.role === ROLES.SECTION_REP) return { sectionId: auth.sectionId ?? NONE };
  return { sectionId: { [Op.in]: inDepartment(auth.departmentId) } };
};

/** Sections the user works with (pickers and filters). */
export const sectionScope = (auth: AuthContext): WhereOptions => {
  if (WHOLE_MINE.has(auth.role)) return {};
  if (auth.role === ROLES.SECTION_REP) return { id: auth.sectionId ?? NONE };
  return { departmentId: auth.departmentId ?? NONE };
};

export const canEdit = (auth: AuthContext) =>
  auth.role === ROLES.ADMIN || (EDITOR_ROLES as readonly Role[]).includes(auth.role);

/** v1 only lets an admin reactivate an employee. */
export const canReactivate = (auth: AuthContext) => auth.role === ROLES.ADMIN;

/** Whether the user may place an employee in this section. */
export const sectionWithinScope = (auth: AuthContext, section: { id: string; departmentId: string | null }) => {
  if (WHOLE_MINE.has(auth.role)) return true;
  if (auth.role === ROLES.SECTION_REP) return !!auth.sectionId && section.id === auth.sectionId;
  return !!auth.departmentId && section.departmentId === auth.departmentId;
};

export type EmployeeAction = 'edit' | 'deactivate' | 'activate';

export const allowedActions = (auth: AuthContext, isActive: boolean): EmployeeAction[] => {
  const actions: EmployeeAction[] = [];
  if (canEdit(auth)) {
    actions.push('edit');
    if (isActive) actions.push('deactivate');
  }
  if (!isActive && canReactivate(auth)) actions.push('activate');
  return actions;
};
