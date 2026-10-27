const { Op, literal, where } = require('sequelize');
const { sequelize } = require('../database/db');
const { Employee, Section } = require('../models');

/*
 * Record scoping for the v1 routes, mirroring v2 (src/modules/{employees,requests}/policy.ts):
 * admin, sheq and stores see the whole mine, hod and department-rep their department,
 * section-rep their section. Without it the same login reads any record through /api/v1.
 */

const NONE = '00000000-0000-0000-0000-000000000000';
const WHOLE_MINE = new Set(['admin', 'sheq', 'stores']);
const DEPARTMENT_BOUND = new Set(['hod', 'department-rep']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isWholeMine = (req) => WHOLE_MINE.has(req.userRole);

const sectionsOfDepartment = (departmentId) =>
  literal(`(SELECT s.id FROM sections s WHERE s.department_id = ${sequelize.escape(departmentId || NONE)})`);

/** Where clause on Employee limiting rows to the caller's scope ({} for whole-mine roles). */
const employeeScopeWhere = (req) => {
  if (isWholeMine(req)) return {};
  if (req.userRole === 'section-rep') return { sectionId: req.user.sectionId || NONE };
  if (DEPARTMENT_BOUND.has(req.userRole)) return { sectionId: { [Op.in]: sectionsOfDepartment(req.user.departmentId) } };
  return { id: NONE };
};

/** Where clause for rows owned by an employee (e.g. allocations.employee_id) in the caller's scope. */
const ownedByEmployeeInScope = (req, attribute = 'employeeId') => {
  if (isWholeMine(req)) return {};
  let employees;
  if (req.userRole === 'section-rep') {
    employees = `SELECT e.id FROM employees e WHERE e."sectionId" = ${sequelize.escape(req.user.sectionId || NONE)}`;
  } else if (DEPARTMENT_BOUND.has(req.userRole)) {
    employees = `SELECT e.id FROM employees e JOIN sections s ON s.id = e."sectionId"
      WHERE s.department_id = ${sequelize.escape(req.user.departmentId || NONE)}`;
  } else {
    return { [attribute]: NONE };
  }
  return { [attribute]: { [Op.in]: literal(`(${employees})`) } };
};

const employeeInScope = async (req, employeeId) => {
  if (isWholeMine(req)) return true;
  if (!employeeId || !UUID.test(String(employeeId))) return false;
  const count = await Employee.count({ where: { [Op.and]: [employeeScopeWhere(req), { id: employeeId }] } });
  return count > 0;
};

/** Whether the caller may place or keep an employee in this section. */
const sectionInScope = async (req, sectionId) => {
  if (isWholeMine(req)) return true;
  if (!sectionId || !UUID.test(String(sectionId))) return false;
  if (req.userRole === 'section-rep') return sectionId === req.user.sectionId;
  if (!DEPARTMENT_BOUND.has(req.userRole) || !req.user.departmentId) return false;
  const section = await Section.findByPk(sectionId, { attributes: ['id', 'departmentId'] });
  return section?.departmentId === req.user.departmentId;
};

/*
 * A request belongs to its employee's section; visitor requests (no employee) fall back to the
 * section and department stored on the request. Same SQL as v2 requests/policy.ts.
 */
const REQUEST_SECTION_SQL = `COALESCE((SELECT e."sectionId" FROM employees e WHERE e.id = "Request"."employee_id"), "Request"."section_id")`;
const REQUEST_DEPARTMENT_SQL = `COALESCE((SELECT s.department_id FROM sections s WHERE s.id = ${REQUEST_SECTION_SQL}), "Request"."department_id")`;

/** Where clause on Request (aliased "Request") limiting rows to the caller's scope. */
const requestScopeWhere = (req) => {
  if (isWholeMine(req)) return {};
  if (req.userRole === 'section-rep') return where(literal(REQUEST_SECTION_SQL), Op.eq, req.user.sectionId || NONE);
  if (DEPARTMENT_BOUND.has(req.userRole)) return where(literal(REQUEST_DEPARTMENT_SQL), Op.eq, req.user.departmentId || NONE);
  return { id: NONE };
};

/** Route guard: 404 (not 403, so ids outside scope are not confirmed) unless :id is a visible employee. */
const requireEmployeeParamInScope = async (req, res, next) => {
  try {
    if (await employeeInScope(req, req.params.id)) return next();
    return res.status(404).json({ success: false, message: 'Employee not found' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  employeeScopeWhere,
  ownedByEmployeeInScope,
  employeeInScope,
  sectionInScope,
  requestScopeWhere,
  requireEmployeeParamInScope,
  sectionsOfDepartment
};
