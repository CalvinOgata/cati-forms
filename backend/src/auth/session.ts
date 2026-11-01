import type { CookieOptions, Request } from 'express';
import type { User } from '../users/users.service.js';

/** Name of the cookie that carries the session token. */
export const SESSION_COOKIE = 'session';

// httpOnly: page scripts can't read the token. sameSite 'lax': other sites can't
// send requests with it. No maxAge: the cookie ends when the browser closes.
export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
};

/** A request that passed AuthGuard, which attaches the logged-in user. */
export interface AuthenticatedRequest extends Request {
  user: User;
}
