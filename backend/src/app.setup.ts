import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** Settings shared by the real server (main.ts) and the e2e tests. */
export function configureApp(app: INestApplication): void {
  // todas as rotas da aplicação vivem em /api, logo o frotend pode apenas pedir um prefixo pro proxy
  app.setGlobalPrefix('api');

  // usa cookies para manter a sessão ativa
  app.use(cookieParser());

  // valida os "body" das requests para garantir que partes não abertas do site não fiquem expostas usando DTOs
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
}
