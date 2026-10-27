import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, type ZodRawShape, type ZodTypeAny } from 'zod';

/** Wraps an async handler so thrown errors reach the v2 error handler. */
export const route =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

/** Throws a ZodError (422) when the input does not match. */
export const parse = <S extends ZodTypeAny>(schema: S, input: unknown): z.infer<S> => schema.parse(input);

export const uuidParam = z.object({ id: z.string().uuid() });

export const MAX_PAGE_SIZE = 100;

/**
 * Standard list query: ?page=&pageSize=&sort=&order=&q= plus module-specific filters.
 * `sortable` is the allowlist of sort keys a client may ask for.
 */
export const listQuery = <K extends string, X extends ZodRawShape = {}>(sortable: readonly [K, ...K[]], extra?: X) =>
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
    sort: z.enum(sortable).optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
    q: z.string().trim().max(100).optional(),
    ...(extra ?? ({} as X)),
  });

export const pageWindow = ({ page, pageSize }: { page: number; pageSize: number }) => ({
  limit: pageSize,
  offset: (page - 1) * pageSize,
});

/** { data } envelope for single resources and actions. */
export const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ data });

/** { data, meta } envelope for paginated lists. */
export const paged = (
  res: Response,
  rows: unknown[],
  total: number,
  { page, pageSize }: { page: number; pageSize: number }
) => res.json({ data: rows, meta: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) } });

/** Escapes LIKE wildcards so user search text matches literally. */
export const likeTerm = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
