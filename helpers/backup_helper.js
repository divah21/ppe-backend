const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

// Database configuration
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.DB_NAME || 'ppe_db';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

// Default backup directory
const DEFAULT_BACKUP_PATH = path.join(__dirname, '..', 'backups');

// Store reference to scheduled job
let scheduledBackupJob = null;

/**
 * Find PostgreSQL bin directory on Windows
 */
function findPgBinPath() {
  // Common PostgreSQL installation paths on Windows
  const possiblePaths = [
    process.env.PG_BIN_PATH, // Allow override via env variable
    'C:\\Program Files\\PostgreSQL\\17\\bin',
    'C:\\Program Files\\PostgreSQL\\16\\bin',
    'C:\\Program Files\\PostgreSQL\\15\\bin',
    'C:\\Program Files\\PostgreSQL\\14\\bin',
    'C:\\Program Files\\PostgreSQL\\13\\bin',
    'C:\\Program Files\\PostgreSQL\\12\\bin',
    'C:\\Program Files (x86)\\PostgreSQL\\17\\bin',
    'C:\\Program Files (x86)\\PostgreSQL\\16\\bin',
    'C:\\Program Files (x86)\\PostgreSQL\\15\\bin',
    // Add more paths if needed
  ].filter(Boolean);

  for (const pgPath of possiblePaths) {
    const pgDumpPath = path.join(pgPath, 'pg_dump.exe');
    if (fs.existsSync(pgDumpPath)) {
      console.log(`📍 Found PostgreSQL at: ${pgPath}`);
      return pgPath;
    }
  }

  // Fallback: assume it's in PATH
  return null;
}

// Cache the PostgreSQL bin path
let pgBinPath = null;

/**
 * Get the full path to a PostgreSQL command
 */
function getPgCommand(command) {
  if (pgBinPath === null) {
    pgBinPath = findPgBinPath();
  }

  if (pgBinPath) {
    return path.join(pgBinPath, process.platform === 'win32' ? `${command}.exe` : command);
  }

  // Return just the command name, hoping it's in PATH
  return command;
}

/**
 * Ensure backup directory exists
 */
function ensureBackupDirectory(backupPath) {
  const fullPath = path.resolve(backupPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created backup directory: ${fullPath}`);
  }
  return fullPath;
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename() {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  return `ppe_backup_${timestamp}.sql`;
}

/**
 * Perform database backup using pg_dump
 */
async function performBackup(options = {}) {
  const backupPath = ensureBackupDirectory(options.backupPath || DEFAULT_BACKUP_PATH);
  const filename = generateBackupFilename();
  const fullPath = path.join(backupPath, filename);

  return new Promise((resolve, reject) => {
    // Set PGPASSWORD environment variable for authentication
    const env = { ...process.env, PGPASSWORD: DB_PASSWORD };

    // Get the full path to pg_dump
    const pgDumpCmd = getPgCommand('pg_dump');

    // Build pg_dump command
    const pgDumpArgs = [
      '-h', DB_HOST,
      '-p', DB_PORT,
      '-U', DB_USER,
      '-d', DB_NAME,
      '-F', 'p', // Plain text SQL format
      '-f', fullPath,
      '--no-owner',
      '--no-acl',
      '--verbose'
    ];

    console.log(`🔄 Starting database backup...`);
    console.log(`   Database: ${DB_NAME}`);
    console.log(`   Output: ${fullPath}`);
    console.log(`   Using: ${pgDumpCmd}`);

    const pgDump = spawn(pgDumpCmd, pgDumpArgs, { env });

    let stderr = '';

    pgDump.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pgDump.on('close', (code) => {
      if (code === 0) {
        // Get file size
        const stats = fs.statSync(fullPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`✅ Backup completed successfully!`);
        console.log(`   File: ${filename}`);
        console.log(`   Size: ${fileSizeMB} MB`);

        resolve({
          success: true,
          filename,
          path: fullPath,
          size: stats.size,
          sizeMB: fileSizeMB,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error(`❌ Backup failed with exit code ${code}`);
        console.error(stderr);
        reject(new Error(`pg_dump failed with exit code ${code}: ${stderr}`));
      }
    });

    pgDump.on('error', (error) => {
      console.error(`❌ Backup error: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Restore database from backup file
 */
async function restoreBackup(backupFilePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(backupFilePath)) {
      return reject(new Error(`Backup file not found: ${backupFilePath}`));
    }

    const env = { ...process.env, PGPASSWORD: DB_PASSWORD };

    // Get the full path to psql
    const psqlCmd = getPgCommand('psql');

    const psqlArgs = [
      '-h', DB_HOST,
      '-p', DB_PORT,
      '-U', DB_USER,
      '-d', DB_NAME,
      '-f', backupFilePath,
      '--single-transaction'
    ];

    console.log(`🔄 Starting database restore...`);
    console.log(`   From: ${backupFilePath}`);
    console.log(`   Using: ${psqlCmd}`);

    const psql = spawn(psqlCmd, psqlArgs, { env });

    let stderr = '';

    psql.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    psql.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Restore completed successfully!`);
        resolve({
          success: true,
          restoredFrom: backupFilePath,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error(`❌ Restore failed with exit code ${code}`);
        reject(new Error(`psql restore failed: ${stderr}`));
      }
    });

    psql.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * List available backups
 */
function listBackups(backupPath = DEFAULT_BACKUP_PATH) {
  const fullPath = path.resolve(backupPath);
  
  if (!fs.existsSync(fullPath)) {
    return [];
  }

  const files = fs.readdirSync(fullPath)
    .filter(f => f.startsWith('ppe_backup_') && f.endsWith('.sql'))
    .map(filename => {
      const filePath = path.join(fullPath, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        path: filePath,
        size: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  return files;
}

/**
 * Delete old backups based on retention policy
 */
function cleanupOldBackups(retentionDays = 30, backupPath = DEFAULT_BACKUP_PATH) {
  const backups = listBackups(backupPath);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  let deletedCount = 0;

  backups.forEach(backup => {
    if (backup.createdAt < cutoffDate) {
      try {
        fs.unlinkSync(backup.path);
        console.log(`🗑️  Deleted old backup: ${backup.filename}`);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete ${backup.filename}: ${error.message}`);
      }
    }
  });

  return deletedCount;
}

