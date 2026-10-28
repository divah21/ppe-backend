import { models } from '../../core/db';
import { ROLES, type Role } from '../../core/auth';

const ORDER: Role[] = [ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES, ROLES.HOD, ROLES.DEPARTMENT_REP, ROLES.SECTION_REP];

export const LABELS: Record<Role, string> = {
  admin: 'Administrator',
  sheq: 'SHEQ',
  stores: 'Stores',
  hod: 'Head of department',
  'department-rep': 'Department representative',
  'section-rep': 'Section representative',
};

export const roleLabel = (name: string, description?: string | null) =>
  description || LABELS[name as Role] || name;

export const roleOptions = async () => {
  const rows = await models.Role.findAll({ attributes: ['id', 'name', 'description'] });
  return rows
    .filter((r) => ORDER.includes(r.name))
    .sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name))
    .map((r) => ({ id: r.id as string, name: roleLabel(r.name, r.description), key: r.name as Role }));
};
