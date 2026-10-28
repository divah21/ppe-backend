import { QueryTypes } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { models, sequelize } from '../../core/db';
import { notFound } from '../../core/errors';
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

interface EmployeeCost {
  id: string;
  name: string;
  worksNumber: string;
  sectionId: string;
  sectionName: string;
  departmentId: string;
  jobTitle: string | null;
  cost: number;
  matched: boolean;
  items: Array<{ ppeItemId: string; quantity: number; unitPrice: number; cost: number }>;
}

/**
 * Each active employee's PPE cost for a year according to the matrix (v1 rules): their job title's
 * items (or its PPE category's), plus their section's items not already covered, each at quantity x
 * the average stock price.
 */
export const employeeCosts = async (dept: string | null): Promise<EmployeeCost[]> => {
  const [employees, prices, titleMatrix, sectionMatrix] = await Promise.all([
    sequelize.query<{
      id: string;
      first_name: string;
      last_name: string;
      works_number: string;
      section_id: string;
      section_name: string;
      department_id: string;
      job_title_id: string | null;
      job_title: string | null;
      job_title_name: string | null;
      category_id: string | null;
    }>(
      `SELECT e.id, e."firstName" AS first_name, e."lastName" AS last_name, e."worksNumber" AS works_number,
              e."sectionId" AS section_id, s.name AS section_name, s.department_id, e."jobTitleId" AS job_title_id,
              e."jobTitle" AS job_title, jt.name AS job_title_name, jt."ppeCategoryId" AS category_id
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

  return employees.map((e) => {
    let titleReqs = (e.job_title_id && byTitle.get(e.job_title_id)) || [];
    if (!titleReqs.length && e.category_id) titleReqs = byTitle.get(e.category_id) ?? [];
    const legacy = (e.job_title && byTitle.get(e.job_title)) || [];
    const applied = new Set<string>();
    const items: EmployeeCost['items'] = [];
    for (const r of [...titleReqs, ...legacy, ...(bySection.get(e.section_id) ?? [])]) {
      if (applied.has(r.ppeItemId)) continue;
      applied.add(r.ppeItemId);
      const unitPrice = price.get(r.ppeItemId) ?? 0;
      items.push({ ppeItemId: r.ppeItemId, quantity: r.quantity, unitPrice, cost: unitPrice * r.quantity });
    }
    return {
      id: e.id,
      name: `${e.first_name} ${e.last_name}`.trim(),
      worksNumber: e.works_number,
      sectionId: e.section_id,
      sectionName: e.section_name,
      departmentId: e.department_id,
      jobTitle: e.job_title_name ?? e.job_title,
      cost: items.reduce((sum, i) => sum + i.cost, 0),
      matched: items.some((i) => i.cost > 0),
      items,
    };
  });
};

/** What each department's PPE should cost for a year according to the PPE matrix. */
export const suggestedBudgets = async (auth: AuthContext, fiscalYear: number) => {
  const dept = departmentScope(auth);
  const [departments, costs, allocated] = await Promise.all([
    models.Department.findAll({
      where: dept ? { id: dept } : {},
      attributes: ['id', 'name', 'code'],
      include: [{ model: models.Section, as: 'sections', attributes: ['id'] }],
      order: [['name', 'ASC']],
    }),
    employeeCosts(dept),
    models.Budget.findAll({
      where: dept ? { fiscalYear, departmentId: dept } : { fiscalYear },
      attributes: ['departmentId', 'allocatedAmount'],
    }),
  ]);

  const totals = new Map<string, { suggested: number; employees: number; withMatrix: number }>();
  for (const e of costs) {
    const t = totals.get(e.departmentId) ?? { suggested: 0, employees: 0, withMatrix: 0 };
    t.suggested += e.cost;
    t.employees += 1;
    if (e.matched) t.withMatrix += 1;
    totals.set(e.departmentId, t);
  }
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

/**
 * One department's suggested budget by section, employee and item (v1 HOD budget drill-down and
 * the stores "suggested by department" employee breakdown).
 */
export const suggestedForDepartment = async (auth: AuthContext, departmentId: string) => {
  const scoped = departmentScope(auth);
  if (scoped && scoped !== departmentId) throw notFound('Department');
  const department = await models.Department.findByPk(departmentId, { attributes: ['id', 'name'] });
  if (!department) throw notFound('Department');
  const [costs, catalogue] = await Promise.all([
    employeeCosts(departmentId),
    models.PPEItem.findAll({ attributes: ['id', 'name', 'itemCode'] }),
  ]);
  const names = new Map(catalogue.map((p) => [p.id as string, { name: p.name as string, itemCode: (p.itemCode as string | null) ?? null }]));

  const sections = new Map<string, { id: string; name: string; total: number; employees: Array<Omit<EmployeeCost, 'items' | 'departmentId' | 'sectionId' | 'sectionName' | 'matched'> & { items: number }> }>();
  const items = new Map<string, { ppeItemId: string; name: string; itemCode: string | null; quantity: number; cost: number }>();
  for (const c of costs) {
    const s = sections.get(c.sectionId) ?? { id: c.sectionId, name: c.sectionName, total: 0, employees: [] };
    s.total += c.cost;
    s.employees.push({ id: c.id, name: c.name, worksNumber: c.worksNumber, jobTitle: c.jobTitle, cost: round2(c.cost), items: c.items.length });
    sections.set(c.sectionId, s);
    for (const i of c.items) {
      const ref = names.get(i.ppeItemId);
      const row = items.get(i.ppeItemId) ?? { ppeItemId: i.ppeItemId, name: ref?.name ?? 'Unknown item', itemCode: ref?.itemCode ?? null, quantity: 0, cost: 0 };
      row.quantity += i.quantity;
      row.cost += i.cost;
      items.set(i.ppeItemId, row);
    }
  }
  const total = round2(costs.reduce((sum, c) => sum + c.cost, 0));
  return {
    department: { id: department.id as string, name: department.name as string },
    total,
    employeeCount: costs.length,
    sections: [...sections.values()]
      .map((s) => ({ ...s, total: round2(s.total), employees: s.employees.sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name)) }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    items: [...items.values()].map((i) => ({ ...i, cost: round2(i.cost) })).sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name)),
  };
};
