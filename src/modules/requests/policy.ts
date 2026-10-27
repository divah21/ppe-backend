import { Op, Sequelize, literal, type WhereOptions } from 'sequelize';
import { ROLES, type AuthContext } from '../../core/auth';
import { sequelize } from '../../core/db';

const NO_MATCH = '00000000-0000-0000-0000-000000000000';
const WHOLE_MINE = new Set<string>([ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES]);

/*
 * v1 stored the creator's section/department on a request (an admin's own section, and department is
 * often null for section reps), so the effective section is the employee's, falling back to the stored
 * one only for visitor requests; the department comes from that section.
 */
const SECTION_SQL = `COALESCE((SELECT e."sectionId" FROM employees e WHERE e.id = "Request"."employee_id"), "Request"."section_id")`;
const DEPARTMENT_SQL = `COALESCE((SELECT s.department_id FROM sections s WHERE s.id = ${SECTION_SQL}), "Request"."department_id")`;

export const inSection = (sectionId: string): WhereOptions => Sequelize.where(literal(SECTION_SQL), Op.eq, sectionId);
export const inDepartment = (departmentId: string): WhereOptions =>
  Sequelize.where(literal(DEPARTMENT_SQL), Op.eq, departmentId);

/** Requests the user may see: whole mine, their department, or their section. */
export const requestScope = (auth: AuthContext): WhereOptions => {
  if (WHOLE_MINE.has(auth.role)) return {};
  if (auth.role === ROLES.SECTION_REP) return inSection(auth.sectionId ?? NO_MATCH);
  return inDepartment(auth.departmentId ?? NO_MATCH);
};

/** Employees the user may raise or view requests for (Employee model columns are camelCase). */
export const employeeScope = (auth: AuthContext): WhereOptions => {
  if (WHOLE_MINE.has(auth.role)) return {};
  if (auth.role === ROLES.SECTION_REP) return { sectionId: auth.sectionId ?? NO_MATCH };
  const departmentId = sequelize.escape(auth.departmentId ?? NO_MATCH);
  return { sectionId: { [Op.in]: literal(`(SELECT s.id FROM sections s WHERE s.department_id = ${departmentId})`) } };
};
