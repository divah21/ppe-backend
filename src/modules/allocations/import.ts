import { Op, col, fn, where as sqlWhere } from 'sequelize';
import type { AuthContext } from '../../core/auth';
import { inTransaction, models, sequelize, type Row } from '../../core/db';
import { badRequest } from '../../core/errors';
import { logger } from '../../core/logger';
import type { ImportInput } from './schemas';

const DEFAULT_FREQUENCY_MONTHS = 12;

/** Thrown to roll back a dry run after it has been fully validated. */
class DryRun extends Error {}

/** Item name variants people use in spreadsheets (from v1). */
const ALIASES: Record<string, string[]> = {
  worksuit: ['work suit', 'overalls', 'overall', 'coverall', 'coveralls'],
  'safety shoes': ['safety shoe', 'safety boots', 'safety boot', 'boots', 'steel toe boots'],
  'winter jackets': ['winter jacket', 'jacket', 'jackets', 'cold weather jacket'],
  'hard hat': ['helmet', 'safety helmet', 'hard hats'],
  'safety glasses': ['glasses', 'goggles', 'safety goggles', 'eye protection'],
  gloves: ['glove', 'work gloves', 'safety gloves'],
  'ear plugs': ['earplugs', 'ear plug', 'hearing protection'],
  'dust mask': ['dust masks', 'respirator', 'face mask', 'mask'],
  'reflective vest': ['hi-vis vest', 'high visibility vest', 'safety vest', 'reflective vests'],
};

const normalise = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

const buildItemLookup = (items: Row[]) => {
  const map = new Map<string, Row>();
  for (const item of items) {
    const name = normalise(item.name);
    map.set(name, item);
    if (!map.has(name.replace(/s$/, '').replace(/-/g, ' '))) map.set(name.replace(/s$/, '').replace(/-/g, ' '), item);
    if (item.itemCode) map.set(normalise(item.itemCode), item);
  }
  for (const [main, aliases] of Object.entries(ALIASES)) {
    const item = map.get(main);
    if (item) for (const alias of aliases) if (!map.has(alias)) map.set(alias, item);
  }
  return (name: string) => map.get(normalise(name)) ?? map.get(normalise(name).replace(/s$/, '').replace(/-/g, ' '));
};

/** Accepts YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY and DD/MM/YY (v1 formats). */
export const parseIssueDate = (value: string): Date | null => {
  const s = value.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s))) {
    const yy = Number(match[3]);
    [y, m, d] = [match[3]!.length === 4 ? yy : yy < 50 ? 2000 + yy : 1900 + yy, Number(match[2]), Number(match[1])];
  } else return null;
  const date = new Date(y, m - 1, d);
  // Reject roll-overs such as 31/02
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
};

interface Issue {
  row: number;
  employee: string;
  item?: string;
  message: string;
}

/**
 * Loads historical allocations (no stock is deducted). With dryRun the whole import is validated and
 * rolled back, so the report shows exactly what a real run would do.
 */
