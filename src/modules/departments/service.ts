import { Op, literal, type WhereOptions } from 'sequelize';
import { ROLES, type AuthContext } from '../../core/auth';
import { models, type Row } from '../../core/db';
import { conflict, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import type { DepartmentInput, departmentListQuery } from './schemas';
import type { z } from 'zod';

const WHOLE_MINE = new Set<string>([ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES]);

/** Department-bound roles only ever see their own department. */
const scope = (auth: AuthContext): WhereOptions =>
  WHOLE_MINE.has(auth.role) ? {} : { id: auth.departmentId ?? '00000000-0000-0000-0000-000000000000' };

const SECTION_COUNT = literal('(SELECT COUNT(*) FROM sections s WHERE s.department_id = "Department"."id")');

export const toDepartment = (row: Row) => ({
  id: row.id as string,
  name: row.name as string,
  code: (row.code as string | null) ?? null,
  description: (row.description as string | null) ?? null,
  isActive: !!row.isActive,
  sectionCount: Number(row.get('sectionCount') ?? 0),
  createdAt: row.createdAt as Date,
});

export type DepartmentDto = ReturnType<typeof toDepartment>;

export const listDepartments = async (auth: AuthContext, q: z.infer<typeof departmentListQuery>) => {
  const where: WhereOptions[] = [scope(auth)];
  if (q.q) where.push({ [Op.or]: [{ name: { [Op.iLike]: likeTerm(q.q) } }, { code: { [Op.iLike]: likeTerm(q.q) } }] });
  if (q.status) where.push({ isActive: q.status === 'active' });

  const { rows, count } = await models.Department.findAndCountAll({
    where: { [Op.and]: where },
    attributes: { include: [[SECTION_COUNT, 'sectionCount']] },
    order: [[q.sort ?? 'name', q.sort ? q.order.toUpperCase() : 'ASC']],
    ...pageWindow(q),
  });
  return { rows: rows.map(toDepartment), count };
};

export const departmentOptions = async (auth: AuthContext) => {
  const rows = await models.Department.findAll({
    where: { [Op.and]: [scope(auth), { isActive: true }] },
    attributes: ['id', 'name'],
    order: [['name', 'ASC']],
  });
  return rows.map((r) => ({ id: r.id as string, name: r.name as string }));
};

export const getDepartment = async (auth: AuthContext, id: string) => {
  const row = await models.Department.findOne({
    where: { [Op.and]: [scope(auth), { id }] },
    attributes: { include: [[SECTION_COUNT, 'sectionCount']] },
  });
  if (!row) throw notFound('Department');
  return toDepartment(row);
};

export const createDepartment = async (input: DepartmentInput) => {
  const row = await models.Department.create(input);
  return toDepartment(row);
};

export const updateDepartment = async (auth: AuthContext, id: string, input: DepartmentInput) => {
  const row = await models.Department.findByPk(id);
  if (!row) throw notFound('Department');
  await row.update(input);
  return getDepartment(auth, id);
};

export const deleteDepartment = async (id: string) => {
  const row = await models.Department.findByPk(id);
  if (!row) throw notFound('Department');
  const sections = await models.Section.count({ where: { departmentId: id } });
  if (sections > 0) {
    throw conflict(`This department still has ${sections} section${sections === 1 ? '' : 's'}. Move or delete them first, or mark it inactive.`);
  }
  await row.destroy();
};
