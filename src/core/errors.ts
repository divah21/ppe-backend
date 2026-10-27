import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_TRANSITION'
  | 'INSUFFICIENT_STOCK'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  PASSWORD_CHANGE_REQUIRED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_TRANSITION: 409,
  INSUFFICIENT_STOCK: 409,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.status = STATUS[code];
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError('BAD_REQUEST', message, details);
export const forbidden = (message = 'You do not have access to this resource') => new AppError('FORBIDDEN', message);
export const notFound = (entity: string) => new AppError('NOT_FOUND', `${entity} not found`);
export const conflict = (message: string, details?: unknown) => new AppError('CONFLICT', message, details);

export const notFoundHandler: RequestHandler = (req, _res, next) =>
  next(new AppError('NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`));

/** Every v2 error leaves as { error: { code, message, details? } }. Internals are never leaked. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: { code: 'VALIDATION_FAILED', message: 'Some fields are invalid', details: err.flatten() },
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err?.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with these details already exists' } });
  }
  if (err?.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'This record is still referenced elsewhere' } });
  }
  logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled error');
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
};
