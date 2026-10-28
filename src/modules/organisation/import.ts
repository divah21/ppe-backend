import { QueryTypes, type Transaction } from 'sequelize';
import { ZodError, type ZodTypeAny } from 'zod';
import { models, sequelize, type Row } from '../../core/db';
import { AppError } from '../../core/errors';
import { importTransaction, savepoint } from '../../core/import';
import { departmentBody } from '../departments/schemas';
import { assertCategory } from '../job-titles/categories';
import { jobTitleBody } from '../job-titles/schemas';
import { sectionBody } from '../sections/schemas';
import type { OrgImportInput, OrgKind } from './schemas';

const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === '';
const text = (v: unknown) => (blank(v) ? '' : String(v).trim());
const lower = (v: unknown) => text(v).toLowerCase();
const yes = (v: unknown) => (typeof v === 'boolean' ? v : /^(y|yes|true|1|active)$/i.test(text(v)));

const message = (e: unknown) => {
  if (e instanceof ZodError) return e.issues.map((i) => `${i.path.join('.') || 'row'}: ${i.message}`).join('; ');
  if (e instanceof AppError) {
    const fields = (e.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
    return fields ? Object.entries(fields).map(([k, v]) => `${k}: ${v[0]}`).join('; ') : e.message;
  }
  return 'This row could not be saved';
};

class RowProblem extends Error {}

interface Ref {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
}

/** Finds a department or section by code, else by name; a name used more than once needs its parent. */
const finder = (refs: Ref[], noun: string, parentNoun: string) => (value: unknown, parentId?: string | null) => {
  const v = lower(value);
  if (!v) return null;
  const byCode = refs.filter((r) => r.code && r.code.toLowerCase() === v && (!parentId || r.parentId === parentId));
  const matches = byCode.length ? byCode : refs.filter((r) => r.name.toLowerCase() === v && (!parentId || r.parentId === parentId));
  if (matches.length === 1) return matches[0]!;
  if (!matches.length) throw new RowProblem(`No ${noun} called ${text(value)}${parentId ? ` in that ${parentNoun}` : ''}`);
  throw new RowProblem(`More than one ${noun} is called ${text(value)}; add the ${parentNoun} column`);
};

const loadRefs = async (table: 'departments' | 'sections', t: Transaction) =>
  sequelize.query<Ref>(
    table === 'departments'
      ? 'SELECT id, name, code, NULL AS "parentId" FROM departments'
      : 'SELECT id, name, code, department_id AS "parentId" FROM sections',
    { type: QueryTypes.SELECT, transaction: t }
  );

/** The record's stored fields in the form's shape, so an update only changes what the file fills in. */
const stored = (r: Row, parent: 'departmentId' | 'sectionId' | null) => ({
  name: r.name,
  code: r.code ?? undefined,
  description: r.description ?? undefined,
  isActive: !!r.isActive,
  ...(parent ? { [parent]: r[parent] } : {}),
});

const TABLES = { departments: 'departments', sections: 'sections', 'job-titles': 'job_titles' } as const;
const BODIES: Record<OrgKind, ZodTypeAny> = { departments: departmentBody, sections: sectionBody, 'job-titles': jobTitleBody };

/**
 * Adds departments, sections or job titles from a spreadsheet (v1 organisation bulk uploads). Each
 * row is checked with the form's rules; one already there (same name in the same parent) is left
 * alone, or with updateExisting has the file's filled-in columns applied. All or nothing.
 */
export const importOrganisation = async (kind: OrgKind, input: OrgImportInput) => {
  const report = {
    dryRun: input.dryRun,
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: [] as Array<{ row: number; item: string; message: string }>,
  };
  await importTransaction(
    async (t) => {
      // Blocks concurrent saves to the same table, so names and codes checked here stay unique
      await sequelize.query(`LOCK TABLE ${TABLES[kind]} IN SHARE ROW EXCLUSIVE MODE`, { transaction: t });
      const departments = finder(await loadRefs('departments', t), 'department', 'department');
      const sections = kind === 'job-titles' ? finder(await loadRefs('sections', t), 'section', 'department') : null;
      const categories = kind === 'job-titles' ? finder(
        (await models.JobTitle.findAll({ attributes: ['id', 'name', 'code'], where: { ppeCategoryId: null }, transaction: t })).map((j) => ({
          id: j.id as string,
          name: j.name as string,
          code: (j.code as string | null) ?? null,
          parentId: null,
        })),
        'PPE category job title',
        'code'
      ) : null;
      const seen = new Set<string>();

      for (const [index, raw] of input.rows.entries()) {
        const row = index + 1;
        const item = text(raw.name) || text(raw.code) || 'Unnamed';
        try {
          const outcome = await savepoint(t, async (sp): Promise<'created' | 'updated' | 'unchanged'> => {
            let parentId: string | null = null;
            let ppeCategoryId: string | null | undefined;
            if (kind === 'sections') {
              if (blank(raw.department)) throw new RowProblem('Give the department');
              parentId = departments(raw.department)!.id;
            }
            if (kind === 'job-titles') {
              if (blank(raw.section)) throw new RowProblem('Give the section');
              const dept = blank(raw.department) ? null : departments(raw.department)!.id;
              parentId = sections!(raw.section, dept)!.id;
              if (!blank(raw.ppeCategory)) ppeCategoryId = categories!(raw.ppeCategory)!.id;
            }
            const key = `${parentId ?? ''}|${lower(raw.name)}`;
            if (seen.has(key)) throw new RowProblem('This name is listed twice for the same parent in the file');
            seen.add(key);

            const parent = kind === 'sections' ? 'departmentId' : kind === 'job-titles' ? 'sectionId' : null;
            const model = kind === 'departments' ? models.Department : kind === 'sections' ? models.Section : models.JobTitle;
            const [existing] = await sequelize.query<{ id: string }>(
              `SELECT id FROM ${TABLES[kind]} WHERE lower(name) = :name ${parent ? `AND ${parent === 'departmentId' ? 'department_id' : '"sectionId"'} = :parentId` : ''} LIMIT 1`,
              { type: QueryTypes.SELECT, replacements: { name: lower(raw.name), parentId }, transaction: sp }
            );
            const current = existing ? await model.findByPk(existing.id, { transaction: sp }) : null;
            if (current && !input.updateExisting) return 'unchanged';

            const filled: Record<string, unknown> = {};
            for (const f of ['name', 'code', 'description'] as const) if (!blank(raw[f])) filled[f] = text(raw[f]);
            if (!blank(raw.isActive)) filled.isActive = yes(raw.isActive);
            if (parent) filled[parent] = parentId;
            if (ppeCategoryId !== undefined) filled.ppeCategoryId = ppeCategoryId;
            const body = BODIES[kind].parse(current ? { ...stored(current, parent), ...filled } : filled) as Record<string, unknown>;

            if (body.code) {
              const [clash] = await sequelize.query<{ id: string }>(
                `SELECT id FROM ${TABLES[kind]} WHERE lower(code) = :code ${current ? 'AND id <> :id' : ''} LIMIT 1`,
                { type: QueryTypes.SELECT, replacements: { code: lower(body.code), id: current?.id }, transaction: sp }
              );
              if (clash) throw new RowProblem(`The code ${body.code as string} is already used`);
            }
            if (kind === 'job-titles') await assertCategory(body.ppeCategoryId as string | null | undefined, current?.id ?? null, sp, 'ppeCategory');

            if (current) {
              await current.update(body, { transaction: sp });
              return 'updated';
            }
            await model.create(body, { transaction: sp });
            return 'created';
          });
          report[outcome] += 1;
        } catch (e) {
          report.errors.push({ row, item, message: e instanceof RowProblem ? e.message : message(e) });
        }
      }
    },
    () => !input.dryRun && report.errors.length === 0
  );
  return report;
};
