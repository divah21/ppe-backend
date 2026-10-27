import { Op, Sequelize, type Transaction, type WhereOptions } from 'sequelize';
import { ROLES, type AuthContext } from '../../core/auth';
import { inTransaction, models, type Row } from '../../core/db';
import { AppError, forbidden, notFound } from '../../core/errors';
import { pageWindow } from '../../core/http';
import { dueDates, matrixFor } from './eligibility';
import { employeeScope, inDepartment, inSection, requestScope } from './policy';
import type { CreateRequestInput, RequestCountsQuery, RequestListQuery } from './schemas';
import {
  APPROVE,
  REJECT,
  STAGES,
  TERMINAL,
  VIEWS,
  allowedActions,
  viewStatuses,
  type RequestStatus,
  type RequestType,
  type StageKey,
  type View,
} from './workflow';

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Awaiting section rep',
  'sheq-review': 'Awaiting SHEQ',
  'dept-rep-review': 'Awaiting department rep',
  'hod-review': 'Awaiting HOD',
  'stores-review': 'Awaiting stores',
  approved: 'Ready to issue',
  'partially-fulfilled': 'Partly issued',
  fulfilled: 'Issued',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const requestNumber = (id: string) => `REQ-${id.slice(0, 8).toUpperCase()}`;

const DAY_MS = 86_400_000;

const latest = (...dates: Array<Date | null | undefined>) =>
  dates.filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

/** When the request entered its current stage; null once it is closed. */
const stageSince = (r: Row): Date | null => {
  const status = r.status as RequestStatus;
  if (TERMINAL.includes(status)) return null;
  switch (status) {
    case 'pending':
      return r.createdAt;
    case 'sheq-review':
    case 'dept-rep-review':
      return latest(r.sectionRepApprovalDate) ?? r.createdAt;
    case 'hod-review':
      return latest(r.sectionRepApprovalDate, r.sheqApprovalDate, r.deptRepApprovalDate) ?? r.createdAt;
    case 'stores-review':
      return latest(r.hodApprovalDate) ?? r.createdAt;
    case 'approved':
      return latest(r.storesApprovalDate) ?? r.createdAt;
    default:
      return latest(r.fulfilledDate, r.storesApprovalDate) ?? r.createdAt;
  }
};

const personName = (e: Row | null | undefined) => (e ? `${e.firstName} ${e.lastName}`.trim() : null);
const ref = (row: Row | null | undefined) => (row ? { id: row.id as string, name: row.name as string } : null);

const employeeInclude = (extra: object[] = []) => ({
  model: models.Employee,
  as: 'targetEmployee',
  required: false,
  attributes: ['id', 'worksNumber', 'firstName', 'lastName', 'sectionId', 'jobTitle', 'isActive'],
  include: [
    {
      model: models.Section,
      as: 'section',
      attributes: ['id', 'name', 'departmentId'],
      include: [{ model: models.Department, as: 'department', attributes: ['id', 'name'] }],
    },
    ...extra,
  ],
});

const ITEM_COUNT = Sequelize.literal('(SELECT COUNT(*) FROM request_items ri WHERE ri.request_id = "Request"."id")');
const ITEM_QUANTITY = Sequelize.literal(
  '(SELECT COALESCE(SUM(ri.quantity), 0) FROM request_items ri WHERE ri.request_id = "Request"."id")'
);

const placement = (r: Row) => {
  const employeeSection = r.targetEmployee?.section;
  const section = employeeSection ?? r.section ?? null;
  const department = employeeSection?.department ?? r.department ?? null;
  return { section: ref(section), department: ref(department) };
};

const toEmployeeSummary = (e: Row | null | undefined) =>
  e ? { id: e.id as string, name: personName(e)!, worksNumber: e.worksNumber as string } : null;

