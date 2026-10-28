import { Op, type Transaction } from 'sequelize';
import { inTransaction, models, type Row } from '../../core/db';
import { AppError } from '../../core/errors';
import { importRow, type ImportRow } from './schemas';
import { localToday } from './service';

export interface ImportIssue {
  /** 0-based position in the submitted rows */
  index: number;
  worksNumber: string | null;
  field: string;
  message: string;
}

interface Planned {
  index: number;
  values: Record<string, unknown>;
  existing: Row | null;
}

const key = (s: string) => s.trim().toUpperCase();

/** name/code -> ids; a name shared by several records is ambiguous and resolves to nothing. */
const lookup = (rows: Row[], ...fields: string[]) => {
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    for (const f of fields) {
      const v = r[f];
      if (typeof v !== 'string' || !v.trim()) continue;
      const k = key(v);
      if (!map.has(k)) map.set(k, new Set());
      map.get(k)!.add(r.id as string);
    }
  }
  return (name: string) => {
    const ids = map.get(key(name));
    if (!ids) return { id: null, ambiguous: false };
    return ids.size === 1 ? { id: [...ids][0]!, ambiguous: false } : { id: null, ambiguous: true };
  };
};

const rawWorksNumber = (raw: Record<string, unknown>) => {
  const v = raw.worksNumber;
  return v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim();
};

/**
 * Validates every row and resolves sections, job titles and cost centres by name or code.
 * Rows whose works number already exists are updated (only the cells that were filled in).
 */
