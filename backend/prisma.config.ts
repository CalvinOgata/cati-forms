import { defineConfig } from 'prisma/config';

// Prisma 7 doesn't read .env by itself. Variables already set (as in CI) win,
// and a missing .env is fine: `prisma generate` doesn't need DATABASE_URL.
try {
  process.loadEnvFile();
} catch {
  // No .env file.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
