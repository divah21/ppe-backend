import { randomUUID } from 'node:crypto';
import { Op, QueryTypes, type Transaction } from 'sequelize';
import { ROLES, type AuthContext } from '../../core/auth';
import { models, sequelize, type Row } from '../../core/db';
import { computeEligibility, type Eligibility } from '../matrix/service';
import { requestNumber } from '../requests/service';
import { IN_APPROVAL, OPEN, STAGES, type RequestStatus } from '../requests/workflow';

/*
 * What follows an employee when their section, department or job title changes.
 *
 * - Open requests move to the new section. Ones already past the section rep go back to it, since the
 *   new section's reps, HOD and budget now own them and the items may not suit the new role.
 * - Spend already issued stays where it was incurred (allocations record their issue section).
 * - Accounts that managed the old section or department move only when an admin asks; accounts
 *   without their own scope follow the employee automatically.
 * - Every change is kept in employee_transfers.
 */

/** Open requests already past the section rep; partly issued ones keep their stage. */
export const RESTARTED: RequestStatus[] = [...IN_APPROVAL.filter((s) => s !== 'pending'), 'approved'];

export interface Placement {
  sectionId: string;
  jobTitleId: string | null;
  costCenterId: string | null;
}

const CLEARED_STAGES = Object.fromEntries(
  Object.values(STAGES).flatMap((s) => [
    [s.date, null],
    [s.approver, null],
    [s.comment, null],
  ])
);

/** Section id -> department id, for sections the caller has already loaded. */
export type KnownDepartments = Map<string, string | null>;

const departmentOf = async (sectionId: string, known?: KnownDepartments, t?: Transaction) =>
  known?.has(sectionId)
    ? (known.get(sectionId) ?? null)
    : (((await models.Section.findByPk(sectionId, { attributes: ['departmentId'], transaction: t }))?.departmentId as string | null) ?? null);

/** What kind of move it is; the preview and the save share it so they always agree. */
const describe = async (from: Placement, to: Placement, known?: KnownDepartments, t?: Transaction) => {
  const sectionChanged = from.sectionId !== to.sectionId;
  const toDept = await departmentOf(to.sectionId, known, t);
  const fromDept = sectionChanged ? await departmentOf(from.sectionId, known, t) : toDept;
  return { sectionChanged, departmentChanged: fromDept !== toDept, jobTitleChanged: from.jobTitleId !== to.jobTitleId, fromDept, toDept };
};

export const placementOf = (row: Row): Placement => ({
  sectionId: row.sectionId as string,
  jobTitleId: (row.jobTitleId as string | null) ?? null,
  costCenterId: (row.costCenterId as string | null) ?? null,
});

// The cost centre is recorded with a move but does not make one on its own
const changed = (from: Placement, to: Placement) => from.sectionId !== to.sectionId || from.jobTitleId !== to.jobTitleId;

export interface TransferSummary {
  sectionChanged: boolean;
  departmentChanged: boolean;
  jobTitleChanged: boolean;
  requestsMoved: number;
  requestsRestarted: number;
  accountsMoved: number;
}

/**
 * Applies the consequences of a placement change inside the caller's transaction, after the employee
 * row is saved. Returns null when nothing that matters changed.
 */
export const recordTransfer = async (
  t: Transaction,
  employeeId: string,
  from: Placement,
  to: Placement,
  opts: { actorId?: string | null; moveAccounts?: boolean; departments?: KnownDepartments } = {}
): Promise<TransferSummary | null> => {
  if (!changed(from, to)) return null;
  const { sectionChanged, departmentChanged, jobTitleChanged, fromDept, toDept } = await describe(from, to, opts.departments, t);

  let requestsMoved = 0;
  let requestsRestarted = 0;
  let accountsMoved = 0;
  if (sectionChanged) {
    [requestsRestarted] = await models.Request.update(
      { status: 'pending', ...CLEARED_STAGES },
      { where: { employeeId, status: RESTARTED }, transaction: t }
    );
    [requestsMoved] = await models.Request.update(
      { sectionId: to.sectionId, departmentId: toDept },
      { where: { employeeId, status: OPEN }, transaction: t }
    );
  }
  if (opts.moveAccounts) {
    // The same accounts the preview listed
    const active = { employeeId, isActive: { [Op.ne]: false } };
    if (sectionChanged) {
      const [n] = await models.User.update({ sectionId: to.sectionId }, { where: { ...active, sectionId: from.sectionId }, transaction: t });
      accountsMoved += n;
    }
    if (departmentChanged && fromDept) {
      const [n] = await models.User.update({ departmentId: toDept }, { where: { ...active, departmentId: fromDept }, transaction: t });
      accountsMoved += n;
    }
  }

  await sequelize.query(
    `INSERT INTO employee_transfers (id, employee_id, from_section_id, to_section_id, from_department_id, to_department_id,
       from_job_title_id, to_job_title_id, from_cost_center_id, to_cost_center_id, requests_restarted, accounts_moved, changed_by_id)
     VALUES (:id, :employeeId, :fromSection, :toSection, :fromDept, :toDept, :fromJob, :toJob, :fromCc, :toCc, :restarted, :accounts, :actor)`,
    {
      transaction: t,
      replacements: {
        id: randomUUID(),
        employeeId,
        fromSection: from.sectionId,
        toSection: to.sectionId,
        fromDept,
        toDept,
        fromJob: from.jobTitleId,
        toJob: to.jobTitleId,
        fromCc: from.costCenterId,
        toCc: to.costCenterId,
        restarted: requestsRestarted,
        accounts: accountsMoved,
        actor: opts.actorId ?? null,
      },
    }
  );
  return { sectionChanged, departmentChanged, jobTitleChanged, requestsMoved, requestsRestarted, accountsMoved };
};

