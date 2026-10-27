import { QueryTypes } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { models, sequelize } from '../../core/db';
import { departmentScope, seesWholeMine } from './policy';
import { money, round2 } from './spend';

interface Requirement {
  ppeItemId: string;
  quantity: number;
}

const push = (map: Map<string, Requirement[]>, key: string | null | undefined, r: Requirement) => {
  if (!key) return;
  const list = map.get(key);
  if (list) list.push(r);
  else map.set(key, [r]);
};

/**
 * What each department's PPE should cost for a year according to the PPE matrix (v1 rules):
 * every active employee gets their job title's items (or its PPE category's), plus their
 * section's items not already covered, each at quantity x unit price.
 */
export const suggestedBudgets = async (auth: AuthContext, fiscalYear: number) => {
  const dept = departmentScope(auth);

  const [departments, employees, prices, titleMatrix, sectionMatrix] = await Promise.all([
    models.Department.findAll({
      where: dept ? { id: dept } : {},
      attributes: ['id', 'name', 'code'],
      include: [{ model: models.Section, as: 'sections', attributes: ['id'] }],
      order: [['name', 'ASC']],
    }),
    sequelize.query<{ id: string; section_id: string; department_id: string; job_title_id: string | null; job_title: string | null; category_id: string | null }>(
      `SELECT e.id, e."sectionId" AS section_id, s.department_id, e."jobTitleId" AS job_title_id, e."jobTitle" AS job_title,
              jt."ppeCategoryId" AS category_id
       FROM employees e
       JOIN sections s ON s.id = e."sectionId"
       LEFT JOIN job_titles jt ON jt.id = e."jobTitleId"
       WHERE e."isActive" = true ${dept ? 'AND s.department_id = :dept' : ''}`,
      { type: QueryTypes.SELECT, replacements: { dept } }
    ),
    sequelize.query<{ ppe_item_id: string; price: string }>(
      `SELECT st.ppe_item_id, AVG(st.unit_price_u_s_d) AS price
       FROM stocks st JOIN ppe_items i ON i.id = st.ppe_item_id
       WHERE i.is_active = true AND st.unit_price_u_s_d IS NOT NULL
       GROUP BY st.ppe_item_id`,
      { type: QueryTypes.SELECT }
    ),
    models.JobTitlePPEMatrix.findAll({ where: { isActive: true }, attributes: ['jobTitleId', 'jobTitle', 'ppeItemId', 'quantityRequired'] }),
    models.SectionPPEMatrix.findAll({ where: { isActive: true }, attributes: ['sectionId', 'ppeItemId', 'quantityRequired'] }),
  ]);

  const price = new Map(prices.map((p) => [p.ppe_item_id, Number(p.price) || 0]));
  const byTitle = new Map<string, Requirement[]>();
  for (const m of titleMatrix) push(byTitle, m.jobTitleId || m.jobTitle, { ppeItemId: m.ppeItemId, quantity: m.quantityRequired || 1 });
  const bySection = new Map<string, Requirement[]>();
  for (const m of sectionMatrix) push(bySection, m.sectionId, { ppeItemId: m.ppeItemId, quantity: m.quantityRequired || 1 });

  const totals = new Map<string, { suggested: number; employees: number; withMatrix: number }>();
  for (const e of employees) {
    let titleReqs = (e.job_title_id && byTitle.get(e.job_title_id)) || [];
    if (!titleReqs.length && e.category_id) titleReqs = byTitle.get(e.category_id) ?? [];
    const legacy = (e.job_title && byTitle.get(e.job_title)) || [];
    const applied = new Set<string>();
    let cost = 0;
    let matched = false;
    for (const r of [...titleReqs, ...legacy, ...(bySection.get(e.section_id) ?? [])]) {
      if (applied.has(r.ppeItemId)) continue;
      applied.add(r.ppeItemId);
      const c = (price.get(r.ppeItemId) ?? 0) * r.quantity;
      cost += c;
      if (c > 0) matched = true;
    }
    const t = totals.get(e.department_id) ?? { suggested: 0, employees: 0, withMatrix: 0 };
    t.suggested += cost;
    t.employees += 1;
    if (matched) t.withMatrix += 1;
    totals.set(e.department_id, t);
  }

  const allocated = await models.Budget.findAll({
    where: dept ? { fiscalYear, departmentId: dept } : { fiscalYear },
    attributes: ['departmentId', 'allocatedAmount'],
  });
  const allocatedBy = new Map<string, number>();
  for (const b of allocated) allocatedBy.set(b.departmentId, round2((allocatedBy.get(b.departmentId) ?? 0) + money(b.allocatedAmount)));

  const rows = departments.map((d) => {
    const t = totals.get(d.id);
    const suggested = round2(t?.suggested ?? 0);
    const current = allocatedBy.get(d.id) ?? 0;
    return {
      departmentId: d.id as string,
      departmentName: d.name as string,
      departmentCode: (d.code as string | null) ?? null,
      sectionCount: (d.sections as unknown[] | undefined)?.length ?? 0,
      employeeCount: t?.employees ?? 0,
      employeesWithMatrix: t?.withMatrix ?? 0,
      suggestedBudget: suggested,
      allocated: current,
      difference: round2(suggested - current),
    };
  });

  const overall = round2(rows.reduce((s, r) => s + r.suggestedBudget, 0));
  const employeeCount = rows.reduce((s, r) => s + r.employeeCount, 0);
  const company = seesWholeMine(auth) ? await models.CompanyBudget.findOne({ where: { fiscalYear }, attributes: ['totalBudget'] }) : null;
  return {
    fiscalYear,
    overallSuggestedBudget: overall,
    companyBudget: company ? money(company.totalBudget) : null,
    employeeCount,
    avgPerEmployee: employeeCount ? round2(overall / employeeCount) : 0,
    departments: rows,
  };
};
