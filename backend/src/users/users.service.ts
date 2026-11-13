import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, type User } from '../generated/prisma/client.js';
import { newId } from '../prisma/new-id.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword, verifyPassword } from './password.js';

export type { User };

// o que a API retorna a cerca do usuário, apenas o nome e data de criação, nada da senha
export interface PublicUser {
  username: string;
  createdAt: string;
}

// usuário de exemplo criado sempre na aplicação
export const SAMPLE_USER = { username: 'admin', password: 'admin123' } as const;

export function toPublicUser(user: User): PublicUser {
  return { username: user.username, createdAt: user.createdAt.toISOString() };
}

// usernameKey é sempre armazenado de forma minuscula, dessa forma "lucas", "LUCAS", "Lucas", ou "LuCaS", são todos o mesmo nome
function usernameKey(username: string): string {
  return username.toLowerCase();
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.sampleUser();
  }

  // usuário de exemplo é criado
  async sampleUser(): Promise<User> {
    const existing = await this.findByUsername(SAMPLE_USER.username); // verifica primeiro se ele existe no banco de dados (função nas linhas abaixo)
    if (existing) return existing; // se existir, não crie
    try {
      return await this.create(SAMPLE_USER.username, SAMPLE_USER.password); // cria a usuário
    } catch (error) { // alguém criou durante as requests
      if (!(error instanceof ConflictException)) throw error;
      return (await this.findByUsername(SAMPLE_USER.username))!;
    }
  }

  // RF01, registra um novo usuário na plataforma e retorna um erro se o nome já está em uso
  async create(username: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password); // faz hash da senha
    try {
      return await this.prisma.user.create({ // cria novo usuário no schema do Prisma
        data: {
          id: newId(), // gera número de id único pelo Prisma
          username, // nome do usuário como ele digitou apenas para demonstração
          usernameKey: usernameKey(username), // maneira que o banco de dados armazena, sempre de forma minuscula
          passwordHash,
        },
      });
    } catch (error) { // como a usernameKey é única, ela irá detectar duplicatas e soltar um erro
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Este nome de usuário já está em uso.');
      }
      throw error;
    }
  }

  findByUsername(username: string): Promise<User | null> { // função para procurar no banco de dados por um nome de usuário (usernameKey)
    return this.prisma.user.findUnique({
      where: { usernameKey: usernameKey(username) },
    });
  }

  findById(id: string): Promise<User | null> { // função para procurar no banco de dados por um id (usado para tokenização)
    return this.prisma.user.findUnique({ where: { id } });
  }

  // verifica as credenciais do usuário caso o nome e a senha estejam corretos
  async verifyCredentials(
    username: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.findByUsername(username); // verifica se o nome existe dentro do banco de dados
    if (!user || !(await verifyPassword(password, user.passwordHash))) { // usa função para verificar o hash da senha
      return null;
    }
    return user;
  }
}