export const toRequestSummary = (r: Row, auth: AuthContext) => {
  const since = stageSince(r);
  return {
    id: r.id as string,
    number: requestNumber(r.id),
    status: r.status as RequestStatus,
    statusLabel: STATUS_LABEL[r.status as RequestStatus],
    requestType: r.requestType as RequestType,
    isEmergencyVisitor: !!r.isEmergencyVisitor,
    employee: toEmployeeSummary(r.targetEmployee),
    ...placement(r),
    itemCount: Number(r.get('itemCount') ?? 0),
    totalQuantity: Number(r.get('totalQuantity') ?? 0),
    createdAt: r.createdAt as Date,
    updatedAt: r.updatedAt as Date,
    stageSince: since,
    waitingDays: since ? Math.max(0, Math.floor((Date.now() - since.getTime()) / DAY_MS)) : null,
    allowedActions: allowedActions(auth, { status: r.status, requestedById: r.requestedById }),
  };
};
export type RequestSummary = ReturnType<typeof toRequestSummary>;

const prefixTerm = (q: string) => `${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
const containsTerm = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Scope plus every filter except the view, so counts and the list agree. */
const baseWhere = (auth: AuthContext, q: RequestCountsQuery): WhereOptions[] => {
  const where: WhereOptions[] = [requestScope(auth)];
  if (q.status) where.push({ status: q.status });
  if (q.type) where.push({ requestType: q.type });
  if (q.departmentId) where.push(inDepartment(q.departmentId));
  if (q.sectionId) where.push(inSection(q.sectionId));
  if (q.q) {
    const term = q.q.replace(/^req-?/i, '');
    const like = { [Op.iLike]: containsTerm(q.q) };
    where.push({
      [Op.or]: [
        Sequelize.where(Sequelize.cast(Sequelize.col('Request.id'), 'text'), { [Op.iLike]: prefixTerm(term) }),
        { '$targetEmployee.worksNumber$': like },
        { '$targetEmployee.firstName$': like },
        { '$targetEmployee.lastName$': like },
        Sequelize.where(
          Sequelize.fn('concat', Sequelize.col('targetEmployee.firstName'), ' ', Sequelize.col('targetEmployee.lastName')),
          like
        ),
      ],
    });
  }
  return where;
};

const withView = (auth: AuthContext, where: WhereOptions[], view: View): WhereOptions => {
  const statuses = viewStatuses(view, auth.role);
  return { [Op.and]: statuses ? [...where, { status: { [Op.in]: statuses } }] : where };
};

export const listRequests = async (auth: AuthContext, q: RequestListQuery) => {
  const { rows, count } = await models.Request.findAndCountAll({
    where: withView(auth, baseWhere(auth, q), q.view),
    attributes: { include: [[ITEM_COUNT, 'itemCount'], [ITEM_QUANTITY, 'totalQuantity']] },
    include: [
      employeeInclude(),
      { model: models.Section, as: 'section', attributes: ['id', 'name'] },
      { model: models.Department, as: 'department', attributes: ['id', 'name'] },
    ],
    order: [
      [q.sort ?? 'createdAt', q.sort ? q.order.toUpperCase() : 'DESC'],
      ['id', 'ASC'],
    ],
    ...pageWindow(q),
  });
  return { rows: rows.map((r) => toRequestSummary(r, auth)), count };
};

export const countRequests = async (auth: AuthContext, q: RequestCountsQuery) => {
  const where = baseWhere(auth, q);
  const include = [{ ...employeeInclude(), attributes: [], include: [] }];
  const counts = await Promise.all(
    VIEWS.map((view) => models.Request.count({ where: withView(auth, where, view), include }))
  );
  return Object.fromEntries(VIEWS.map((v, i) => [v, counts[i]!])) as Record<View, number>;
};

const loadActors = async (ids: Array<string | null | undefined>) => {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map<string, { id: string; name: string }>();
  const users = await models.User.findAll({
    where: { id: unique },
    attributes: ['id', 'username'],
    include: [{ model: models.Employee, as: 'employee', attributes: ['firstName', 'lastName'] }],
  });
  return new Map(users.map((u) => [u.id as string, { id: u.id as string, name: personName(u.employee) ?? (u.username as string) }]));
};

type TimelineState = 'done' | 'current' | 'upcoming' | 'skipped' | 'rejected' | 'cancelled';

const STAGE_STATUS: Record<StageKey, RequestStatus> = {
  sectionRep: 'pending',
  sheq: 'sheq-review',
  deptRep: 'dept-rep-review',
  hod: 'hod-review',
  stores: 'stores-review',
};

const buildTimeline = (r: Row, actors: Map<string, { id: string; name: string }>) => {
  const status = r.status as RequestStatus;
  const closed = status === 'rejected' || status === 'cancelled';
  const actor = (id: string | null | undefined) => (id ? (actors.get(id) ?? null) : null);

  const steps: Array<{ key: string; label: string; state: TimelineState; actor: { id: string; name: string } | null; at: Date | null; comment: string | null }> = [
    { key: 'submitted', label: 'Submitted', state: 'done', actor: actor(r.requestedById), at: r.createdAt, comment: r.comment ?? null },
  ];

  for (const key of Object.keys(STAGES) as StageKey[]) {
    const stage = STAGES[key];
    const at: Date | null = r[stage.date] ?? null;
    // SHEQ and department rep reviews only appear for requests that went through them
    if ((key === 'sheq' || key === 'deptRep') && !at && status !== STAGE_STATUS[key]) continue;
    steps.push({
      key,
      label: stage.label,
      state: at ? 'done' : status === STAGE_STATUS[key] ? 'current' : closed ? 'skipped' : 'upcoming',
      actor: actor(r[stage.approver]),
      at,
      comment: r[stage.comment] ?? null,
    });
  }

  steps.push({
    key: 'issue',
    label: status === 'partially-fulfilled' ? 'Partly issued' : 'Issued by stores',
    state:
      status === 'fulfilled'
        ? 'done'
        : status === 'approved' || status === 'partially-fulfilled'
          ? 'current'
          : closed
            ? 'skipped'
            : 'upcoming',
    actor: actor(r.fulfilledByUserId),
    at: r.fulfilledDate ?? null,
    comment: null,
  });

  if (closed) {
    steps.push({
      key: status,
      label: status === 'rejected' ? 'Rejected' : 'Cancelled',
      state: status,
      actor: actor(r.rejectedById),
      at: r.rejectedAt ?? null,
      comment: r.rejectionReason ?? null,
    });
  }
  return steps;
};

export const getRequest = async (auth: AuthContext, id: string) => {
  const r = await models.Request.findOne({
    where: { [Op.and]: [requestScope(auth), { id }] },
    attributes: { include: [[ITEM_COUNT, 'itemCount'], [ITEM_QUANTITY, 'totalQuantity']] },
    include: [
      employeeInclude([{ model: models.JobTitle, as: 'jobTitleRef', attributes: ['id', 'name'], required: false }]),
      { model: models.Section, as: 'section', attributes: ['id', 'name'] },
      { model: models.Department, as: 'department', attributes: ['id', 'name'] },
      {
        model: models.RequestItem,
        as: 'items',
        include: [
          { model: models.PPEItem, as: 'ppeItem', attributes: ['id', 'name', 'itemCode', 'unit', 'hasSizeVariants', 'category'] },
        ],
      },
    ],
    order: [[{ model: models.RequestItem, as: 'items' }, 'createdAt', 'ASC']],
  });
  if (!r) throw notFound('Request');

  const allocations = await models.Allocation.findAll({
    where: { requestId: id },
    include: [{ model: models.PPEItem, as: 'ppeItem', attributes: ['id', 'name'] }],
    order: [['issueDate', 'ASC']],
  });

  const actors = await loadActors([
    r.requestedById,
    r.sectionRepApproverId,
    r.sheqApproverId,
    r.deptRepApproverId,
    r.hodApproverId,
    r.storesApproverId,
    r.fulfilledByUserId,
    r.rejectedById,
  ]);

  const e = r.targetEmployee;
  return {
    ...toRequestSummary(r, auth),
    comment: (r.comment as string | null) ?? null,
    requestedBy: actors.get(r.requestedById) ?? null,
    employee: e
      ? {
          ...toEmployeeSummary(e)!,
          jobTitle: (e.jobTitleRef?.name as string | undefined) ?? (e.jobTitle as string | null) ?? null,
          section: ref(e.section),
          department: ref(e.section?.department),
          isActive: e.isActive !== false,
        }
      : null,
    items: (r.items as Row[]).map((i) => {
      const issued = Number(i.approvedQuantity ?? 0);
      return {
        id: i.id as string,
        ppeItem: i.ppeItem
          ? {
              id: i.ppeItem.id as string,
              name: i.ppeItem.name as string,
              itemCode: (i.ppeItem.itemCode as string | null) ?? null,
              unit: (i.ppeItem.unit as string | null) ?? null,
              category: (i.ppeItem.category as string | null) ?? null,
              hasSizeVariants: !!i.ppeItem.hasSizeVariants,
            }
          : null,
        size: (i.size as string | null) ?? null,
        quantity: Number(i.quantity),
        issuedQuantity: issued,
        outstanding: Math.max(0, Number(i.quantity) - issued),
        reason: (i.reason as string | null) ?? null,
      };
    }),
    allocations: allocations.map((a) => ({
      id: a.id as string,
      requestItemId: (a.requestItemId as string | null) ?? null,
      ppeItemName: (a.ppeItem?.name as string | undefined) ?? null,
      quantity: Number(a.quantity),
      size: (a.size as string | null) ?? null,
      issueDate: a.issueDate as Date,
      nextRenewalDate: (a.nextRenewalDate as Date | null) ?? null,
      totalCost: a.totalCost === null ? null : Number(a.totalCost),
    })),
    timeline: buildTimeline(r, actors),
    rejection:
      r.status === 'rejected' || r.status === 'cancelled'
        ? { reason: (r.rejectionReason as string | null) ?? null, by: actors.get(r.rejectedById) ?? null, at: (r.rejectedAt as Date | null) ?? null }
        : null,
  };
};
export type RequestDetail = Awaited<ReturnType<typeof getRequest>>;

const invalid = (field: string, message: string) =>
  new AppError('VALIDATION_FAILED', message, { fieldErrors: { [field]: [message] } });

export const createRequest = async (auth: AuthContext, input: CreateRequestInput) => {
  const employee = await models.Employee.findOne({
    where: { [Op.and]: [employeeScope(auth), { id: input.employeeId }] },
    include: [
      { model: models.Section, as: 'section', attributes: ['id', 'departmentId'] },
      { model: models.JobTitle, as: 'jobTitleRef', required: false },
    ],
  });
  if (!employee) throw notFound('Employee');
  if (employee.isActive === false) throw invalid('employeeId', 'This employee is no longer active');

  const keys = input.items.map((i) => `${i.ppeItemId}|${(i.size ?? '').toLowerCase()}`);
  if (new Set(keys).size !== keys.length) throw invalid('items', 'Each item and size can only be listed once');

  const ids = [...new Set(input.items.map((i) => i.ppeItemId))];
  const ppeItems = await models.PPEItem.findAll({ where: { id: ids } });
  const byId = new Map(ppeItems.map((p) => [p.id as string, p]));
  for (const item of input.items) {
    const p = byId.get(item.ppeItemId);
    if (!p || p.isActive === false) throw invalid('items', 'One or more PPE items are no longer available');
    if (p.hasSizeVariants && !item.size) throw invalid('items', `Choose a size for ${p.name}`);
  }

  // v1 eligibility: annual and replacement items must be in the job-title or section matrix,
  // and an annual issue only once the last issue is due for renewal
  if (input.requestType === 'annual' || input.requestType === 'replacement') {
    const matrix = await matrixFor(employee);
    const outside = input.items.find((i) => !matrix.has(i.ppeItemId));
    if (outside) {
      throw invalid('items', `${byId.get(outside.ppeItemId)!.name} is not in this employee's PPE matrix`);
    }
    if (input.requestType === 'annual') {
      const due = await dueDates(employee.id, ids);
      for (const item of input.items) {
        const next = due.get(item.ppeItemId);
        if (next && next.getTime() > Date.now()) {
          throw invalid('items', `${byId.get(item.ppeItemId)!.name} is not due until ${next.toISOString().slice(0, 10)}`);
        }
      }
    }
  }

  return inTransaction(async (t) => {
    const request = await models.Request.create(
      {
        employeeId: employee.id,
        requestedById: auth.userId,
        sectionId: employee.sectionId,
        departmentId: employee.section?.departmentId ?? null,
        comment: input.comment,
        requestType: input.requestType,
        status: 'pending',
        isEmergencyVisitor: false,
      },
      { transaction: t }
    );
    await models.RequestItem.bulkCreate(
      input.items.map((i) => ({ requestId: request.id, ppeItemId: i.ppeItemId, quantity: i.quantity, size: i.size, reason: i.reason })),
      { transaction: t }
    );
    return request.id as string;
  });
};

