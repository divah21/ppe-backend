import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Row } from '../src/core/db';
import { models, sequelize } from '../src/core/db';

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
export const app = require('../app');

export const ORIGIN = 'http://localhost:3000';
export const PASSWORD = 'Test-pass-123';

type ModelName = keyof typeof models;

/**
 * Creates test rows (all prefixed zz-) and deletes them, newest first, in cleanup().
 * Use track() for rows the API creates so they are removed too.
 */
export const createFixtures = () => {
  const tag = `zz-${randomUUID().slice(0, 8)}`;
  const created: Array<{ model: ModelName; id: string }> = [];

  const track = (model: ModelName, id: string) => {
    created.push({ model, id });
    return id;
  };

  const make = async (model: ModelName, values: Record<string, unknown>): Promise<Row> => {
    const row = await models[model].create(values);
    track(model, row.id);
    return row;
  };

  const role = async (name: string) => {
    const r = await models.Role.findOne({ where: { name } });
    if (!r) throw new Error(`Role ${name} is not seeded`);
    return r;
  };

  const org = async () => {
    const department = await make('Department', { name: `${tag}-dept`, code: `${tag}-D` });
    const section = await make('Section', { name: `${tag}-section`, departmentId: department.id });
    return { department, section };
  };

  const employee = async (sectionId: string, extra: Record<string, unknown> = {}) =>
    make('Employee', {
      worksNumber: `${tag}-${created.length}`,
      firstName: 'Test',
      lastName: `Person${created.length}`,
      sectionId,
      ...extra,
    });

  const user = async (
    roleName: string,
    opts: { employeeId?: string; departmentId?: string; sectionId?: string; mustChangePassword?: boolean } = {}
  ) =>
    make('User', {
      username: `${tag}-${roleName}-${created.length}`,
      passwordHash: PASSWORD,
      roleId: (await role(roleName)).id,
      isActive: true,
      mustChangePassword: opts.mustChangePassword ?? false,
      employeeId: opts.employeeId ?? null,
      departmentId: opts.departmentId ?? null,
      sectionId: opts.sectionId ?? null,
    });

  const cleanup = async () => {
    await sequelize.query(`DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM users WHERE username LIKE :p)`, {
      replacements: { p: `${tag}%` },
    });
    await models.AuditLog.destroy({ where: { userId: created.filter((c) => c.model === 'User').map((c) => c.id) } });
    for (const { model, id } of created.reverse()) {
      await models[model].destroy({ where: { id }, force: true }).catch(() => undefined);
    }
  };

  return { tag, make, track, org, employee, user, role, cleanup };
};

/** A supertest agent signed in through the v2 cookie flow. */
export const signIn = async (username: string, password = PASSWORD) => {
  const agent = request.agent(app);
  const res = await agent.post('/api/v2/auth/login').set('Origin', ORIGIN).send({ username, password });
  if (res.status !== 200) throw new Error(`Sign-in failed for ${username}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
};

/** Sends a state-changing request the way the browser would (same Origin). */
export const write = (agent: ReturnType<typeof request.agent>, method: 'post' | 'put' | 'patch' | 'delete', url: string) =>
  agent[method](url).set('Origin', ORIGIN);
