import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** Settings shared by the real server (main.ts) and the e2e tests. */
export function configureApp(app: INestApplication): void {
  // Every route lives under /api so the frontend can proxy a single prefix.
  app.setGlobalPrefix('api');

  // Fills req.cookies, where the session token lives.
  app.use(cookieParser());

  // Validates request bodies against their DTO classes; unknown fields are rejected.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
}
