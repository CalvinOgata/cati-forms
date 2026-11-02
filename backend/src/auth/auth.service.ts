import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService, type User } from '../users/users.service.js';

export interface Session {
  token: string;
  user: User;
}

@Injectable()
export class AuthService {
  // Active sessions: random token → user id. In memory, so a server restart
  // logs everyone out; the accounts themselves are in the database.
  private readonly sessions = new Map<string, string>();

  constructor(private readonly users: UsersService) {}

  /** Creates the account (RF01) and logs it in right away. */
  async signup(username: string, password: string): Promise<Session> {
    const user = await this.users.create(username, password);
    return this.startSession(user);
  }

  /** RF02: login. The same message for unknown user and wrong password. */
  async login(username: string, password: string): Promise<Session> {
    const user = await this.users.verifyCredentials(username, password);
    if (!user) {
      throw new UnauthorizedException('Usuário ou senha incorretos.');
    }
    return this.startSession(user);
  }

  /** RF02: logout. Unknown or missing tokens are ignored. */
  logout(token: string | undefined): void {
    if (token) this.sessions.delete(token);
  }

  /** The user a session token belongs to, if the session is still active. */
  async userForToken(token: string | undefined): Promise<User | null> {
    const userId = token ? this.sessions.get(token) : undefined;
    return userId ? this.users.findById(userId) : null;
  }

  private startSession(user: User): Session {
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(token, user.id);
    return { token, user };
  }
}
