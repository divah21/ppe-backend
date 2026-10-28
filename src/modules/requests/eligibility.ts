import { Op, QueryTypes } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { models, sequelize, type Row } from '../../core/db';
import { notFound } from '../../core/errors';
import { likeTerm } from '../../core/http';
import { dueSql } from '../allocations/rules';
import { computeEligibility } from '../matrix/service';
import { employeeScope } from './policy';

export interface MatrixEntry {
  source: 'job-title' | 'section';
  quantityRequired: number;
  isMandatory: boolean;
}

/**
 * The employee's PPE matrix, resolved exactly as the matrix screen and its eligibility endpoint do:
 * the section matrix as a baseline, overridden by the job title's own (and legacy by-name) entries,
 * falling back to its PPE category only when it has none. The caller must have scoped the employee.
 */
export const matrixFor = async (employeeId: string) => {
  const eligibility = await computeEligibility(employeeId);
  const map = new Map<string, MatrixEntry>();
  for (const item of eligibility?.items ?? []) {
    map.set(item.ppeItemId, {
      source: item.source === 'jobTitle' ? 'job-title' : 'section',
      quantityRequired: Number(item.quantity ?? 1),
      isMandatory: item.isMandatory,
    });
  }
  return map;
};

const DUE_SQL = dueSql('a', 'p');

/** Latest renewal due date of the employee's active allocations, per PPE item (absent = never issued). */
export const dueDates = async (employeeId: string, ppeItemIds?: string[]) => {
  if (ppeItemIds && ppeItemIds.length === 0) return new Map<string, Date>();
  const rows = await sequelize.query<{ ppe_item_id: string; due: Date | null }>(
    `SELECT a.ppe_item_id, MAX(${DUE_SQL}) AS due
       FROM allocations a LEFT JOIN ppe_items p ON p.id = a.ppe_item_id
      WHERE a.employee_id = :employeeId AND a.status = 'active' ${ppeItemIds ? 'AND a.ppe_item_id IN (:ppeItemIds)' : ''}
      GROUP BY a.ppe_item_id`,
    { replacements: { employeeId, ppeItemIds: ppeItemIds ?? [] }, type: QueryTypes.SELECT }
  );
  const map = new Map<string, Date>();
  for (const r of rows) if (r.due) map.set(r.ppe_item_id, new Date(r.due));
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
    attributes: ['id'],
  });
  if (!employee) throw notFound('Employee');

  const [matrix, due, catalogue] = await Promise.all([
    matrixFor(employee.id),
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
