import type { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * The database the tests use: DATABASE_URL with "_test" appended to the
 * database name, so running the tests never touches development data.
 * TEST_DATABASE_URL overrides it.
 */
export function testDatabaseUrl(): string {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: the variables must come from the environment.
  }
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set (see backend/.env.example).');
  }
  const parsed = new URL(url);
  parsed.pathname += '_test';
  return parsed.toString();
}

/**
 * Empties every table, so each test starts from a blank database. Refuses to
 * run on a database whose name doesn't end in "_test".
 */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const [{ name }] = await prisma.$queryRaw<{ name: string }[]>`
    SELECT current_database() AS name`;
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to erase "${name}": not a test database.`);
  }

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
}
