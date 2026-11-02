import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './test/database.js';

export default defineConfig({
  resolve: {
    // Resolves the path aliases declared in tsconfig.json, including the ones
    // added by `nest g library`.
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Every test file shares the test database, so they run one at a time.
    env: { DATABASE_URL: testDatabaseUrl() },
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
  },
});
