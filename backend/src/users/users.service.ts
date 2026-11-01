import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { hashPassword, verifyPassword } from './password.js';

export interface User {
  username: string;
  passwordHash: string;
  createdAt: Date;
}

/** What the API returns about a user: never the password or its hash. */
export interface PublicUser {
  username: string;
  createdAt: string;
}

/** Created on startup so there is always an account to log in with. */
export const SAMPLE_USER = { username: 'admin', password: 'admin123' } as const;

export function toPublicUser(user: User): PublicUser {
  return { username: user.username, createdAt: user.createdAt.toISOString() };
}

@Injectable()
export class UsersService implements OnModuleInit {
  // In-memory storage until there is a database: everything resets on restart.
  // Keyed by the lowercased username, so "Admin" and "admin" are the same user (RN01).
  private readonly users = new Map<string, User>();

  async onModuleInit(): Promise<void> {
    await this.create(SAMPLE_USER.username, SAMPLE_USER.password);
  }

  /** Registers a user (RF01). Throws 409 Conflict if the username is taken. */
  async create(username: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password);

    // Check and insert with no `await` in between, so two simultaneous sign-ups
    // with the same name can't both succeed.
    const key = username.toLowerCase();
    if (this.users.has(key)) {
      throw new ConflictException('Este nome de usuário já está em uso.');
    }
    const user: User = { username, passwordHash, createdAt: new Date() };
    this.users.set(key, user);
    return user;
  }

  findByUsername(username: string): User | undefined {
    return this.users.get(username.toLowerCase());
  }

  /** Returns the user if the username exists and the password matches. */
  async verifyCredentials(
    username: string,
    password: string,
  ): Promise<User | null> {
    const user = this.findByUsername(username);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return null;
    }
    return user;
  }
}
