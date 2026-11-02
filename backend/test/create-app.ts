import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { resetDatabase } from './database.js';

/**
 * Boots a fresh app, configured exactly like main.ts, on an empty test
 * database (startup then creates the sample data again). `keepData` skips
 * emptying it, to check what survives a restart.
 */
export async function createTestApp({ keepData = false } = {}): Promise<
  INestApplication<App>
> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  if (!keepData) await resetDatabase(moduleFixture.get(PrismaService));

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}