/** Loads the request inside the caller's scope and locks it for the rest of the transaction. */
export const lockRequest = async (auth: AuthContext, id: string, t: Transaction) => {
  const row = await models.Request.findOne({
    where: { [Op.and]: [requestScope(auth), { id }] },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!row) throw notFound('Request');
  return row;
};

const isAllowed = (auth: AuthContext, roles: readonly string[] | undefined) =>
  !!roles && (auth.role === ROLES.ADMIN || roles.includes(auth.role));

const notNow = (status: RequestStatus, verb: string) =>
  new AppError('INVALID_TRANSITION', `This request is ${STATUS_LABEL[status].toLowerCase()} and can no longer be ${verb}`);

export interface Transition {
  from: RequestStatus;
  to: RequestStatus;
}

export const approveRequest = (auth: AuthContext, id: string, comment: string | null) =>
  inTransaction<Transition>(async (t) => {
    const row = await lockRequest(auth, id, t);
    const from = row.status as RequestStatus;
    const step = APPROVE[from];
    if (!step) throw notNow(from, 'approved');
    if (!isAllowed(auth, step.roles)) throw forbidden('You cannot approve a request at this stage');
    const stage = STAGES[step.stage];
    await row.update(
      { status: step.next, [stage.date]: new Date(), [stage.approver]: auth.userId, [stage.comment]: comment },
      { transaction: t }
    );
    return { from, to: step.next };
  });

export const rejectRequest = (auth: AuthContext, id: string, reason: string) =>
  inTransaction<Transition>(async (t) => {
    const row = await lockRequest(auth, id, t);
    const from = row.status as RequestStatus;
    const roles = REJECT[from];
    if (!roles) throw notNow(from, 'rejected');
    if (!isAllowed(auth, roles)) throw forbidden('You cannot reject a request at this stage');
    await row.update(
      { status: 'rejected', rejectionReason: reason, rejectedById: auth.userId, rejectedAt: new Date() },
      { transaction: t }
    );
    return { from, to: 'rejected' };
  });

export const cancelRequest = (auth: AuthContext, id: string, reason: string | null) =>
  inTransaction<Transition>(async (t) => {
    const row = await lockRequest(auth, id, t);
    const from = row.status as RequestStatus;
    if (from !== 'pending') throw notNow(from, 'cancelled');
    if (auth.role !== ROLES.ADMIN && row.requestedById !== auth.userId) {
      throw forbidden('You can only cancel requests you raised');
    }
    await row.update(
      { status: 'cancelled', rejectionReason: reason ?? 'Cancelled by requester', rejectedById: auth.userId, rejectedAt: new Date() },
      { transaction: t }
    );
    return { from, to: 'cancelled' };
  });
