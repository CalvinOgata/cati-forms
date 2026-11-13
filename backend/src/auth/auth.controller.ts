import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { toPublicUser, type PublicUser } from '../users/users.service.js';
import { LoginDto, SignupDto } from './auth.dto.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  type AuthenticatedRequest,
} from './session.js';

@Controller('auth') // utilizado em toda a parte de login, logout, signup, e na manutenção dos cookies (login automatico)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /api/auth/signup: cria uma conta e faz login direto. 409 se o nome já está pego (igualdade das senhas é feita no frontend)
  @Post('signup')
  async signup(
    @Body() body: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const { token, user } = await this.auth.signup(
      body.username,
      body.password,
    );
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
    return toPublicUser(user);
  }

  // POST /api/auth/login: 401 se o nome ou a senha está incorreta
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const { token, user } = await this.auth.login(body.username, body.password); // loga criando um token único e o nome
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
    return toPublicUser(user);
  }

  // POST /api/auth/logout: finalize a sessão e mata o cookie se há alguma
  @Post('logout')
  @HttpCode(204)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): void {
    this.auth.logout(req.cookies?.[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
  }

  // GET /api/auth/me: reentra se o usuário fez login, 401 caso contrário
  @Get('me')
  @UseGuards(AuthGuard) // usa AuthGuard para garantir que só continua se estiver logado
  me(@Req() req: AuthenticatedRequest): PublicUser {
    return toPublicUser(req.user);
  }
}
