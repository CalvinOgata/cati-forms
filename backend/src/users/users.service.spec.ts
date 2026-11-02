import { ConflictException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { resetDatabase } from '../../test/database.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SAMPLE_USER, UsersService } from './users.service.js';

/**
 * Starts the service on the test database, like the app does on boot
 * (onModuleInit creates the sample user). `reset` empties the database first.
 */
async function startModule(reset = false): Promise<TestingModule> {
  const module = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
    providers: [UsersService],
  }).compile();
  if (reset) await resetDatabase(module.get(PrismaService));
  return module.init();
}

describe('UsersService', () => {
  let module: TestingModule;
  let service: UsersService;

  beforeEach(async () => {
    module = await startModule(true);
    service = module.get(UsersService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('creates the sample user on startup', async () => {
    expect(await service.findByUsername(SAMPLE_USER.username)).not.toBeNull();
    expect(
      await service.verifyCredentials(
        SAMPLE_USER.username,
        SAMPLE_USER.password,
      ),
    ).not.toBeNull();
  });

  it('keeps users across restarts, without duplicating the sample user', async () => {
    const ana = await service.create('Ana', 'segredo123');
    await module.close();

    module = await startModule();
    service = module.get(UsersService);
    expect(await service.findById(ana.id)).toMatchObject({ username: 'Ana' });
    const prisma = module.get(PrismaService);
    expect(await prisma.user.count()).toBe(2);
  });

  it('stores a salted hash, never the password itself (RNF05)', async () => {
    const a = await service.create('ana', 'segredo123');
    const b = await service.create('bia', 'segredo123');

    expect(a.passwordHash).not.toContain('segredo123');
    // Same password, different random salt: different hashes.
    expect(a.passwordHash).not.toBe(b.passwordHash);
  });

  it('rejects duplicate usernames regardless of case (RN01)', async () => {
    const maria = await service.create('Maria', 'segredo123');
    expect(maria.username).toBe('Maria');

    await expect(service.create('maria', 'outra123')).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.create('MARIA', 'outra123')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('lets only one of two simultaneous sign-ups with the same name through', async () => {
    const results = await Promise.allSettled([
      service.create('joana', 'segredo123'),
      service.create('Joana', 'segredo123'),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    const failure = results.find((r) => r.status === 'rejected');
    expect(failure?.reason).toBeInstanceOf(ConflictException);
  });

  it('verifies credentials', async () => {
    await service.create('joao', 'segredo123');

    expect(
      await service.verifyCredentials('joao', 'segredo123'),
    ).not.toBeNull();
    expect(
      await service.verifyCredentials('JOAO', 'segredo123'),
    ).not.toBeNull();
    expect(await service.verifyCredentials('joao', 'errada')).toBeNull();
    expect(await service.verifyCredentials('ninguem', 'segredo123')).toBeNull();
  });
});
