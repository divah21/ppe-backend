import type { Router } from 'express';

/**
 * A v2 feature module. Each folder in src/modules exports one of these from index.ts and is
 * mounted automatically at /api/v2<path>, so modules never edit a shared registry.
 */
export interface V2Module {
  path: `/${string}`;
  router: Router;
}

export const defineModule = (module: V2Module) => module;
