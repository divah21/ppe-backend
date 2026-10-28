import 'dotenv/config';
import { register } from 'tsx/cjs/api';

process.env.NODE_ENV = 'test';

// app.js is CommonJS and require()s src/v2.ts natively, outside Vite's transform
register();

// These tests write and delete rows. Never let them near a shared or production database.
const host = process.env.DB_HOST ?? '';
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error(`Refusing to run tests against DB_HOST=${host || '(unset)'}; use a local database`);
}
