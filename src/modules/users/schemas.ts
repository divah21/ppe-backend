import { z } from 'zod';
import { ROLES } from '../../core/auth';
import { listQuery } from '../../core/http';

const ROLE_NAMES = Object.values(ROLES) as [string, ...string[]];

export const userListQuery = listQuery(['username', 'name', 'role', 'lastLogin', 'createdAt'], {
  role: z.enum(ROLE_NAMES).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const employeeOptionsQuery = z.object({
  q: z.string().trim().max(100).optional(),
});

const optionalId = z
  .union([z.string().uuid(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

const username = z
  .string()
  .trim()
  .min(3, 'Use at least 3 characters')
  .max(100, 'Use at most 100 characters')
  .regex(/^[A-Za-z0-9._@-]+$/, 'Use letters, numbers, dots, dashes, underscores or @ only');

const access = {
  roleId: z.string({ required_error: 'Choose a role' }).uuid('Choose a role'),
  departmentId: optionalId,
  sectionId: optionalId,
};

export const createUserBody = z.object({
  employeeId: z.string({ required_error: 'Choose an employee' }).uuid('Choose an employee'),
  username,
  ...access,
});

export const updateUserBody = z.object({
  username,
  ...access,
  isActive: z.boolean(),
});

export type CreateUserInput = z.infer<typeof createUserBody>;
export type UpdateUserInput = z.infer<typeof updateUserBody>;
export type UserListQuery = z.infer<typeof userListQuery>;
