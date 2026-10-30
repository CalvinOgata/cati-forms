import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Every route lives under /api so the frontend can proxy a single prefix.
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const corsOrigin = config.get<string>('CORS_ORIGIN');
  if (corsOrigin) {
    app.enableCors({ origin: corsOrigin.split(','), credentials: true });
  }

  await app.listen(config.get<number>('PORT', 3000));
}
await bootstrap();
