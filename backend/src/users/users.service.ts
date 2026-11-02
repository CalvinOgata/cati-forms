import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, type User } from '../generated/prisma/client.js';
import { newId } from '../prisma/new-id.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword, verifyPassword } from './password.js';

export type { User };

/** What the API returns about a user: never the password or its hash. */
export interface PublicUser {
  username: string;
  createdAt: string;
}

/** Created on startup if missing, so there is always an account to log in with. */
export const SAMPLE_USER = { username: 'admin', password: 'admin123' } as const;

export function toPublicUser(user: User): PublicUser {
  return { username: user.username, createdAt: user.createdAt.toISOString() };
}

/** "Admin" and "admin" are the same user (RN01): the database keys users by this. */
function usernameKey(username: string): string {
  return username.toLowerCase();
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    if (!(await this.findByUsername(SAMPLE_USER.username))) {
      await this.create(SAMPLE_USER.username, SAMPLE_USER.password);
    }
  }

  /** Registers a user (RF01). Throws 409 Conflict if the username is taken. */
  async create(username: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password);
    try {
      return await this.prisma.user.create({
        data: {
          id: newId(),
          username,
          usernameKey: usernameKey(username),
          passwordHash,
        },
      });
    } catch (error) {
      // The unique index on username_key turns away a taken name, even when
      // two sign-ups with the same name arrive at once.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Este nome de usuário já está em uso.');
      }
      throw error;
    }
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { usernameKey: usernameKey(username) },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Returns the user if the username exists and the password matches. */
  async verifyCredentials(
    username: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.findByUsername(username);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return null;
    }
    return user;
  }
}
