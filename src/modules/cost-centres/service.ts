import { Op, col, fn, literal, where as sqlWhere, type Transaction, type WhereOptions } from 'sequelize';
import { ROLES, type AuthContext } from '../../core/auth';
import { inTransaction, models, type Row } from '../../core/db';
import { AppError, conflict, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { DEPARTMENT_BOUND, NO_ID, WHOLE_MINE } from '../sections/policy';
import type { CostCentreInput, CostCentreListQuery } from './schemas';

/**
 * Cost centres belong to a department (or to none, mine-wide). Department-bound roles see their
 * department's; a section rep sees the department of their section. Unassigned ones are mine-wide only.
 */
const scope = async (auth: AuthContext): Promise<WhereOptions> => {
  if (WHOLE_MINE.has(auth.role)) return {};
  if (DEPARTMENT_BOUND.has(auth.role)) return { departmentId: auth.departmentId ?? NO_ID };
  if (auth.role === ROLES.SECTION_REP && auth.sectionId) {
    const section = await models.Section.findByPk(auth.sectionId, { attributes: ['id', 'departmentId'] });
    return { departmentId: (section?.departmentId as string | undefined) ?? NO_ID };
  }
  return { id: NO_ID };
};

const EMPLOYEE_COUNT = literal(
  '(SELECT COUNT(*) FROM employees e WHERE e."costCenterId" = "CostCenter"."id" AND e."isActive" = true)'
);
const COUNTS = { include: [[EMPLOYEE_COUNT, 'employeeCount']] } as never;

const departmentInclude = () => ({ model: models.Department, as: 'department', attributes: ['id', 'name'] });

export const toCostCentre = (row: Row) => ({
  id: row.id as string,
  code: row.code as string,
  name: row.name as string,
  description: (row.description as string | null) ?? null,
  isActive: !!row.isActive,
  departmentId: (row.departmentId as string | null) ?? null,
  department: row.department ? { id: row.department.id as string, name: row.department.name as string } : null,
  employeeCount: Number(row.get('employeeCount') ?? 0),
  createdAt: row.createdAt as Date,
});

export type CostCentreDto = ReturnType<typeof toCostCentre>;

const sortKey = (sort: CostCentreListQuery['sort']) =>
  sort === 'department' ? [departmentInclude(), 'name'] : [sort ?? 'code'];

export const listCostCentres = async (auth: AuthContext, q: CostCentreListQuery) => {
  const where: WhereOptions[] = [await scope(auth)];
  if (q.q) where.push({ [Op.or]: [{ code: { [Op.iLike]: likeTerm(q.q) } }, { name: { [Op.iLike]: likeTerm(q.q) } }] });
  if (q.status) where.push({ isActive: q.status === 'active' });
  if (q.departmentId) where.push({ departmentId: q.departmentId });

  const { rows, count } = await models.CostCenter.findAndCountAll({
    where: { [Op.and]: where },
    include: [departmentInclude()],
    attributes: COUNTS,
    order: [[...sortKey(q.sort), q.sort ? q.order.toUpperCase() : 'ASC'], ['id', 'ASC']] as never,
    ...pageWindow(q),
  });
  return { rows: rows.map(toCostCentre), count };
};

/** Picker entries read "CODE · Name" so codes stay visible where cost centres are chosen. */
export const costCentreOptions = async (auth: AuthContext, departmentId?: string) => {
  const where: WhereOptions[] = [await scope(auth), { isActive: true }];
  if (departmentId) where.push({ departmentId });
  const rows = await models.CostCenter.findAll({
    where: { [Op.and]: where },
    attributes: ['id', 'code', 'name'],
    order: [['code', 'ASC']],
  });
  return rows.map((r) => ({ id: r.id as string, name: `${r.code} · ${r.name}` }));
};

export const getCostCentre = async (auth: AuthContext, id: string) => {
  const row = await models.CostCenter.findOne({
    where: { [Op.and]: [await scope(auth), { id }] },
    include: [departmentInclude()],
    attributes: COUNTS,
  });
  if (!row) throw notFound('Cost centre');
  return toCostCentre(row);
};

const checkDepartment = async (departmentId: string | null, t: Transaction) => {
  if (!departmentId) return;
  const department = await models.Department.findByPk(departmentId, { transaction: t, lock: t.LOCK.SHARE });
  if (!department) {
    throw new AppError('VALIDATION_FAILED', 'Some fields are invalid', {
      fieldErrors: { departmentId: ['Choose a department'] },
    });
  }
};

const assertUniqueCode = async (code: string, t: Transaction, exceptId?: string) => {
  const clash = await models.CostCenter.findOne({
    where: {
      [Op.and]: [sqlWhere(fn('lower', col('code')), code.toLowerCase()), ...(exceptId ? [{ id: { [Op.ne]: exceptId } }] : [])],
    },
    transaction: t,
  });
  if (clash) throw conflict(`Another cost centre already uses the code ${code}`);
};

export const createCostCentre = async (auth: AuthContext, input: CostCentreInput) => {
  const id = await inTransaction(async (t) => {
    await checkDepartment(input.departmentId, t);
    await assertUniqueCode(input.code, t);
    const row = await models.CostCenter.create(input, { transaction: t });
    return row.id as string;
  });
  return getCostCentre(auth, id);
};

export const updateCostCentre = async (auth: AuthContext, id: string, input: CostCentreInput) => {
  await inTransaction(async (t) => {
    const row = await models.CostCenter.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!row) throw notFound('Cost centre');
    await checkDepartment(input.departmentId, t);
    // Only a changed code is checked, so legacy case-variant duplicates can still be edited
    if (String(row.code).toLowerCase() !== input.code.toLowerCase()) await assertUniqueCode(input.code, t, id);
    await row.update(input, { transaction: t });
  });
  return getCostCentre(auth, id);
};

export const deleteCostCentre = async (id: string) =>
  inTransaction(async (t) => {
    const row = await models.CostCenter.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!row) throw notFound('Cost centre');
    // The database would silently unlink employees (ON DELETE SET NULL), so assigned employees block deletion
    const employees = await models.Employee.count({ where: { costCenterId: id }, transaction: t });
    if (employees > 0) {
      throw conflict(
        `This cost centre still has ${employees} employee${employees === 1 ? '' : 's'}. Reassign them first, or mark it inactive.`,
        { employees }
      );
    }
    await row.destroy({ transaction: t });
  });
