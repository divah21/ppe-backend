import { Op, col, fn, literal, where as sqlWhere, type Transaction, type WhereOptions } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { inTransaction, models, type Row } from '../../core/db';
import { AppError, conflict, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { sectionScope } from './policy';
import { assertUnreferenced, type Reference } from './references';
import type { SectionInput, SectionListQuery } from './schemas';

const EMPLOYEE_COUNT = literal(
  '(SELECT COUNT(*) FROM employees e WHERE e."sectionId" = "Section"."id" AND e."isActive" = true)'
);
const JOB_TITLE_COUNT = literal('(SELECT COUNT(*) FROM job_titles j WHERE j."sectionId" = "Section"."id")');
const COUNTS = { include: [[EMPLOYEE_COUNT, 'employeeCount'], [JOB_TITLE_COUNT, 'jobTitleCount']] } as never;

const departmentInclude = () => ({ model: models.Department, as: 'department', attributes: ['id', 'name'] });

export const toSection = (row: Row) => ({
  id: row.id as string,
  name: row.name as string,
  code: (row.code as string | null) ?? null,
  description: (row.description as string | null) ?? null,
  isActive: !!row.isActive,
  departmentId: row.departmentId as string,
  department: row.department ? { id: row.department.id as string, name: row.department.name as string } : null,
  employeeCount: Number(row.get('employeeCount') ?? 0),
  jobTitleCount: Number(row.get('jobTitleCount') ?? 0),
  createdAt: row.createdAt as Date,
});

export type SectionDto = ReturnType<typeof toSection>;

const sortKey = (sort: SectionListQuery['sort']) =>
  sort === 'department' ? [departmentInclude(), 'name'] : [sort ?? 'name'];

export const listSections = async (auth: AuthContext, q: SectionListQuery) => {
  const where: WhereOptions[] = [sectionScope(auth)];
  if (q.q) where.push({ [Op.or]: [{ name: { [Op.iLike]: likeTerm(q.q) } }, { code: { [Op.iLike]: likeTerm(q.q) } }] });
  if (q.status) where.push({ isActive: q.status === 'active' });
  if (q.departmentId) where.push({ departmentId: q.departmentId });

  const { rows, count } = await models.Section.findAndCountAll({
    where: { [Op.and]: where },
    include: [departmentInclude()],
    attributes: COUNTS,
    order: [[...sortKey(q.sort), q.sort ? q.order.toUpperCase() : 'ASC'], ['id', 'ASC']] as never,
    ...pageWindow(q),
  });
  return { rows: rows.map(toSection), count };
};

export const sectionOptions = async (auth: AuthContext, departmentId?: string) => {
  const where: WhereOptions[] = [sectionScope(auth), { isActive: true }];
  if (departmentId) where.push({ departmentId });
  const rows = await models.Section.findAll({
    where: { [Op.and]: where },
    attributes: ['id', 'name'],
    order: [['name', 'ASC']],
  });
  return rows.map((r) => ({ id: r.id as string, name: r.name as string }));
};

export const getSection = async (auth: AuthContext, id: string) => {
  const row = await models.Section.findOne({
    where: { [Op.and]: [sectionScope(auth), { id }] },
    include: [departmentInclude()],
    attributes: COUNTS,
  });
  if (!row) throw notFound('Section');
  return toSection(row);
};

/** Locks the department so concurrent saves cannot create duplicate names in it. */
const lockDepartment = async (departmentId: string, t: Transaction) => {
  const department = await models.Department.findByPk(departmentId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!department) {
    throw new AppError('VALIDATION_FAILED', 'Some fields are invalid', {
      fieldErrors: { departmentId: ['Choose a department'] },
    });
  }
};

const assertUniqueName = async (input: SectionInput, t: Transaction, exceptId?: string) => {
  const clash = await models.Section.findOne({
    where: {
      [Op.and]: [
        { departmentId: input.departmentId },
        sqlWhere(fn('lower', col('name')), input.name.toLowerCase()),
        ...(exceptId ? [{ id: { [Op.ne]: exceptId } }] : []),
      ],
    },
    transaction: t,
  });
  if (clash) throw conflict('A section with this name already exists in the department');
};

export const createSection = async (auth: AuthContext, input: SectionInput) => {
  const id = await inTransaction(async (t) => {
    await lockDepartment(input.departmentId, t);
    await assertUniqueName(input, t);
    const row = await models.Section.create(input, { transaction: t });
    return row.id as string;
  });
  return getSection(auth, id);
};

export const updateSection = async (auth: AuthContext, id: string, input: SectionInput) => {
  await inTransaction(async (t) => {
    const row = await models.Section.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!row) throw notFound('Section');
    await lockDepartment(input.departmentId, t);
    await assertUniqueName(input, t, id);
    await row.update(input, { transaction: t });
  });
  return getSection(auth, id);
};

const REFERENCES: Reference[] = [
  { key: 'employees', sql: 'SELECT COUNT(*) FROM employees WHERE "sectionId" = :id', one: 'employee', many: 'employees' },
  { key: 'jobTitles', sql: 'SELECT COUNT(*) FROM job_titles WHERE "sectionId" = :id', one: 'job title', many: 'job titles' },
  { key: 'users', sql: 'SELECT COUNT(*) FROM users WHERE section_id = :id', one: 'user account', many: 'user accounts' },
  { key: 'ppeMatrix', sql: 'SELECT COUNT(*) FROM section_ppe_matrix WHERE section_id = :id', one: 'PPE matrix entry', many: 'PPE matrix entries' },
  { key: 'requests', sql: 'SELECT COUNT(*) FROM requests WHERE section_id = :id', one: 'PPE request', many: 'PPE requests' },
  { key: 'budgets', sql: 'SELECT COUNT(*) FROM budgets WHERE section_id = :id', one: 'budget', many: 'budgets' },
  { key: 'consumableRequests', sql: 'SELECT COUNT(*) FROM consumable_requests WHERE section_id = :id', one: 'consumable request', many: 'consumable requests' },
  { key: 'consumableAllocations', sql: 'SELECT COUNT(*) FROM consumable_allocations WHERE section_id = :id', one: 'consumable issue', many: 'consumable issues' },
];

export const deleteSection = async (id: string) =>
  inTransaction(async (t) => {
    const row = await models.Section.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!row) throw notFound('Section');
    // The database would cascade-delete job titles and orphan history, so any reference blocks deletion
    await assertUnreferenced(id, REFERENCES, t, (uses) =>
      `This section is still used by ${uses}. Move or remove them first, or mark the section inactive.`
    );
    await row.destroy({ transaction: t });
  });
