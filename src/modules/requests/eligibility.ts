import { Op } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { models, type Row } from '../../core/db';
import { notFound } from '../../core/errors';
import { likeTerm } from '../../core/http';
import { employeeScope } from './policy';

export interface MatrixEntry {
  source: 'job-title' | 'section';
  quantityRequired: number;
  isMandatory: boolean;
}

/**
 * The employee's PPE matrix as v1 builds it: the section matrix as a baseline, overridden by the
 * job-title matrix (looked up through the job title's ppeCategoryId mapping when it has one).
 */
export const matrixFor = async (employee: Row) => {
  const jobTitleId = employee.jobTitleRef?.ppeCategoryId ?? employee.jobTitleId ?? null;
  const [bySection, byJobTitle] = await Promise.all([
    models.SectionPPEMatrix.findAll({ where: { sectionId: employee.sectionId, isActive: true } }),
    jobTitleId ? models.JobTitlePPEMatrix.findAll({ where: { jobTitleId, isActive: true } }) : Promise.resolve([] as Row[]),
  ]);
  const map = new Map<string, MatrixEntry>();
  const add = (rows: Row[], source: MatrixEntry['source']) => {
    for (const row of rows) {
      map.set(row.ppeItemId, { source, quantityRequired: Number(row.quantityRequired ?? 1), isMandatory: !!row.isMandatory });
    }
  };
  add(bySection, 'section');
  add(byJobTitle, 'job-title');
  return map;
};

/** Latest next-renewal date of the employee's active allocations, per PPE item (null = due now). */
export const dueDates = async (employeeId: string, ppeItemIds?: string[]) => {
  const rows = await models.Allocation.findAll({
    where: { employeeId, status: 'active', ...(ppeItemIds ? { ppeItemId: ppeItemIds } : {}) },
    attributes: ['ppeItemId', 'nextRenewalDate'],
  });
  const map = new Map<string, Date | null>();
  for (const row of rows) {
    const next: Date | null = row.nextRenewalDate ?? null;
    const current = map.get(row.ppeItemId);
    if (current === undefined || (next && (!current || next > current))) map.set(row.ppeItemId, next);
  }
  return map;
};

const sizeValue = (s: unknown): string | null => {
  if (typeof s === 'string' || typeof s === 'number') return String(s).trim() || null;
  if (s && typeof s === 'object') {
    const o = s as Record<string, unknown>;
    return sizeValue(o.value ?? o.size ?? o.label ?? null);
  }
  return null;
};

/** Sizes offered per PPE item: its own list, else its size scale, plus any size held in stock. */
const sizesFor = async (items: Row[]) => {
  const scaleCodes = [...new Set(items.map((i) => i.sizeScale).filter(Boolean))] as string[];
  const scales = scaleCodes.length
    ? await models.SizeScale.findAll({
        where: { code: scaleCodes },
        include: [{ model: models.Size, as: 'sizes', attributes: ['value', 'sortOrder'] }],
      })
    : [];
  const byScale = new Map(
    scales.map((s) => [
      s.code as string,
      (s.sizes as Row[]).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((z) => String(z.value)),
    ])
  );
  const stock = items.length
    ? await models.Stock.findAll({
        where: { ppeItemId: items.map((i) => i.id), size: { [Op.ne]: null } },
        attributes: ['ppeItemId', 'size'],
        group: ['ppeItemId', 'size'],
      })
    : [];

  const map = new Map<string, string[]>();
  for (const item of items) {
    const own = Array.isArray(item.availableSizes) ? item.availableSizes.map(sizeValue).filter(Boolean) : [];
    const base = own.length ? (own as string[]) : (byScale.get(item.sizeScale) ?? []);
    const extra = stock.filter((s) => s.ppeItemId === item.id).map((s) => String(s.size));
    map.set(item.id, [...new Set([...base, ...extra])]);
  }
  return map;
};

/** Employees the caller can raise a request for (picker; at most 20 matches). */
export const searchEmployees = async (auth: AuthContext, q?: string) => {
  const where = [employeeScope(auth), { isActive: { [Op.ne]: false } }];
  if (q) {
    const like = { [Op.iLike]: likeTerm(q) };
    where.push({ [Op.or]: [{ firstName: like }, { lastName: like }, { worksNumber: like }] });
  }
  const rows = await models.Employee.findAll({
    where: { [Op.and]: where },
    attributes: ['id', 'worksNumber', 'firstName', 'lastName', 'jobTitle'],
    include: [{ model: models.Section, as: 'section', attributes: ['id', 'name'] }],
    order: [
      ['firstName', 'ASC'],
      ['lastName', 'ASC'],
    ],
    limit: 20,
  });
  return rows.map((e) => ({
    id: e.id as string,
    name: `${e.firstName} ${e.lastName}`,
    worksNumber: e.worksNumber as string,
    jobTitle: (e.jobTitle as string | null) ?? null,
    section: e.section ? { id: e.section.id as string, name: e.section.name as string } : null,
  }));
};

/** What the employee may be issued: matrix items (with due dates) and the active catalogue. */
export const employeeEligibility = async (auth: AuthContext, employeeId: string) => {
  const employee = await models.Employee.findOne({
    where: { [Op.and]: [employeeScope(auth), { id: employeeId }] },
    include: [{ model: models.JobTitle, as: 'jobTitleRef', required: false }],
  });
  if (!employee) throw notFound('Employee');

  const [matrix, due, catalogue] = await Promise.all([
    matrixFor(employee),
    dueDates(employee.id),
    models.PPEItem.findAll({
      where: { isActive: { [Op.ne]: false }, itemType: 'PPE' },
      attributes: ['id', 'name', 'itemCode', 'category', 'unit', 'hasSizeVariants', 'sizeScale', 'availableSizes'],
      order: [['name', 'ASC']],
    }),
  ]);
  // Matrix items stay requestable even if their type is not PPE
  const missing = [...matrix.keys()].filter((id) => !catalogue.some((c) => c.id === id));
  const extra = missing.length
    ? await models.PPEItem.findAll({
        where: { id: missing, isActive: { [Op.ne]: false } },
        attributes: ['id', 'name', 'itemCode', 'category', 'unit', 'hasSizeVariants', 'sizeScale', 'availableSizes'],
      })
    : [];
  const items = [...catalogue, ...extra];
  const sizes = await sizesFor(items);
  const now = Date.now();

  return {
    employeeId: employee.id as string,
    items: items.map((p) => {
      const entry = matrix.get(p.id);
      const next = due.get(p.id) ?? null;
      return {
        ppeItemId: p.id as string,
        name: p.name as string,
        itemCode: (p.itemCode as string | null) ?? null,
        category: (p.category as string | null) ?? null,
        unit: (p.unit as string | null) ?? null,
        hasSizeVariants: !!p.hasSizeVariants,
        sizes: sizes.get(p.id) ?? [],
        inMatrix: !!entry,
        matrixSource: entry?.source ?? null,
        quantityRequired: entry?.quantityRequired ?? null,
        isMandatory: entry?.isMandatory ?? false,
        nextRenewalDate: next,
        isDue: !next || next.getTime() <= now,
      };
    }),
  };
};
