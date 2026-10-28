import { col, fn, where as sqlWhere } from 'sequelize';
import { ZodError } from 'zod';
import { AppError } from '../../core/errors';
import { inTransaction, models, sequelize } from '../../core/db';
import { ppeItemBody, type PpeItemImportInput } from './schemas';
import { assertCodesFree, resolveScale } from './service';

class DryRun extends Error {}

const yes = (v: unknown) => (typeof v === 'boolean' ? v : /^(y|yes|true|1)$/i.test(String(v ?? '').trim()));
const list = (v: unknown) =>
  String(v ?? '')
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Spreadsheet cells to the item body: Yes/No flags, comma lists, and sizes implying a size scale. */
const toBody = (r: Record<string, unknown>) => {
  const sizes = list(r.availableSizes);
  const colors = list(r.availableColors);
  const scale = String(r.sizeScale ?? '').trim();
  return {
    ...r,
    isMandatory: r.isMandatory === undefined || r.isMandatory === '' ? true : yes(r.isMandatory),
    hasSizeVariants: r.hasSizeVariants === undefined || r.hasSizeVariants === '' ? !!scale : yes(r.hasSizeVariants),
    hasColorVariants: colors.length > 0,
    availableSizes: sizes.length ? sizes : null,
    availableColors: colors.length ? colors : null,
    targetGender: String(r.targetGender ?? '').trim().toUpperCase() || undefined,
    itemType: String(r.itemType ?? '').trim().toUpperCase() || undefined,
  };
};

const message = (e: unknown) => {
  if (e instanceof ZodError) return e.issues.map((i) => `${i.path.join('.') || 'row'}: ${i.message}`).join('; ');
  if (e instanceof AppError) {
    const fields = (e.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
    return fields ? Object.entries(fields).map(([k, v]) => `${k}: ${v[0]}`).join('; ') : e.message;
  }
  return 'This row could not be saved';
};

/**
 * Adds PPE items from a spreadsheet (v1 catalogue bulk upload), with the same rules as the item form.
 * An item whose code exists is left alone, or overwritten with updateExisting. All or nothing.
 */
export const importPpeItems = async (input: PpeItemImportInput) => {
  const report = {
    dryRun: input.dryRun,
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: [] as Array<{ row: number; item: string; message: string }>,
  };
  try {
    await inTransaction(async (t) => {
      const seen = new Set<string>();
      for (const [index, raw] of input.rows.entries()) {
        const row = index + 1;
        const label = String(raw.itemCode ?? raw.name ?? 'Unnamed item');
        const parsed = ppeItemBody.safeParse(toBody(raw));
        if (!parsed.success) {
          report.errors.push({ row, item: label, message: message(parsed.error) });
          continue;
        }
        const body = parsed.data;
        const key = body.itemCode.toLowerCase();
        if (seen.has(key)) {
          report.errors.push({ row, item: label, message: 'This item code is listed twice in the file' });
          continue;
        }
        seen.add(key);
        const existing = await models.PPEItem.findOne({ where: sqlWhere(fn('lower', col('item_code')), key), transaction: t });
        if (existing && !input.updateExisting) {
          report.unchanged += 1;
          continue;
        }
        // Savepoint per row, so one failure is reported without aborting the rest of the check
        try {
          await sequelize.transaction({ transaction: t }, async (sp) => {
            await assertCodesFree(body, existing?.id ?? null, sp);
            const scale = await resolveScale(body, existing?.sizeScale ?? null, sp);
            const values = { ...body, sizeScale: scale.code, availableSizes: scale.availableSizes };
            if (existing) await existing.update(values, { transaction: sp });
            else await models.PPEItem.create({ ...values, isActive: true }, { transaction: sp });
          });
          report[existing ? 'updated' : 'created'] += 1;
        } catch (e) {
          report.errors.push({ row, item: label, message: message(e) });
        }
      }
      if (input.dryRun || report.errors.length) throw new DryRun();
    });
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
  }
  return report;
};
