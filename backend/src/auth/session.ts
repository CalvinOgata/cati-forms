import type { CookieOptions, Request } from 'express';
import type { User } from '../users/users.service.js';

/** Name of the cookie that carries the session token. */
export const SESSION_COOKIE = 'session';

// httpOnly, scripts de página não conseguem ler o token
// reseta quando o browser fecha
export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
};

// uma requisição que passou pelo AuthGuard, que fixa no usuário logado
export interface AuthenticatedRequest extends Request {
  user: User;
}
