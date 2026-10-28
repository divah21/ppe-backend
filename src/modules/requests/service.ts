import { Op, Sequelize, literal, type Transaction, type WhereOptions } from 'sequelize';
import { ROLES, type AuthContext } from '../../core/auth';
import { inTransaction, models, sequelize, type Row } from '../../core/db';
import { AppError, forbidden, notFound } from '../../core/errors';
import { pageWindow } from '../../core/http';
import { dueDates, matrixFor } from './eligibility';
import { employeeScope, inDepartment, inSection, requestScope } from './policy';
import type { CreateRequestInput, RequestCountsQuery, RequestListQuery } from './schemas';
import {
  APPROVE,
  OPEN,
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
// Requested quantities at the average stock price, as the budget pages price unpriced issues
const ESTIMATED_COST_SQL = `(
  SELECT COALESCE(SUM(ri.quantity * p.avg_price), 0) FROM request_items ri
  LEFT JOIN (SELECT ppe_item_id, AVG(unit_price_u_s_d) AS avg_price FROM stocks WHERE unit_price_u_s_d IS NOT NULL GROUP BY ppe_item_id) p
    ON p.ppe_item_id = ri.ppe_item_id
  WHERE ri.request_id = "Request"."id")`;
const ESTIMATED_COST = Sequelize.literal(ESTIMATED_COST_SQL);
const SUMMARY_ATTRIBUTES = {
  include: [
    [ITEM_COUNT, 'itemCount'],
    [ITEM_QUANTITY, 'totalQuantity'],
    [ESTIMATED_COST, 'estimatedCost'],
    [Sequelize.literal('"Request"."visitor_name"'), 'visitorName'],
    [Sequelize.literal('"Request"."visitor_company"'), 'visitorCompany'],
  ] as Array<[ReturnType<typeof Sequelize.literal>, string]>,
};

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
    visitor: r.get('visitorName') ? { name: r.get('visitorName') as string, company: (r.get('visitorCompany') as string | null) ?? null } : null,
    ...placement(r),
    itemCount: Number(r.get('itemCount') ?? 0),
    totalQuantity: Number(r.get('totalQuantity') ?? 0),
    estimatedCost: Math.round(Number(r.get('estimatedCost') ?? 0) * 100) / 100,
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
  if (q.employeeId) where.push({ employeeId: q.employeeId });
  if (q.q) {
    const term = q.q.replace(/^req-?/i, '');
    const like = { [Op.iLike]: containsTerm(q.q) };
    where.push({
      [Op.or]: [
        Sequelize.where(Sequelize.cast(Sequelize.col('Request.id'), 'text'), { [Op.iLike]: prefixTerm(term) }),
        { '$targetEmployee.worksNumber$': like },
        { '$targetEmployee.firstName$': like },
        { '$targetEmployee.lastName$': like },
        Sequelize.where(Sequelize.col('Request.visitor_name'), like),
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
    attributes: SUMMARY_ATTRIBUTES,
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

/** Every view's count in one pass over the filtered requests (one conditional aggregate per view). */
export const countRequests = async (auth: AuthContext, q: RequestCountsQuery) => {
  const countFor = (view: View) => {
    const statuses = viewStatuses(view, auth.role);
    if (!statuses) return 'COUNT(*)';
    if (statuses.length === 0) return '0';
    return `COUNT(*) FILTER (WHERE "Request"."status" IN (${statuses.map((st) => sequelize.escape(st)).join(', ')}))`;
  };
  const row = (await models.Request.findOne({
    where: { [Op.and]: baseWhere(auth, q) },
    attributes: VIEWS.map((view) => [literal(countFor(view)), view]),
    include: [{ ...employeeInclude(), attributes: [], include: [] }],
    raw: true,
  })) as Record<View, string | number> | null;
  return Object.fromEntries(VIEWS.map((v) => [v, Number(row?.[v] ?? 0)])) as Record<View, number>;
};

const STALE_DAYS = 7;

/** Figures for the cards above the list, under the same filters as the list. */
export const requestSummary = async (auth: AuthContext, q: RequestCountsQuery) => {
  const open = OPEN.map((st) => sequelize.escape(st)).join(', ');
  const mine = viewStatuses('mine', auth.role) ?? [];
  const isOpen = `"Request"."status" IN (${open})`;
  const row = (await models.Request.findOne({
    where: { [Op.and]: baseWhere(auth, q) },
    attributes: [
      [literal(`COUNT(*) FILTER (WHERE ${isOpen} AND "Request"."created_at" < NOW() - make_interval(days => ${STALE_DAYS}))`), 'stale'],
      [literal(`COALESCE(SUM(${ESTIMATED_COST_SQL}) FILTER (WHERE ${isOpen}), 0)`), 'openValue'],
      [literal(`COUNT(*) FILTER (WHERE "Request"."status" = 'fulfilled' AND "Request"."fulfilled_date" >= date_trunc('month', NOW()))`), 'issuedThisMonth'],
      [literal(mine.length ? `COUNT(*) FILTER (WHERE "Request"."status" IN (${mine.map((st) => sequelize.escape(st)).join(', ')}))` : '0'), 'mine'],
    ],
    include: [{ ...employeeInclude(), attributes: [], include: [] }],
    raw: true,
  })) as Record<string, string | number> | null;
  return {
    mine: Number(row?.mine ?? 0),
    staleDays: STALE_DAYS,
    stale: Number(row?.stale ?? 0),
    openValue: Math.round(Number(row?.openValue ?? 0) * 100) / 100,
    issuedThisMonth: Number(row?.issuedThisMonth ?? 0),
  };
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
    attributes: SUMMARY_ATTRIBUTES,
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
    include: [{ model: models.PPEItem, as: 'ppeItem', attributes: ['id', 'name', 'itemCode'] }],
    order: [['issueDate', 'ASC']],
  });
  const requestedItem = new Map((r.items as Row[]).map((i) => [i.id as string, i.ppeItemId as string]));

  const actors = await loadActors([
    r.requestedById,
    r.sectionRepApproverId,
    r.sheqApproverId,
    r.deptRepApproverId,
    r.hodApproverId,
    r.storesApproverId,
    r.fulfilledByUserId,
    r.rejectedById,
    ...allocations.map((a) => a.issuedById as string | null),
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
      itemCode: (a.ppeItem?.itemCode as string | null | undefined) ?? null,
      quantity: Number(a.quantity),
      size: (a.size as string | null) ?? null,
      issueDate: a.issueDate as Date,
      nextRenewalDate: (a.nextRenewalDate as Date | null) ?? null,
      totalCost: a.totalCost === null ? null : Number(a.totalCost),
      issuedBy: actors.get(a.issuedById) ?? null,
      substituted: !!a.requestItemId && requestedItem.get(a.requestItemId) !== a.ppeItemId,
    })),
    issuedCost: Math.round(allocations.reduce((s, a) => s + Number(a.totalCost ?? 0), 0) * 100) / 100,
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

const checkItems = async (items: CreateRequestInput['items']) => {
  const keys = items.map((i) => `${i.ppeItemId}|${(i.size ?? '').toLowerCase()}`);
  if (new Set(keys).size !== keys.length) throw invalid('items', 'Each item and size can only be listed once');

  const ids = [...new Set(items.map((i) => i.ppeItemId))];
  const ppeItems = await models.PPEItem.findAll({ where: { id: ids } });
  const byId = new Map(ppeItems.map((p) => [p.id as string, p]));
  for (const item of items) {
    const p = byId.get(item.ppeItemId);
    if (!p || p.isActive === false) throw invalid('items', 'One or more PPE items are no longer available');
    if (p.hasSizeVariants && !item.size) throw invalid('items', `Choose a size for ${p.name}`);
  }
  return { ids, byId };
};

const insertRequest = (
  auth: AuthContext,
  input: CreateRequestInput,
  placed: { employeeId: string | null; sectionId: string | null; departmentId: string | null }
) =>
  inTransaction(async (t) => {
    const request = await models.Request.create(
      {
        ...placed,
        requestedById: auth.userId,
        comment: input.comment,
        requestType: placed.employeeId ? input.requestType : 'emergency',
        status: 'pending',
        isEmergencyVisitor: !placed.employeeId,
      },
      { transaction: t }
    );
    if (input.visitor) {
      await sequelize.query('UPDATE requests SET visitor_name = :name, visitor_company = :company WHERE id = :id', {
        replacements: { name: input.visitor.name, company: input.visitor.company, id: request.id },
        transaction: t,
      });
    }
    await models.RequestItem.bulkCreate(
      input.items.map((i) => ({ requestId: request.id, ppeItemId: i.ppeItemId, quantity: i.quantity, size: i.size, reason: i.reason })),
      { transaction: t }
    );
    return request.id as string;
  });

/** v1 emergency visitor request: no employee, no matrix check, owned by the raising section. */
const createVisitorRequest = async (auth: AuthContext, input: CreateRequestInput) => {
  const sectionId = auth.role === ROLES.SECTION_REP ? auth.sectionId : (input.visitor?.sectionId ?? auth.sectionId);
  if (!sectionId) throw invalid('visitor.sectionId', 'Choose the section the visitor is with');
  const section = await models.Section.findByPk(sectionId, { attributes: ['id', 'departmentId'] });
  if (!section) throw invalid('visitor.sectionId', 'Choose the section the visitor is with');
  await checkItems(input.items);
  return insertRequest(auth, input, { employeeId: null, sectionId: section.id, departmentId: section.departmentId ?? null });
};

export const createRequest = async (auth: AuthContext, input: CreateRequestInput) => {
  if (!input.employeeId) return createVisitorRequest(auth, input);
  const employee = await models.Employee.findOne({
    where: { [Op.and]: [employeeScope(auth), { id: input.employeeId }] },
    include: [{ model: models.Section, as: 'section', attributes: ['id', 'departmentId'] }],
  });
  if (!employee) throw notFound('Employee');
  if (employee.isActive === false) throw invalid('employeeId', 'This employee is no longer active');

  const { ids, byId } = await checkItems(input.items);

  // v1 eligibility: annual and replacement items must be in the job-title or section matrix,
  // and an annual issue only once the last issue is due for renewal
  if (input.requestType === 'annual' || input.requestType === 'replacement') {
    const matrix = await matrixFor(employee.id);
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

  return insertRequest(auth, input, {
    employeeId: employee.id,
    sectionId: employee.sectionId,
    departmentId: employee.section?.departmentId ?? null,
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