export const importAllocations = async (auth: AuthContext, input: ImportInput) => {
  const report = {
    dryRun: input.dryRun,
    created: [] as Array<{ row: number; employee: string; item: string; quantity: number; issueDate: string; status: string }>,
    employeesCreated: [] as Array<{ row: number; name: string; worksNumber: string }>,
    skipped: [] as Issue[],
    errors: [] as Issue[],
  };

  try {
    await inTransaction(async (t) => {
      if (input.defaultSectionId && !(await models.Section.findByPk(input.defaultSectionId, { transaction: t }))) {
        throw badRequest('The default section does not exist');
      }
      const lookupItem = buildItemLookup(
        await models.PPEItem.findAll({ where: { itemType: 'PPE' }, attributes: ['id', 'name', 'itemCode', 'replacementFrequency'], transaction: t })
      );
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      for (const [index, entry] of input.allocations.entries()) {
        const row = index + 1;
        const firstName = entry.firstName.toUpperCase();
        const lastName = entry.lastName.toUpperCase();
        const who = `${firstName} ${lastName}`;

        // Each person is a savepoint: one bad row must not abort the rest of the import, and its
        // report lines only count once the savepoint is released
        const local = { created: [] as typeof report.created, employeesCreated: [] as typeof report.employeesCreated, skipped: [] as Issue[], errors: [] as Issue[] };
        await sequelize
          .transaction({ transaction: t }, async (sp) => {
            let employee: Row | null = null;
            if (entry.worksNumber) {
              employee = await models.Employee.findOne({ where: { worksNumber: entry.worksNumber }, transaction: sp });
            } else {
              const matches = await models.Employee.findAll({
                where: {
                  [Op.and]: [
                    sqlWhere(fn('UPPER', col('firstName')), firstName),
                    sqlWhere(fn('UPPER', col('lastName')), lastName),
                  ],
                },
                limit: 2,
                transaction: sp,
              });
              if (matches.length > 1) {
                local.errors.push({ row, employee: who, message: 'More than one employee has this name. Add their works number.' });
                return;
              }
              employee = matches[0] ?? null;
            }

            if (!employee) {
              if (!input.defaultSectionId) {
                local.errors.push({ row, employee: who, message: 'Employee not found. Choose a default section to create new employees.' });
                return;
              }
              const worksNumber = entry.worksNumber ?? (await nextWorksNumber(sp));
              employee = await models.Employee.create(
                { firstName, lastName, worksNumber, sectionId: input.defaultSectionId, isActive: true, jobType: entry.jobType ?? 'NEC' },
                { transaction: sp }
              );
              local.employeesCreated.push({ row, name: who, worksNumber });
            }

            for (const line of entry.ppeItems) {
              const item = lookupItem(line.itemName);
              if (!item) {
                local.errors.push({ row, employee: who, item: line.itemName, message: 'No PPE item with this name in the catalogue' });
                continue;
              }
              const issueDate = parseIssueDate(line.issueDate);
              if (!issueDate || issueDate > today) {
                local.errors.push({
                  row,
                  employee: who,
                  item: item.name,
                  message: issueDate ? `Issue date ${line.issueDate} is in the future` : `Invalid issue date ${line.issueDate}`,
                });
                continue;
              }
              const exists = await models.Allocation.count({
                where: { employeeId: employee.id, ppeItemId: item.id, issueDate },
                transaction: sp,
              });
              if (exists) {
                local.skipped.push({ row, employee: who, item: item.name, message: 'Already recorded for this date' });
                continue;
              }
              const frequency = Number(item.replacementFrequency) || DEFAULT_FREQUENCY_MONTHS;
              const nextRenewalDate = new Date(issueDate);
              nextRenewalDate.setMonth(nextRenewalDate.getMonth() + frequency);
              const status = nextRenewalDate <= new Date() ? 'expired' : 'active';
              await models.Allocation.create(
                {
                  employeeId: employee.id,
                  ppeItemId: item.id,
                  issuedById: auth.userId,
                  quantity: line.quantity,
                  size: line.size || null,
                  issueDate,
                  nextRenewalDate,
                  replacementFrequency: frequency,
                  allocationType: 'annual',
                  status,
                  notes: 'Historical allocation (bulk import)',
                },
                { transaction: sp }
              );
              local.created.push({
                row,
                employee: who,
                item: item.name,
                quantity: line.quantity,
                issueDate: `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}-${String(issueDate.getDate()).padStart(2, '0')}`,
                status,
              });
            }
          })
          .then(() => {
            for (const k of ['created', 'employeesCreated', 'skipped', 'errors'] as const) (report[k] as unknown[]).push(...local[k]);
          })
          .catch((err: Error) => {
            logger.warn({ err, row }, 'Allocation import row failed');
            report.errors.push({
              row,
              employee: who,
              message: err.name === 'SequelizeUniqueConstraintError' ? 'This works number is already in use' : 'This row could not be saved',
            });
          });
      }

      if (input.dryRun) throw new DryRun();
    });
  } catch (err) {
    if (!(err instanceof DryRun)) throw err;
  }

  return {
    ...report,
    summary: {
      people: input.allocations.length,
      allocationsCreated: report.created.length,
      employeesCreated: report.employeesCreated.length,
      skipped: report.skipped.length,
      errors: report.errors.length,
    },
  };
};

const nextWorksNumber = async (transaction: import('sequelize').Transaction) => {
  for (let n = (await models.Employee.count({ transaction })) + 1; ; n++) {
    const candidate = `EMP${String(n).padStart(5, '0')}`;
    if (!(await models.Employee.count({ where: { worksNumber: candidate }, transaction }))) return candidate;
  }
};
