import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService, type User } from '../users/users.service.js';

export interface Session { // dados do Usuário utilizados para manter a sessão em pé
  token: string;
  user: User;
}

@Injectable()
export class AuthService {
  // sessões ativas são mantidas na memória, baseado no usuário e no seu token, enquanto os dados são mantidos no banco de dados
  private readonly sessions = new Map<string, string>();

  constructor(private readonly users: UsersService) {}

  // cria a conta e loga o usuário direto (RF01)
  async signup(username: string, password: string): Promise<Session> {
    const user = await this.users.create(username, password);
    return this.startSession(user);
  }

  // login baseado no usuário e senha (RF02)
  async login(username: string, password: string): Promise<Session> {
    const user = await this.users.verifyCredentials(username, password);
    if (!user) {
      throw new UnauthorizedException('Usuário ou senha incorretos.');
    }
    return this.startSession(user);
  }

  // logout, token é deletado (RF02)
  logout(token: string | undefined): void {
    if (token) this.sessions.delete(token);
  }

  // indica para qual usuário um token de sessão pertence, se a sessão continuar ativa (salva na memória)
  async userForToken(token: string | undefined): Promise<User | null> {
    const userId = token ? this.sessions.get(token) : undefined;
    return userId ? this.users.findById(userId) : null;
  }

  // gera o token de dessão e associa ao usuário
  private startSession(user: User): Session {
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(token, user.id);
    return { token, user };
  }
}