const plan = async (rawRows: Array<Record<string, unknown>>, t?: Transaction) => {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const parsed: Array<{ index: number; row: ImportRow }> = [];

  rawRows.forEach((raw, index) => {
    const result = importRow.safeParse(raw);
    if (result.success) {
      parsed.push({ index, row: result.data });
      return;
    }
    for (const issue of result.error.issues) {
      errors.push({ index, worksNumber: rawWorksNumber(raw), field: String(issue.path[0] ?? 'row'), message: issue.message });
    }
  });

  const seen = new Set<string>();
  const repeated = new Set<number>();
  for (const { index, row } of parsed) {
    if (!seen.has(row.worksNumber)) {
      seen.add(row.worksNumber);
      continue;
    }
    repeated.add(index);
    errors.push({ index, worksNumber: row.worksNumber, field: 'worksNumber', message: 'This works number appears earlier in the file' });
  }

  const [sections, jobTitles, costCentres, existing] = await Promise.all([
    models.Section.findAll({ attributes: ['id', 'name', 'code'], transaction: t }),
    models.JobTitle.findAll({ attributes: ['id', 'name', 'sectionId'], transaction: t }),
    models.CostCenter.findAll({ attributes: ['id', 'name', 'code'], transaction: t }),
    models.Employee.findAll({
      where: { worksNumber: { [Op.in]: [...seen] } },
      transaction: t,
      ...(t ? { lock: t.LOCK.UPDATE } : {}),
    }),
  ]);

  const sectionBy = lookup(sections, 'name', 'code');
  const costCentreBy = lookup(costCentres, 'code', 'name');
  const jobTitleIds = new Map(jobTitles.map((j) => [`${j.sectionId}|${key(j.name)}`, j.id as string]));
  const jobTitleSection = new Map(jobTitles.map((j) => [j.id as string, j.sectionId as string]));
  const existingBy = new Map(existing.map((e) => [e.worksNumber as string, e]));

  const planned: Planned[] = [];
  for (const { index, row } of parsed) {
    if (repeated.has(index)) continue;
    const issue = (field: string, message: string) => ({ index, worksNumber: row.worksNumber, field, message });

    const section = sectionBy(row.section);
    if (!section.id) {
      errors.push(
        issue(
          'section',
          section.ambiguous
            ? `"${row.section}" matches more than one section; use the section code`
            : `Section "${row.section}" was not found`
        )
      );
      continue;
    }

    const current = existingBy.get(row.worksNumber) ?? null;
    let jobTitleId: string | null = null;
    if (row.jobTitle) {
      jobTitleId = jobTitleIds.get(`${section.id}|${key(row.jobTitle)}`) ?? null;
      if (!jobTitleId) warnings.push(issue('jobTitle', `Job title "${row.jobTitle}" is not set up for this section; it is kept as text`));
    }

    let costCenterId: string | null = null;
    if (row.costCentre) {
      const cc = costCentreBy(row.costCentre);
      costCenterId = cc.id;
      if (!cc.id)
        warnings.push(
          issue(
            'costCentre',
            cc.ambiguous ? `"${row.costCentre}" matches more than one cost centre; left blank` : `Cost centre "${row.costCentre}" was not found; left blank`
          )
        );
    }

    const values: Record<string, unknown> = {
      worksNumber: row.worksNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      sectionId: section.id,
    };
    // A job title given in the file replaces the linked one (unmatched ones are kept as text only).
    // Without one, a linked title that belongs to a different section than the new one is dropped.
    let linkedJobTitle: string | null | undefined;
    if (row.jobTitle) linkedJobTitle = jobTitleId;
    else if (current?.jobTitleId && jobTitleSection.get(current.jobTitleId as string) !== section.id) {
      linkedJobTitle = null;
      if (current.sectionId !== section.id) {
        warnings.push(issue('jobTitle', 'The current job title belongs to the old section and is cleared'));
      }
    }

    const optional: Record<string, unknown> = {
      jobTitle: row.jobTitle,
      jobTitleId: linkedJobTitle,
      costCenterId: costCenterId ?? undefined,
      jobType: row.jobType,
      gender: row.gender,
      contractType: row.contractType,
      email: row.email,
      phoneNumber: row.phoneNumber,
      dateJoined: row.dateJoined,
    };
    for (const [k, v] of Object.entries(optional)) if (v !== undefined) values[k] = v;
    // v1 rule: a terminated contract makes the employee inactive. An import never reactivates
    // someone who was deactivated; that stays a deliberate admin action.
    if (row.contractType === 'TERMINATED') values.isActive = false;
    else if (!current) values.isActive = true;
    else if (!current.isActive) {
      warnings.push(issue('worksNumber', 'This employee is inactive and stays inactive; reactivate them from their profile'));
    }

    planned.push({ index, values, existing: current });
  }

  errors.sort((a, b) => a.index - b.index);
  warnings.sort((a, b) => a.index - b.index);
  return { errors, warnings, planned };
};

const counts = (planned: Planned[]) => ({
  created: planned.filter((p) => !p.existing).length,
  updated: planned.filter((p) => p.existing).length,
});

export const importEmployees = async (rows: Array<Record<string, unknown>>, dryRun: boolean) => {
  if (dryRun) {
    const { errors, warnings, planned } = await plan(rows);
    return { dryRun: true, valid: errors.length === 0, total: rows.length, ...counts(planned), errors, warnings };
  }

  return inTransaction(async (t) => {
    const { errors, warnings, planned } = await plan(rows, t);
    if (errors.length > 0) {
      throw new AppError('VALIDATION_FAILED', `${errors.length} problem${errors.length === 1 ? '' : 's'} found. Nothing was imported.`, {
        errors,
      });
    }
    const creates = planned.filter((p) => !p.existing);
    const updates = planned.filter((p) => p.existing);
    if (creates.length > 0) {
      await models.Employee.bulkCreate(
        creates.map((p) => ({ dateJoined: localToday(), isActive: true, ...p.values })),
        { transaction: t }
      );
    }
    for (const p of updates) await p.existing!.update(p.values, { transaction: t });
    return { dryRun: false, valid: true, total: rows.length, ...counts(planned), errors: [] as ImportIssue[], warnings };
  });
};
