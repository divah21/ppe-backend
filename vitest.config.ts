import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    environment: 'node',
    // Tests share one local database; run files one at a time
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
