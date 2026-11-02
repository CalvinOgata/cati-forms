import { execFileSync } from 'node:child_process';
import { testDatabaseUrl } from './database.js';

/**
 * Runs once before the tests: creates the test database if it doesn't exist
 * and applies any pending migrations to it.
 */
export default function setup(): void {
  execFileSync('node_modules/.bin/prisma', ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    // Quiet unless it fails; the error then includes Prisma's output.
    stdio: 'pipe',
  });
}
