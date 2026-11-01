import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE, type AuthenticatedRequest } from './session.js';

/**
 * Lets a request through only with a valid session cookie, and attaches the
 * user as `req.user`. Use with `@UseGuards(AuthGuard)` on routes that require
 * login (RN03).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = this.auth.userForToken(req.cookies?.[SESSION_COOKIE]);
    if (!user) {
      throw new UnauthorizedException('Faça login para continuar.');
    }
    req.user = user;
    return true;
  }
}
