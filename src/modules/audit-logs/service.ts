import { Op, type WhereOptions } from 'sequelize';
import { models, sequelize, type Row } from '../../core/db';
import { notFound } from '../../core/errors';
import { likeTerm, pageWindow } from '../../core/http';
import { redact } from './redact';
import type { AuditListQuery } from './schemas';

const USER_INCLUDE = {
  model: models.User,
  as: 'user',
  attributes: ['id', 'username'],
  include: [
    { model: models.Role, as: 'role', attributes: ['name'] },
    { model: models.Employee, as: 'employee', attributes: ['firstName', 'lastName'] },
  ],
};

const toUser = (user: Row | null | undefined) =>
  user
    ? {
        id: user.id as string,
        username: user.username as string,
        name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : (user.username as string),
        role: (user.role?.name as string | undefined) ?? null,
      }
    : null;

export const toAuditLog = (row: Row) => ({
  id: row.id as string,
  action: row.action as string,
  entityType: (row.entityType as string | null) ?? null,
  entityId: (row.entityId as string | null) ?? null,
  user: toUser(row.user),
  ipAddress: (row.ipAddress as string | null) ?? null,
  createdAt: row.createdAt as Date,
});

const toAuditLogDetail = (row: Row) => ({
  ...toAuditLog(row),
  userAgent: (row.userAgent as string | null) ?? null,
  changes: redact(row.changes ?? null),
  meta: redact(row.meta ?? null),
});

const endOfDay = (d: string) => new Date(new Date(`${d}T00:00:00`).getTime() + 86_400_000);

export const listAuditLogs = async (q: AuditListQuery) => {
  const where: WhereOptions[] = [];
  if (q.userId) where.push({ userId: q.userId });
  if (q.action) where.push({ action: q.action });
  if (q.entityType) where.push({ entityType: q.entityType });
  if (q.from) where.push({ createdAt: { [Op.gte]: new Date(`${q.from}T00:00:00`) } });
  if (q.to) where.push({ createdAt: { [Op.lt]: endOfDay(q.to) } });
  if (q.q) {
    const term = likeTerm(q.q);
    where.push({ [Op.or]: [{ action: { [Op.iLike]: term } }, { entityType: { [Op.iLike]: term } }] });
  }

  const sort = q.sort ?? 'createdAt';
  const { rows, count } = await models.AuditLog.findAndCountAll({
    where: { [Op.and]: where },
    include: [USER_INCLUDE],
    order: [
      [sort, q.sort ? q.order.toUpperCase() : 'DESC'],
      ['id', 'DESC'],
    ],
    distinct: true,
    ...pageWindow(q),
  });
  return { rows: rows.map(toAuditLog), count };
};

export const getAuditLog = async (id: string) => {
  const row = await models.AuditLog.findByPk(id, { include: [USER_INCLUDE] });
  if (!row) throw notFound('Audit entry');
  return toAuditLogDetail(row);
};

const FACET_LIMIT = 200;

/** Values for the filter pickers: the actions, entity types and people that appear in the log. */
export const auditFacets = async () => {
  const distinct = async (column: 'action' | 'entityType') => {
    const rows = await models.AuditLog.findAll({
      attributes: [column],
      where: { [column]: { [Op.ne]: null } },
      group: [column],
      order: [[column, 'ASC']],
      limit: FACET_LIMIT,
      raw: true,
    });
    return rows.map((r) => (r as unknown as Record<string, string>)[column]!);
  };
  const [actions, entityTypes, users] = await Promise.all([
    distinct('action'),
    distinct('entityType'),
    models.User.findAll({
      attributes: ['id', 'username'],
      where: { id: { [Op.in]: sequelize.literal('(SELECT DISTINCT user_id FROM audit_logs WHERE user_id IS NOT NULL)') } },
      include: [{ model: models.Employee, as: 'employee', attributes: ['firstName', 'lastName'] }],
      order: [['username', 'ASC']],
      limit: FACET_LIMIT,
    }),
  ]);
  return { actions, entityTypes, users: users.map((u) => ({ id: u.id as string, name: toUser(u)!.name })) };
};
