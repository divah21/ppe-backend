import { AppError } from '../../core/errors';
import { models, type Row } from '../../core/db';

/** A 422 that the form shows next to one field. */
export const fieldError = (field: string, message: string) =>
  new AppError('VALIDATION_FAILED', message, { fieldErrors: { [field]: [message] } });

export const personInclude = (as: string) => ({
  model: models.User,
  as,
  attributes: ['id', 'username'],
  include: [{ model: models.Employee, as: 'employee', attributes: ['firstName', 'lastName'] }],
});

export const toPerson = (u: Row | null | undefined) =>
  u
    ? {
        id: u.id as string,
        name: u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : (u.username as string),
      }
    : null;

export const toRef = (r: Row | null | undefined) => (r ? { id: r.id as string, name: r.name as string } : null);

/** Day bounds for ?from=&to= (inclusive dates). */
export const dayStart = (d: string) => new Date(`${d}T00:00:00`);
export const dayAfter = (d: string) => {
  const date = dayStart(d);
  date.setDate(date.getDate() + 1);
  return date;
};

/** Quantity in stock: the item's first stock record, the one receipts and issues use. */
export const STOCK_ON_HAND = (itemIdSql: string) =>
  `(SELECT s.quantity FROM consumable_stocks s WHERE s.consumable_item_id = ${itemIdSql} ORDER BY s.created_at ASC LIMIT 1)`;
