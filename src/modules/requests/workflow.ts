import { ROLES, type AuthContext, type Role } from '../../core/auth';

/*
 * The v1 request workflow (apps/requests/request_routes.js) as data.
 *
 *   pending --section rep--> hod-review --HOD--> stores-review --stores--> approved --stores fulfil--> fulfilled
 *                                                                                   \-> partially-fulfilled (until all issued)
 *   sheq-review and dept-rep-review are kept for rows already in those stages; both approve to hod-review.
 *   Any stage before approved can be rejected by its approvers; pending can be cancelled by its requester.
 */

export const REQUEST_STATUSES = [
  'pending',
  'sheq-review',
  'dept-rep-review',
  'hod-review',
  'stores-review',
  'approved',
  'partially-fulfilled',
  'fulfilled',
  'rejected',
  'cancelled',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_TYPES = ['new', 'replacement', 'emergency', 'annual'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export type RequestAction = 'approve' | 'reject' | 'cancel' | 'fulfil';

/** Where each approval stage records who approved, when, and their comment. */
export const STAGES = {
  sectionRep: { label: 'Section rep approval', date: 'sectionRepApprovalDate', approver: 'sectionRepApproverId', comment: 'sectionRepComment' },
  sheq: { label: 'SHEQ review', date: 'sheqApprovalDate', approver: 'sheqApproverId', comment: 'sheqComment' },
  deptRep: { label: 'Department rep review', date: 'deptRepApprovalDate', approver: 'deptRepApproverId', comment: 'deptRepComment' },
  hod: { label: 'HOD approval', date: 'hodApprovalDate', approver: 'hodApproverId', comment: 'hodComment' },
  stores: { label: 'Stores approval', date: 'storesApprovalDate', approver: 'storesApproverId', comment: 'storesComment' },
} as const;
export type StageKey = keyof typeof STAGES;

interface ApproveStep {
  roles: readonly Role[];
  next: RequestStatus;
  stage: StageKey;
}

export const APPROVE: Partial<Record<RequestStatus, ApproveStep>> = {
  pending: { roles: [ROLES.SECTION_REP], next: 'hod-review', stage: 'sectionRep' },
  'sheq-review': { roles: [ROLES.SHEQ], next: 'hod-review', stage: 'sheq' },
  'dept-rep-review': { roles: [ROLES.DEPARTMENT_REP], next: 'hod-review', stage: 'deptRep' },
  'hod-review': { roles: [ROLES.HOD], next: 'stores-review', stage: 'hod' },
  'stores-review': { roles: [ROLES.STORES], next: 'approved', stage: 'stores' },
};

/** v1 REJECTORS_BY_STATUS. From approved onward stock may be issued, so rejection is closed. */
export const REJECT: Partial<Record<RequestStatus, readonly Role[]>> = {
  pending: [ROLES.SECTION_REP],
  'sheq-review': [ROLES.SHEQ],
  'dept-rep-review': [ROLES.DEPARTMENT_REP],
  'hod-review': [ROLES.HOD, ROLES.DEPARTMENT_REP],
  'stores-review': [ROLES.STORES],
};

export const FULFILLABLE: readonly RequestStatus[] = ['approved', 'partially-fulfilled'];
export const FULFILLERS: readonly Role[] = [ROLES.STORES];
export const CREATORS: readonly Role[] = [ROLES.SECTION_REP];

export const IN_APPROVAL: RequestStatus[] = ['pending', 'sheq-review', 'dept-rep-review', 'hod-review', 'stores-review'];
/** Raised and not yet closed: in approval or waiting to be issued. */
export const OPEN: RequestStatus[] = [...IN_APPROVAL, ...FULFILLABLE];
export const TERMINAL: RequestStatus[] = ['fulfilled', 'rejected', 'cancelled'];

const can = (auth: AuthContext, roles: readonly Role[] | undefined) =>
  !!roles && (auth.role === ROLES.ADMIN || roles.includes(auth.role));

/** Actions the caller may take on a request that is already within their scope. */
export const allowedActions = (
  auth: AuthContext,
  request: { status: RequestStatus; requestedById: string }
): RequestAction[] => {
  const actions: RequestAction[] = [];
  if (can(auth, APPROVE[request.status]?.roles)) actions.push('approve');
  if (can(auth, REJECT[request.status])) actions.push('reject');
  if (request.status === 'pending' && (auth.role === ROLES.ADMIN || (auth.role === ROLES.SECTION_REP && request.requestedById === auth.userId))) {
    actions.push('cancel');
  }
  if (FULFILLABLE.includes(request.status) && can(auth, FULFILLERS)) actions.push('fulfil');
  return actions;
};

export const VIEWS = ['mine', 'all', 'open', 'approval', 'ready', 'fulfilled', 'rejected'] as const;
export type View = (typeof VIEWS)[number];

/** Statuses at which the role is the one expected to act next (approve or issue). */
export const awaitingRole = (role: Role): RequestStatus[] => {
  if (role === ROLES.ADMIN) return [...IN_APPROVAL, ...FULFILLABLE];
  const statuses = (Object.keys(APPROVE) as RequestStatus[]).filter((s) => APPROVE[s]!.roles.includes(role));
  if (FULFILLERS.includes(role)) statuses.push(...FULFILLABLE);
  return statuses;
};

/** Statuses a view shows, or null for every status. */
export const viewStatuses = (view: View, role: Role): RequestStatus[] | null => {
  switch (view) {
    case 'mine':
      return awaitingRole(role);
    case 'open':
      return OPEN;
    case 'approval':
      return IN_APPROVAL;
    case 'ready':
      return [...FULFILLABLE];
    case 'fulfilled':
      return ['fulfilled'];
    case 'rejected':
      return ['rejected', 'cancelled'];
    default:
      return null;
  }
};
