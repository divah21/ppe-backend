import { z } from 'zod';
import { listQuery } from '../../core/http';
import { CATEGORY_KEYS } from './catalog';
import { BACKUP_FILENAME } from './backups';

export const categoryParam = z.object({ category: z.enum(CATEGORY_KEYS) });

export const backupListQuery = listQuery(['createdAt']);

export const backupParam = z.object({ filename: z.string().regex(BACKUP_FILENAME, 'Not a backup file') });