const itemName = (e: Eligibility['items'][number]) => ({ id: e.ppeItemId, name: e.ppeItem.name });

/** What saving the new placement would change, for the confirmation before a transfer. */
export const transferPreview = async (auth: AuthContext, employee: Row, to: Placement, known?: KnownDepartments) => {
  const from = placementOf(employee);
  const { sectionChanged, departmentChanged, jobTitleChanged, fromDept } = await describe(from, to, known);
  const [requests, accounts, before, after, [held]] = await Promise.all([
    sectionChanged
      ? models.Request.findAll({
          where: { employeeId: employee.id, status: OPEN },
          attributes: ['id', 'status'],
          order: [['createdAt', 'DESC']],
        })
      : [],
    models.User.findAll({
      where: { employeeId: employee.id, isActive: { [Op.ne]: false } },
      attributes: ['id', 'username', 'sectionId', 'departmentId'],
      include: [{ model: models.Role, as: 'role', attributes: ['name'] }],
    }),
    computeEligibility(employee.id),
    computeEligibility(employee.id, { placement: to }),
    sequelize.query<{ ids: string[] | null }>(
      `SELECT array_agg(DISTINCT ppe_item_id) AS ids FROM allocations WHERE employee_id = :id AND status IN ('active', 'expired')`,
      { type: QueryTypes.SELECT, replacements: { id: employee.id } }
    ),
  ]);
  const beforeIds = new Set(before?.items.map((i) => i.ppeItemId));
  const afterIds = new Set(after?.items.map((i) => i.ppeItemId));
  const holding = new Set(held?.ids ?? []);

  return {
    sectionChanged,
    departmentChanged,
    jobTitleChanged,
    requests: requests.map((r) => ({
      id: r.id as string,
      number: requestNumber(r.id),
      status: r.status as RequestStatus,
      restarts: RESTARTED.includes(r.status),
    })),
    accounts: accounts.map((u) => {
      const managesOld =
        (sectionChanged && u.sectionId === from.sectionId) || (departmentChanged && !!fromDept && u.departmentId === fromDept);
      return {
        id: u.id as string,
        username: u.username as string,
        role: (u.role?.name as string | undefined) ?? null,
        // No scope of its own: it follows the employee's section and department
        followsEmployee: !u.sectionId && !u.departmentId,
        managesOld,
      };
    }),
    canMoveAccounts: auth.role === ROLES.ADMIN,
    matrix: {
      configured: (after?.items.length ?? 0) > 0,
      added: (after?.items ?? []).filter((i) => !beforeIds.has(i.ppeItemId)).map(itemName),
      notRequired: (before?.items ?? []).filter((i) => !afterIds.has(i.ppeItemId) && holding.has(i.ppeItemId)).map(itemName),
      toIssue: (after?.items ?? []).filter((i) => !holding.has(i.ppeItemId)).map(itemName),
    },
  };
};

export type TransferPreview = Awaited<ReturnType<typeof transferPreview>>;

/** Recent moves for the employee profile, newest first. */
export const transferHistory = async (employeeId: string, limit = 10) => {
  const rows = await sequelize.query<{
    id: string;
    changed_at: Date;
    from_section: string | null;
    to_section: string | null;
    from_department: string | null;
    to_department: string | null;
    from_job_title: string | null;
    to_job_title: string | null;
    requests_restarted: number;
    changed_by: string | null;
  }>(
    `SELECT t.id, t.changed_at, fs.name AS from_section, ts.name AS to_section, fd.name AS from_department, td.name AS to_department,
            fj.name AS from_job_title, tj.name AS to_job_title, t.requests_restarted,
            COALESCE(NULLIF(TRIM(COALESCE(ue."firstName", '') || ' ' || COALESCE(ue."lastName", '')), ''), u.username) AS changed_by
       FROM employee_transfers t
       LEFT JOIN sections fs ON fs.id = t.from_section_id
       LEFT JOIN sections ts ON ts.id = t.to_section_id
       LEFT JOIN departments fd ON fd.id = t.from_department_id
       LEFT JOIN departments td ON td.id = t.to_department_id
       LEFT JOIN job_titles fj ON fj.id = t.from_job_title_id
       LEFT JOIN job_titles tj ON tj.id = t.to_job_title_id
       LEFT JOIN users u ON u.id = t.changed_by_id
       LEFT JOIN employees ue ON ue.id = u.employee_id
      WHERE t.employee_id = :employeeId
      ORDER BY t.changed_at DESC
      LIMIT :limit`,
    { type: QueryTypes.SELECT, replacements: { employeeId, limit } }
  );
  return rows.map((r) => ({
    id: r.id,
    changedAt: new Date(r.changed_at).toISOString(),
    from: { section: r.from_section, department: r.from_department, jobTitle: r.from_job_title },
    to: { section: r.to_section, department: r.to_department, jobTitle: r.to_job_title },
    requestsRestarted: Number(r.requests_restarted),
    changedBy: r.changed_by,
  }));
};
