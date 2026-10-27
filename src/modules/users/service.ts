import { randomInt } from 'node:crypto';
import { Op, col, fn, literal, where as sqlWhere, type Includeable, type Order, type Transaction, type WhereOptions } from 'sequelize';
import { ROLES, type AuthContext, type Role } from '../../core/auth';
import { inTransaction, models, type Row } from '../../core/db';
import { AppError, conflict, notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { revokeUserSessions } from '../../core/sessions';
import { roleLabel } from '../roles/service';
import type { CreateUserInput, UpdateUserInput, UserListQuery } from './schemas';

const DEPARTMENT_SCOPED = new Set<string>([ROLES.HOD, ROLES.DEPARTMENT_REP]);

const invalid = (field: string, message: string) =>
  new AppError('VALIDATION_FAILED', message, { fieldErrors: { [field]: [message] } });

const userIncludes = (roleName?: string): Includeable[] => [
  {
    model: models.Role,
    as: 'role',
    attributes: ['id', 'name', 'description'],
    ...(roleName ? { where: { name: roleName }, required: true } : {}),
  },
  {
    model: models.Employee,
    as: 'employee',
    attributes: ['id', 'worksNumber', 'firstName', 'lastName', 'email'],
    include: [
      {
        model: models.Section,
        as: 'section',
        attributes: ['id', 'name'],
        include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
      },
    ],
  },
  { model: models.Department, as: 'managedDepartment', attributes: ['id', 'name'] },
  { model: models.Section, as: 'managedSection', attributes: ['id', 'name'] },
];

const ref = (row: Row | null | undefined) => (row ? { id: row.id as string, name: row.name as string } : null);

export const toUser = (row: Row) => {
  const employee = row.employee;
  return {
    id: row.id as string,
    username: row.username as string,
    name: employee ? `${employee.firstName} ${employee.lastName}` : (row.username as string),
    role: {
      id: row.role?.id as string,
      key: row.role?.name as Role,
      name: roleLabel(row.role?.name, row.role?.description),
    },
    isActive: !!row.isActive,
    mustChangePassword: !!row.mustChangePassword,
    lastLogin: (row.lastLogin as Date | null) ?? null,
    createdAt: row.createdAt as Date,
    employee: employee
      ? {
          id: employee.id as string,
          worksNumber: employee.worksNumber as string,
          email: (employee.email as string | null) ?? null,
          section: ref(employee.section),
          department: ref(employee.section?.department),
        }
      : null,
    managedDepartment: ref(row.managedDepartment),
    managedSection: ref(row.managedSection),
  };
};

export type UserDto = ReturnType<typeof toUser>;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/** 12 random characters in groups of four, always mixing letters and digits. */
export const temporaryPassword = (): string => {
  const chars = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  if (!/[0-9]/.test(chars) || !/[A-Za-z]/.test(chars)) return temporaryPassword();
  return chars.match(/.{4}/g)!.join('-');
};

const sortOrder = (q: UserListQuery): Order => {
  const dir = q.sort ? q.order.toUpperCase() : 'ASC';
  const tail: Order = [['username', 'ASC']];
  switch (q.sort) {
    case 'name':
      return [
        [{ model: models.Employee, as: 'employee' }, 'firstName', `${dir} NULLS LAST`],
        [{ model: models.Employee, as: 'employee' }, 'lastName', `${dir} NULLS LAST`],
        ...tail,
      ];
    case 'role':
      return [[{ model: models.Role, as: 'role' }, 'name', dir], ...tail];
    case 'lastLogin':
      return [['lastLogin', `${dir} NULLS LAST`], ...tail];
    case 'createdAt':
      return [['createdAt', dir], ...tail];
    default:
      return [['username', dir]];
  }
};

export const listUsers = async (q: UserListQuery) => {
  const where: WhereOptions[] = [];
  if (q.q) {
    const term = likeTerm(q.q);
    where.push({
      [Op.or]: [
        { username: { [Op.iLike]: term } },
        { '$employee.worksNumber$': { [Op.iLike]: term } },
        sqlWhere(fn('concat', col('employee.firstName'), ' ', col('employee.lastName')), { [Op.iLike]: term }),
      ],
    });
  }
  if (q.status) where.push({ isActive: q.status === 'active' });

  const { rows, count } = await models.User.findAndCountAll({
    where: { [Op.and]: where },
    attributes: { exclude: ['passwordHash'] },
    include: userIncludes(q.role),
    order: sortOrder(q),
    distinct: true,
    col: 'id',
    ...pageWindow(q),
  });
  return { rows: rows.map(toUser), count };
};

export const getUser = async (id: string, transaction?: Transaction) => {
  const row = await models.User.findByPk(id, {
    attributes: { exclude: ['passwordHash'] },
    include: userIncludes(),
    transaction,
  });
  if (!row) throw notFound('User');
  return toUser(row);
};

const NO_ACCOUNT = literal('NOT EXISTS (SELECT 1 FROM users u WHERE u.employee_id = "Employee"."id")');

/** Active employees who do not have an account yet, for the create-user picker. */
export const employeeOptions = async (q?: string) => {
  const where: WhereOptions[] = [{ isActive: true }, NO_ACCOUNT];
  if (q) {
    const term = likeTerm(q);
    where.push({
      [Op.or]: [
        { worksNumber: { [Op.iLike]: term } },
        sqlWhere(fn('concat', col('Employee.firstName'), ' ', col('Employee.lastName')), { [Op.iLike]: term }),
      ],
    });
  }
  const rows = await models.Employee.findAll({
    where: { [Op.and]: where },
    attributes: ['id', 'worksNumber', 'firstName', 'lastName'],
    include: [
      {
        model: models.Section,
        as: 'section',
        attributes: ['id', 'name'],
        include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
      },
    ],
    order: [
      ['firstName', 'ASC'],
      ['lastName', 'ASC'],
    ],
    limit: 20,
  });
  return rows.map((e) => ({
    id: e.id as string,
    name: `${e.firstName} ${e.lastName}`,
    worksNumber: e.worksNumber as string,
    section: ref(e.section),
    department: ref(e.section?.department),
  }));
};

/** Active sections with their department, for the section-rep scope picker. */
export const sectionOptions = async () => {
  const rows = await models.Section.findAll({
    where: { isActive: true },
    attributes: ['id', 'name', 'departmentId'],
    include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
    order: [
      [{ model: models.Department, as: 'department' }, 'name', 'ASC'],
      ['name', 'ASC'],
    ],
  });
  return rows.map((s) => ({
    id: s.id as string,
    name: s.name as string,
    departmentId: s.departmentId as string,
    departmentName: (s.department?.name as string | undefined) ?? null,
  }));
};

/** The role and the one scope it needs: a department for HOD/department rep, a section for section rep. */
const resolveAccess = async (input: Pick<CreateUserInput, 'roleId' | 'departmentId' | 'sectionId'>, t: Transaction) => {
  const role = await models.Role.findByPk(input.roleId, { transaction: t });
  if (!role) throw invalid('roleId', 'Choose a role');

  let departmentId: string | null = null;
  let sectionId: string | null = null;
  if (DEPARTMENT_SCOPED.has(role.name)) {
    if (!input.departmentId) throw invalid('departmentId', `Choose the department this ${roleLabel(role.name).toLowerCase()} manages`);
    if (!(await models.Department.findByPk(input.departmentId, { attributes: ['id'], transaction: t }))) {
      throw invalid('departmentId', 'Choose a department');
    }
    departmentId = input.departmentId;
  }
  if (role.name === ROLES.SECTION_REP) {
    if (!input.sectionId) throw invalid('sectionId', 'Choose the section this representative manages');
    if (!(await models.Section.findByPk(input.sectionId, { attributes: ['id'], transaction: t }))) {
      throw invalid('sectionId', 'Choose a section');
    }
    sectionId = input.sectionId;
  }
  return { role, departmentId, sectionId };
};

const assertUsernameFree = async (username: string, t: Transaction, exceptId?: string) => {
  const taken = await models.User.findOne({
    where: {
      [Op.and]: [
        sqlWhere(fn('lower', col('username')), username.toLowerCase()),
        ...(exceptId ? [{ id: { [Op.ne]: exceptId } }] : []),
      ],
    },
    attributes: ['id'],
    transaction: t,
  });
  if (taken) throw conflict('This username is already taken');
};

export const createUser = async (input: CreateUserInput) => {
  const password = temporaryPassword();
  const user = await inTransaction(async (t) => {
    const employee = await models.Employee.findByPk(input.employeeId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!employee || !employee.isActive) throw invalid('employeeId', 'Choose an active employee');
    if (await models.User.findOne({ where: { employeeId: employee.id }, attributes: ['id'], transaction: t })) {
      throw conflict('This employee already has a user account');
    }
    await assertUsernameFree(input.username, t);
    const { role, departmentId, sectionId } = await resolveAccess(input, t);

    const row = await models.User.create(
      {
        username: input.username,
        passwordHash: password,
        employeeId: employee.id,
        roleId: role.id,
        departmentId,
        sectionId,
        isActive: true,
        mustChangePassword: true,
      },
      { transaction: t }
    );
    return getUser(row.id, t);
  });
  return { ...user, temporaryPassword: password };
};

export const updateUser = async (auth: AuthContext, id: string, input: UpdateUserInput) => {
  const { deactivated } = await inTransaction(async (t) => {
    const row = await models.User.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!row) throw notFound('User');
    const { role, departmentId, sectionId } = await resolveAccess(input, t);

    if (id === auth.userId) {
      if (!input.isActive) throw conflict('You cannot deactivate your own account');
      if (role.name !== ROLES.ADMIN) throw conflict('You cannot remove your own administrator role');
    }
    if (input.username !== row.username) await assertUsernameFree(input.username, t, id);

    const wasActive = !!row.isActive;
    await row.update(
      { username: input.username, roleId: role.id, departmentId, sectionId, isActive: input.isActive },
      { transaction: t }
    );
    return { deactivated: wasActive && !input.isActive };
  });
  if (deactivated) await revokeUserSessions(id);
  return getUser(id);
};

export const resetPassword = async (auth: AuthContext, id: string) => {
  if (id === auth.userId) throw conflict('Use Change password to change your own password');
  const password = temporaryPassword();
  const username = await inTransaction(async (t) => {
    const row = await models.User.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!row) throw notFound('User');
    await row.update({ passwordHash: password, mustChangePassword: true }, { transaction: t });
    return row.username as string;
  });
  await revokeUserSessions(id);
  return { id, username, mustChangePassword: true, temporaryPassword: password };
};
