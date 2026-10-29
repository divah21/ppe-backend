import { col, fn, where as sqlWhere } from 'sequelize';
import { ZodError } from 'zod';
import { models, type Row } from '../../core/db';
import { AppError } from '../../core/errors';
import { importTransaction, savepoint } from '../../core/import';
import { ppeItemBody, type PpeItemImportInput } from './schemas';
import { assertCodesFree, lockItemCodes, resolveScale } from './service';

const yes = (v: unknown) => (typeof v === 'boolean' ? v : /^(y|yes|true|1)$/i.test(String(v ?? '').trim()));
const list = (v: unknown) =>
  (Array.isArray(v) ? v : String(v ?? '').split(/[,;|]/)).map((s) => String(s).trim()).filter(Boolean);
const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === '';
const NUMERIC = new Set(['replacementFrequency', 'heavyUseFrequency']);

/** The item as stored, in the import's shape, so an update only changes the columns the file has. */
const stored = (p: Row): Record<string, unknown> => ({
  itemCode: p.itemCode,
  itemRefCode: p.itemRefCode,
  name: p.name,
  productName: p.productName,
  itemType: p.itemType,
  category: p.category,
  description: p.description,
  unit: p.unit,
  replacementFrequency: p.replacementFrequency,
  heavyUseFrequency: p.heavyUseFrequency,
  isMandatory: p.isMandatory,
  accountCode: p.accountCode,
  accountDescription: p.accountDescription,
  supplier: p.supplier,
  hasSizeVariants: p.hasSizeVariants,
  sizeScale: p.sizeScale,
  availableSizes: p.availableSizes,
  availableColors: p.availableColors,
  targetGender: p.targetGender,
});

/** Spreadsheet cells to the item body: text for codes typed as numbers, Yes/No flags, comma lists. */
const toBody = (cells: Record<string, unknown>) => {
  const r = Object.fromEntries(
    Object.entries(cells).map(([k, v]) => [k, typeof v === 'number' && !NUMERIC.has(k) ? String(v) : v])
  ) as Record<string, unknown>;
  const sizes = list(r.availableSizes);
  const colors = list(r.availableColors);
  const scale = String(r.sizeScale ?? '').trim();
  return {
    ...r,
    isMandatory: blank(r.isMandatory) ? true : yes(r.isMandatory),
    hasSizeVariants: blank(r.hasSizeVariants) ? !!scale : yes(r.hasSizeVariants),
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
 * An item whose code exists is left alone, or with updateExisting has the file's columns applied
 * over what it has. All or nothing.
 */
export const importPpeItems = async (input: PpeItemImportInput) => {
  const report = {
    dryRun: input.dryRun,
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: [] as Array<{ row: number; item: string; message: string }>,
  };
  await importTransaction(
    async (t) => {
      // Codes are checked under the same lock as the item form, for the whole file
      await lockItemCodes(t);
      const seen = new Set<string>();
      for (const [index, raw] of input.rows.entries()) {
        const row = index + 1;
        const label = String(raw.itemCode ?? raw.name ?? 'Unnamed item');
        const code = String(raw.itemCode ?? '').trim().toLowerCase();
        if (code && seen.has(code)) {
          report.errors.push({ row, item: label, message: 'This item code is listed twice in the file' });
          continue;
        }
        seen.add(code);
        const existing = code ? await models.PPEItem.findOne({ where: sqlWhere(fn('lower', col('item_code')), code), transaction: t }) : null;
        if (existing && !input.updateExisting) {
          report.unchanged += 1;
          continue;
        }
        // Blank cells keep what the item has; only filled-in columns change it
        const filled = Object.fromEntries(Object.entries(raw).filter(([, v]) => !blank(v)));
        const parsed = ppeItemBody.safeParse(toBody(existing ? { ...stored(existing), ...filled } : raw));
        if (!parsed.success) {
          report.errors.push({ row, item: label, message: message(parsed.error) });
          continue;
        }
        const body = parsed.data;
        try {
          await savepoint(t, async (sp) => {
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
    },
    () => !input.dryRun && report.errors.length === 0
  );
  return report;
};
