import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './test/database.js';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Every test file shares the test database, so they run one at a time.
    env: { DATABASE_URL: testDatabaseUrl() },
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
  },
});
