import { ROLES, type AuthContext } from '../../core/auth';
import { dueSql } from '../allocations/rules';

const NIL = '00000000-0000-0000-0000-000000000000';

export type Scope = { kind: 'mine' } | { kind: 'department'; id: string } | { kind: 'section'; id: string };

/**
 * The slice of the mine a user may see. A department or section role without one sees nothing,
 * and so does any role this list does not know (fail closed).
 */
export const scopeOf = (auth: AuthContext): Scope => {
  switch (auth.role) {
    case ROLES.ADMIN:
    case ROLES.SHEQ:
    case ROLES.STORES:
      return { kind: 'mine' };
    case ROLES.HOD:
    case ROLES.DEPARTMENT_REP:
      return { kind: 'department', id: auth.departmentId ?? NIL };
    case ROLES.SECTION_REP:
      return { kind: 'section', id: auth.sectionId ?? NIL };
    default:
      return { kind: 'section', id: NIL };
  }
};

/**
 * SQL condition limiting rows to the scope, given the expressions holding a row's section and
 * department ids. Bind the result's replacements alongside the query's own.
 */
export const scopeSql = (scope: Scope, sectionExpr: string, departmentExpr: string) => {
  if (scope.kind === 'mine') return { sql: 'TRUE', replacements: {} };
  const expr = scope.kind === 'section' ? sectionExpr : departmentExpr;
  return { sql: `${expr} = :scopeId`, replacements: { scopeId: scope.id } };
};

/**
 * Narrows a scope with optional department / section filters. Filters never widen it: a filter
 * outside the scope yields a condition that matches nothing.
 */
export const filterSql = (
  scope: Scope,
  filters: { departmentId?: string; sectionId?: string },
  sectionExpr: string,
  departmentExpr: string
) => {
  const base = scopeSql(scope, sectionExpr, departmentExpr);
  const parts = [base.sql];
  const replacements: Record<string, unknown> = { ...base.replacements };
  if (filters.departmentId) {
    parts.push(`${departmentExpr} = :filterDepartmentId`);
    replacements.filterDepartmentId = filters.departmentId;
  }
  if (filters.sectionId) {
    parts.push(`${sectionExpr} = :filterSectionId`);
    replacements.filterSectionId = filters.sectionId;
  }
  return { sql: parts.join(' AND '), replacements };
};

/** Renewal date of an allocation, the same rule as the renewals screen. */
export const RENEWAL_SQL = dueSql;

/** Cost of an allocation line: stored total, else unit cost times quantity. */
export const COST_SQL = (a: string) => `COALESCE(${a}.total_cost, ${a}.unit_cost * ${a}.quantity, 0)`;

/*
 * A request's section and department, for a query joining employees e and sections sec on
 * REQUEST_SECTION. Same rule as requests/policy.ts: v1 stored the creator's section on a request,
 * so the employee's section wins and the stored one only covers visitor requests.
 */
export const REQUEST_SECTION = 'COALESCE(e."sectionId", r.section_id)';
export const REQUEST_DEPARTMENT = 'COALESCE(sec.department_id, r.department_id)';

/** Request statuses that are finished and need nobody's action. */
export const CLOSED_REQUEST_STATUSES = ['fulfilled', 'rejected', 'cancelled'] as const;