/**
 * Schedule automatic backup at specified time
 * @param {string} time - Time in HH:MM format (24-hour)
 * @param {object} options - Backup options
 */
function scheduleBackup(time = '18:00', options = {}) {
  // Cancel existing scheduled job if any
  if (scheduledBackupJob) {
    scheduledBackupJob.stop();
    console.log('⏹️  Cancelled previous backup schedule');
  }

  const [hours, minutes] = time.split(':').map(Number);
  
  // Validate time
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time format: ${time}. Use HH:MM format.`);
  }

  // Create cron expression: minute hour * * * (runs daily at specified time)
  const cronExpression = `${minutes} ${hours} * * *`;

  console.log(`⏰ Scheduling daily backup at ${time}`);
  console.log(`   Cron expression: ${cronExpression}`);

  scheduledBackupJob = cron.schedule(cronExpression, async () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🕐 Scheduled backup started at ${new Date().toISOString()}`);
    console.log(`${'='.repeat(50)}`);

    try {
      const result = await performBackup(options);
      
      // Cleanup old backups if retention is specified
      if (options.retentionDays) {
        const deleted = cleanupOldBackups(options.retentionDays, options.backupPath);
        if (deleted > 0) {
          console.log(`🧹 Cleaned up ${deleted} old backup(s)`);
        }
      }

      console.log(`${'='.repeat(50)}\n`);
      return result;
    } catch (error) {
      console.error(`Scheduled backup failed: ${error.message}`);
      console.log(`${'='.repeat(50)}\n`);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'Africa/Johannesburg'
  });

  return scheduledBackupJob;
}

/**
 * Stop scheduled backup
 */
function stopScheduledBackup() {
  if (scheduledBackupJob) {
    scheduledBackupJob.stop();
    scheduledBackupJob = null;
    console.log('⏹️  Stopped scheduled backup');
    return true;
  }
  return false;
}

/**
 * Get next scheduled backup time
 */
function getNextBackupTime() {
  if (!scheduledBackupJob) {
    return null;
  }
  // node-cron doesn't provide next run time directly, but we can calculate it
  return 'Next run at scheduled time';
}

/**
 * Delete a specific backup file
 */
function deleteBackup(filename, backupPath = DEFAULT_BACKUP_PATH) {
  const fullPath = path.resolve(backupPath);
  const filePath = path.join(fullPath, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file not found: ${filename}`);
  }

  // Security check - ensure the file is within backup directory
  if (!filePath.startsWith(fullPath)) {
    throw new Error('Invalid backup file path');
  }

  fs.unlinkSync(filePath);
  console.log(`🗑️  Deleted backup: ${filename}`);
  return true;
}

module.exports = {
  performBackup,
  restoreBackup,
  listBackups,
  cleanupOldBackups,
  scheduleBackup,
  stopScheduledBackup,
  getNextBackupTime,
  deleteBackup,
  ensureBackupDirectory,
  DEFAULT_BACKUP_PATH
};
