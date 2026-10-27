import type { Request } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { audit } from '../../core/audit';
import { models } from '../../core/db';
import { AppError, conflict, notFound } from '../../core/errors';
import { logger } from '../../core/logger';

interface BackupFile {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
}

interface BackupHelper {
  DEFAULT_BACKUP_PATH: string;
  listBackups(backupPath: string): BackupFile[];
  performBackup(options: { backupPath: string }): Promise<{ filename: string; size: number; timestamp: string }>;
  scheduleBackup(time: string, options: { backupPath: string; retentionDays: number }): unknown;
  stopScheduledBackup(): boolean;
}

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
export const backupHelper: BackupHelper = require('../../../helpers/backup_helper');

export const BACKUP_FILENAME = /^ppe_backup_[0-9A-Za-z_-]+\.sql$/;

/** The folder the scheduler writes to: database.backupPath when set on the server, else ./backups. */
export const backupPath = async () => {
  const row = await models.Setting.findOne({ where: { category: 'database', key: 'backupPath' } });
  return path.resolve((row?.value as string | null) || backupHelper.DEFAULT_BACKUP_PATH);
};

const toBackup = (b: { filename: string; size: number; createdAt: Date | string }) => ({
  filename: b.filename,
  sizeBytes: b.size,
  createdAt: new Date(b.createdAt).toISOString(),
});

export const listBackups = async () => backupHelper.listBackups(await backupPath()).map(toBackup);

let running = false;

export const createBackup = async (req: Request) => {
  if (running) throw conflict('A backup is already running. Try again when it finishes.');
  running = true;
  try {
    const result = await backupHelper.performBackup({ backupPath: await backupPath() });
    await audit(req, 'BACKUP_CREATE', 'Backup', null, { filename: result.filename, sizeBytes: result.size });
    return toBackup({ filename: result.filename, size: result.size, createdAt: result.timestamp });
  } catch (err) {
    logger.error({ err }, 'Manual backup failed');
    throw new AppError('INTERNAL', 'The backup could not be created. Check that the PostgreSQL tools are installed on the server.');
  } finally {
    running = false;
  }
};

export const backupRunning = () => running;

/** Absolute path of a backup in the backup folder; anything else is not found. */
export const resolveBackup = async (filename: string) => {
  const dir = await backupPath();
  const file = path.resolve(dir, filename);
  if (!BACKUP_FILENAME.test(filename) || path.dirname(file) !== dir || !fs.existsSync(file)) throw notFound('Backup');
  return file;
};
