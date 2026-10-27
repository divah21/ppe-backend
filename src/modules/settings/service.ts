import type { Request } from 'express';
import { Op } from 'sequelize';
import { ZodError } from 'zod';
import { audit } from '../../core/audit';
import { config } from '../../core/config';
import { inTransaction, models, type Row } from '../../core/db';
import { notFound } from '../../core/errors';
import { logger } from '../../core/logger';
import { CATALOG, categoryBody, findCategory, storedTypeOf, type SettingDef, type SettingValue } from './catalog';
import { backupHelper, backupPath } from './backups';

const serialize = (def: SettingDef, value: SettingValue) => (def.kind === 'idList' ? JSON.stringify(value) : String(value));

/** Reads a stored value as its catalog type; a row that no longer parses falls back to the default. */
const parseStored = (def: SettingDef, raw: string | null): SettingValue => {
  if (raw === null) return def.default;
  let value: unknown = raw;
  if (def.kind === 'boolean') value = raw === 'true';
  else if (def.kind === 'number') value = Number(raw);
  else if (def.kind === 'idList') {
    try {
      value = JSON.parse(raw);
    } catch {
      return def.default;
    }
  }
  return def.schema.safeParse(value).success ? (value as SettingValue) : def.default;
};

const toSetting = (def: SettingDef, row: Row | undefined) => {
  const stored = row ? ((row.value as string | null) ?? null) : null;
  const isSecret = def.kind === 'secret';
  return {
    key: def.key,
    label: def.label,
    description: def.description,
    kind: def.kind,
    value: isSecret ? null : row ? parseStored(def, stored) : def.default,
    hasValue: isSecret ? !!stored : row !== undefined,
    isDefault: row === undefined,
    options: def.options ?? null,
    min: def.min ?? null,
    max: def.max ?? null,
    unit: def.unit ?? null,
    updatedAt: (row?.updatedAt as Date | undefined) ?? null,
  };
};

const loadRows = async (categories: string[]) => {
  const rows = await models.Setting.findAll({ where: { category: { [Op.in]: categories } } });
  return new Map(rows.map((r) => [`${r.category}.${r.key}`, r]));
};

const toGroup = (category: (typeof CATALOG)[number], rows: Map<string, Row>) => ({
  category: category.key,
  label: category.label,
  description: category.description,
  settings: category.settings.map((def) => toSetting(def, rows.get(`${category.key}.${def.key}`))),
});

export const listSettings = async () => {
  const rows = await loadRows(CATALOG.map((c) => c.key));
  return CATALOG.map((c) => toGroup(c, rows));
};

export const getCategory = async (key: string) => {
  const category = findCategory(key);
  if (!category) throw notFound('Settings group');
  return toGroup(category, await loadRows([key]));
};

const assertPpeItemsExist = async (ids: string[]) => {
  if (ids.length === 0) return;
  const found = await models.PPEItem.count({ where: { id: { [Op.in]: ids } } });
  if (found !== new Set(ids).size) {
    throw new ZodError([
      { code: 'custom', path: ['allowedAdditionalItemIds'], message: 'Some of these items are no longer in the catalogue' },
    ]);
  }
};

/** Re-arms the daily backup job so schedule changes apply without a restart. */
const applyBackupSchedule = async () => {
  if (config.env === 'test') return;
  const database = await getCategory('database');
  const value = (key: string) => database.settings.find((s) => s.key === key)?.value;
  try {
    if (value('autoBackup')) {
      backupHelper.scheduleBackup(String(value('backupTime')), {
        backupPath: await backupPath(),
        retentionDays: Number(value('backupRetention')),
      });
    } else {
      backupHelper.stopScheduledBackup();
    }
  } catch (err) {
    logger.error({ err }, 'Could not reschedule automatic backups');
  }
};

export const updateCategory = async (req: Request, key: string, body: unknown, userId: string) => {
  const category = findCategory(key);
  if (!category) throw notFound('Settings group');
  const values = categoryBody(category).parse(body) as Record<string, SettingValue | undefined>;
  if (Array.isArray(values.allowedAdditionalItemIds)) await assertPpeItemsExist(values.allowedAdditionalItemIds);

  const changed = await inTransaction(async (t) => {
    const keys: string[] = [];
    for (const def of category.settings) {
      const value = values[def.key];
      if (value === undefined) continue;
      const next = serialize(def, value);
      const row = await models.Setting.findOne({
        where: { category: key, key: def.key },
        lock: { level: t.LOCK.UPDATE, of: models.Setting },
        transaction: t,
      });
      if (row && row.value === next) continue;
      const fields = { value: next, valueType: storedTypeOf(def), isSecret: def.kind === 'secret', updatedBy: userId };
      if (row) await row.update(fields, { transaction: t });
      else await models.Setting.create({ category: key, key: def.key, description: def.description, ...fields }, { transaction: t });
      keys.push(def.key);
    }
    return keys;
  });

  if (changed.length > 0) {
    await audit(req, 'SETTINGS_UPDATE', 'Settings', null, { category: key, updatedKeys: changed });
    if (key === 'database') await applyBackupSchedule();
  }
  return getCategory(key);
};

/** Active PPE items for the additional-items picker. */
export const ppeItemOptions = async () => {
  const rows = await models.PPEItem.findAll({
    where: { isActive: { [Op.ne]: false } },
    attributes: ['id', 'name', 'itemCode'],
    order: [['name', 'ASC']],
  });
  return rows.map((r) => ({ id: r.id as string, name: r.itemCode ? `${r.name} (${r.itemCode})` : (r.name as string) }));
};
