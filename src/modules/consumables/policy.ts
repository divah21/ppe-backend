import type { WhereOptions } from 'sequelize';
import { ROLES, type AuthContext } from '../../core/auth';
import type { RequestStatus } from './schemas';

const NONE = '00000000-0000-0000-0000-000000000000';
const WHOLE_MINE = new Set<string>([ROLES.ADMIN, ROLES.SHEQ, ROLES.STORES]);

/** Requests and issues a user may see: whole mine, their department, or their section. */
export const orgScope = (auth: AuthContext): WhereOptions => {
  if (WHOLE_MINE.has(auth.role)) return {};
  if (auth.role === ROLES.HOD || auth.role === ROLES.DEPARTMENT_REP) return { departmentId: auth.departmentId ?? NONE };
  if (auth.role === ROLES.SECTION_REP) return { sectionId: auth.sectionId ?? NONE };
  return { id: NONE };
};

export const isAdmin = (auth: AuthContext) => auth.role === ROLES.ADMIN;
export const isStores = (auth: AuthContext) => auth.role === ROLES.STORES || isAdmin(auth);

/** Who may raise a request (v1: section reps, HODs and admins). */
export const REQUESTER_ROLES = [ROLES.SECTION_REP, ROLES.HOD] as const;
export const canRequest = (auth: AuthContext) =>
  isAdmin(auth) || (REQUESTER_ROLES as readonly string[]).includes(auth.role);

/** Stores can issue against these; partial issues can be completed later. */
export const FULFILLABLE: readonly RequestStatus[] = ['hod-approved', 'stores-review', 'partially-fulfilled'];

export type RequestAction = 'approve' | 'reject' | 'fulfil' | 'stores-reject' | 'cancel';

/** Actions the user may take on a request that is already in their scope. */
export const allowedActions = (
  auth: AuthContext,
  r: { status: RequestStatus; requestedById: string }
): RequestAction[] => {
  const actions: RequestAction[] = [];
  if (r.status === 'pending-hod-approval') {
    if (isAdmin(auth) || auth.role === ROLES.HOD) actions.push('approve', 'reject');
    if (isAdmin(auth) || r.requestedById === auth.userId) actions.push('cancel');
  }
  if (FULFILLABLE.includes(r.status) && isStores(auth)) {
    actions.push('fulfil');
    if (r.status !== 'partially-fulfilled') actions.push('stores-reject');
  }
  return actions;
};
