// Renewal rules shared by the renewals screen, request eligibility, the dashboard and reports,
// so every screen agrees on when PPE is due.

export const DEFAULT_FREQUENCY_MONTHS = 12;

/**
 * When an allocation is due for renewal: issue date plus the item's replacement frequency, else the
 * allocation's own, else the stored renewal date, else 12 months (v1 list and section-renewals rules).
 */
export const dueSql = (a: string, p: string) =>
  `COALESCE(${a}."issue_date" + make_interval(months => COALESCE(NULLIF(${p}."replacement_frequency", 0), NULLIF(${a}."replacement_frequency", 0))), ${a}."next_renewal_date", ${a}."issue_date" + interval '${DEFAULT_FREQUENCY_MONTHS} months')`;

/** A later active or expired allocation of the same item to the same employee exists. */
export const newerHolding = (a: string) => `EXISTS (
      SELECT 1 FROM allocations n
      WHERE n.employee_id = ${a}.employee_id AND n.ppe_item_id = ${a}.ppe_item_id AND n.status IN ('active', 'expired')
        AND (n.issue_date, n.created_at, n.id) > (${a}.issue_date, ${a}.created_at, ${a}.id))`;
