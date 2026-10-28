import type { Transaction } from 'sequelize';
import { inTransaction, sequelize } from './db';

/** Thrown to roll a checked import back. */
class Rollback extends Error {}

/**
 * Runs a spreadsheet import in one transaction and keeps it only when `keep()` says so after every
 * row has run: a dry run, or a file with any bad row, changes nothing.
 */
export const importTransaction = async (run: (t: Transaction) => Promise<void>, keep: () => boolean) => {
  try {
    await inTransaction(async (t) => {
      await run(t);
      if (!keep()) throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
};

/** Runs one row inside a savepoint, so a failure is reported for that row and the rest still run. */
export const savepoint = <T>(t: Transaction, fn: (sp: Transaction) => Promise<T>) =>
  sequelize.transaction({ transaction: t }, fn);
