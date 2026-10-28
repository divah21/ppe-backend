import type { Model, ModelStatic, Sequelize, Transaction } from 'sequelize';

// The Sequelize models are still JavaScript. Until they are converted, v2 sees each
// instance as a Model whose attributes are loosely typed.
export type Row = Model & Record<string, any>;
type M = ModelStatic<Row>;

interface Models {
  Role: M;
  User: M;
  Department: M;
  Section: M;
  JobTitle: M;
  CostCenter: M;
  Employee: M;
  PPEItem: M;
  SizeScale: M;
  Size: M;
  JobTitlePPEMatrix: M;
  SectionPPEMatrix: M;
  Stock: M;
  Request: M;
  RequestItem: M;
  Allocation: M;
  CompanyBudget: M;
  Budget: M;
  FailureReport: M;
  AuditLog: M;
  Document: M;
  Forecast: M;
  Setting: M;
  ConsumableItem: M;
  ConsumableStock: M;
  ConsumableRequest: M;
  ConsumableRequestItem: M;
  ConsumableAllocation: M;
}

/* eslint-disable @typescript-eslint/no-require-imports */
export const models: Models = require('../../models');
export const sequelize: Sequelize = require('../../database/db').sequelize;
/* eslint-enable @typescript-eslint/no-require-imports */

/** Runs fn in a managed transaction; it commits on return and rolls back on throw. */
export const inTransaction = <T>(fn: (t: Transaction) => Promise<T>): Promise<T> => sequelize.transaction(fn);
