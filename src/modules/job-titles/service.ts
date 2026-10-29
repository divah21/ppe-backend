import { Op, col, fn, literal, where as sqlWhere, type Transaction, type WhereOptions } from 'sequelize';
import { ROLES, type AuthContext } from '../../core/auth';
import { inTransaction, models, type Row } from '../../core/db';
import { AppError, conflict, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { DEPARTMENT_BOUND, NO_ID, WHOLE_MINE } from '../sections/policy';
import { assertUnreferenced, type Reference } from '../sections/references';
import { assertCategory, assertNoFollowers } from './categories';
import type { JobTitleInput, JobTitleListQuery } from './schemas';

/** Job titles follow their section: whole mine, the user's department, or the user's section. */
const scope = (auth: AuthContext): WhereOptions => {
  if (WHOLE_MINE.has(auth.role)) return {};
  if (DEPARTMENT_BOUND.has(auth.role)) return { '$section.department_id$': auth.departmentId ?? NO_ID };
  if (auth.role === ROLES.SECTION_REP) return { sectionId: auth.sectionId ?? NO_ID };
  return { id: NO_ID };
};

const EMPLOYEE_COUNT = literal(
  '(SELECT COUNT(*) FROM employees e WHERE e."jobTitleId" = "JobTitle"."id" AND e."isActive" = true)'
);
const HAS_MATRIX = 'EXISTS (SELECT 1 FROM job_title_ppe_matrix m WHERE m."jobTitleId" = "JobTitle"."id" AND m.is_active)';
const IS_CATEGORY = `"JobTitle"."ppeCategoryId" IS NULL AND ${HAS_MATRIX}`;
const COUNTS = { include: [[EMPLOYEE_COUNT, 'employeeCount'], [literal(HAS_MATRIX), 'hasMatrix']] } as never;

const categoryInclude = () => ({ model: models.JobTitle, as: 'ppeCategory', attributes: ['id', 'name'], required: false });

const sectionInclude = () => ({
  model: models.Section,
  as: 'section',
  attributes: ['id', 'name', 'departmentId'],
  required: true,
  include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
});

export const toJobTitle = (row: Row) => ({
  id: row.id as string,
  name: row.name as string,
  code: (row.code as string | null) ?? null,
  description: (row.description as string | null) ?? null,
  isActive: !!row.isActive,
  sectionId: row.sectionId as string,
  section: row.section ? { id: row.section.id as string, name: row.section.name as string } : null,
  departmentId: (row.section?.departmentId as string | undefined) ?? null,
  department: row.section?.department
    ? { id: row.section.department.id as string, name: row.section.department.name as string }
    : null,
  employeeCount: Number(row.get('employeeCount') ?? 0),
  hasMatrix: !!row.get('hasMatrix'),
  ppeCategory: row.ppeCategory ? { id: row.ppeCategory.id as string, name: row.ppeCategory.name as string } : null,
  createdAt: row.createdAt as Date,
});

export type JobTitleDto = ReturnType<typeof toJobTitle>;

const sortKey = (sort: JobTitleListQuery['sort']) => {
  const section = { model: models.Section, as: 'section' };
  if (sort === 'section') return [section, 'name'];
  if (sort === 'department') return [section, { model: models.Department, as: 'department' }, 'name'];
  return [sort ?? 'name'];
};

export const listJobTitles = async (auth: AuthContext, q: JobTitleListQuery) => {
  const where: WhereOptions[] = [scope(auth)];
  if (q.q) where.push({ [Op.or]: [{ name: { [Op.iLike]: likeTerm(q.q) } }, { code: { [Op.iLike]: likeTerm(q.q) } }] });
  if (q.status) where.push({ isActive: q.status === 'active' });
  if (q.sectionId) where.push({ sectionId: q.sectionId });
  if (q.departmentId) where.push({ '$section.department_id$': q.departmentId });
  if (q.category === 'mapped') where.push({ ppeCategoryId: { [Op.ne]: null } });
  if (q.category === 'unmapped') where.push({ ppeCategoryId: null }, literal(`NOT ${HAS_MATRIX}`));
  if (q.category === 'categories') where.push(literal(IS_CATEGORY));

  const { rows, count } = await models.JobTitle.findAndCountAll({
    where: { [Op.and]: where },
    include: [sectionInclude(), categoryInclude()],
    attributes: COUNTS,
    order: [[...sortKey(q.sort), q.sort ? q.order.toUpperCase() : 'ASC'], ['id', 'ASC']] as never,
    ...pageWindow(q),
  });
  return { rows: rows.map(toJobTitle), count };
};

export const jobTitleOptions = async (auth: AuthContext, filter: { sectionId?: string; departmentId?: string }) => {
  const where: WhereOptions[] = [scope(auth), { isActive: true }];
  if (filter.sectionId) where.push({ sectionId: filter.sectionId });
  if (filter.departmentId) where.push({ '$section.department_id$': filter.departmentId });
  const rows = await models.JobTitle.findAll({
    where: { [Op.and]: where },
    attributes: ['id', 'name'],
    include: [{ model: models.Section, as: 'section', attributes: [], required: true }],
    order: [['name', 'ASC']],
  });
  return rows.map((r) => ({ id: r.id as string, name: r.name as string }));
};

export const getJobTitle = async (auth: AuthContext, id: string) => {
  const row = await models.JobTitle.findOne({
    where: { [Op.and]: [scope(auth), { id }] },
    include: [sectionInclude(), categoryInclude()],
    attributes: COUNTS,
  });
  if (!row) throw notFound('Job title');
  return toJobTitle(row);
};

/** Locks the section so concurrent saves cannot create duplicate names in it. */
const lockSection = async (sectionId: string, t: Transaction) => {
  const section = await models.Section.findByPk(sectionId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!section) {
    throw new AppError('VALIDATION_FAILED', 'Some fields are invalid', { fieldErrors: { sectionId: ['Choose a section'] } });
  }
};

const assertUnique = async (input: JobTitleInput, t: Transaction, current?: Row) => {
  const exceptId = current?.id as string | undefined;
  const notSelf = exceptId ? [{ id: { [Op.ne]: exceptId } }] : [];
  const lower = (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : '');
  // Only changed values are checked, so legacy case-variant duplicates can still be edited
  const nameChanged = !current || current.sectionId !== input.sectionId || lower(current.name) !== lower(input.name);
  const codeChanged = !current || lower(current.code) !== lower(input.code);

  const sameName = nameChanged && (await models.JobTitle.findOne({
    where: {
      [Op.and]: [{ sectionId: input.sectionId }, sqlWhere(fn('lower', col('name')), input.name.toLowerCase()), ...notSelf],
    },
    transaction: t,
  }));
  if (sameName) throw conflict('A job title with this name already exists in the section');

  if (input.code && codeChanged) {
    const sameCode = await models.JobTitle.findOne({
      where: { [Op.and]: [sqlWhere(fn('lower', col('code')), input.code.toLowerCase()), ...notSelf] },
      transaction: t,
    });
    if (sameCode) throw conflict(`Another job title already uses the code ${input.code}`);
  }
};

export const createJobTitle = async (auth: AuthContext, input: JobTitleInput) => {
  const id = await inTransaction(async (t) => {
    await lockSection(input.sectionId, t);
    await assertUnique(input, t);
    await assertCategory(input.ppeCategoryId, null, t);
    const row = await models.JobTitle.create(input, { transaction: t });
    return row.id as string;
  });
  return getJobTitle(auth, id);
};

export const updateJobTitle = async (auth: AuthContext, id: string, input: JobTitleInput) => {
  await inTransaction(async (t) => {
    const row = await models.JobTitle.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!row) throw notFound('Job title');
    await lockSection(input.sectionId, t);
    await assertUnique(input, t, row);
    if (input.ppeCategoryId && input.ppeCategoryId !== row.ppeCategoryId) {
      await assertCategory(input.ppeCategoryId, id, t);
      await assertNoFollowers(id, row.name as string, t);
    }
    await row.update(input, { transaction: t });
  });
  return getJobTitle(auth, id);
};

const REFERENCES: Reference[] = [
  { key: 'employees', sql: 'SELECT COUNT(*) FROM employees WHERE "jobTitleId" = :id', one: 'employee', many: 'employees' },
  { key: 'ppeMatrix', sql: 'SELECT COUNT(*) FROM job_title_ppe_matrix WHERE "jobTitleId" = :id', one: 'PPE matrix entry', many: 'PPE matrix entries' },
  { key: 'mappedJobTitles', sql: 'SELECT COUNT(*) FROM job_titles WHERE "ppeCategoryId" = :id AND id <> :id', one: 'job title mapped to it', many: 'job titles mapped to it' },
];

export const deleteJobTitle = async (id: string) =>
  inTransaction(async (t) => {
    const row = await models.JobTitle.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!row) throw notFound('Job title');
    // The database would silently unlink employees and PPE matrix rows, so any reference blocks deletion
    await assertUnreferenced(id, REFERENCES, t, (uses) =>
      `This job title is still used by ${uses}. Reassign them first, or mark the job title inactive.`
    );
    await row.destroy({ transaction: t });
  });
