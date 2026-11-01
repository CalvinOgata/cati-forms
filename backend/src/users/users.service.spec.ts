import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SAMPLE_USER, UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();
    await module.init(); // runs onModuleInit, which creates the sample user

    service = module.get(UsersService);
  });

  it('creates the sample user on startup', async () => {
    expect(service.findByUsername(SAMPLE_USER.username)).toBeDefined();
    expect(
      await service.verifyCredentials(
        SAMPLE_USER.username,
        SAMPLE_USER.password,
      ),
    ).not.toBeNull();
  });

  it('stores a salted hash, never the password itself (RNF05)', async () => {
    const a = await service.create('ana', 'segredo123');
    const b = await service.create('bia', 'segredo123');

    expect(a.passwordHash).not.toContain('segredo123');
    // Same password, different random salt: different hashes.
    expect(a.passwordHash).not.toBe(b.passwordHash);
  });

  it('rejects duplicate usernames regardless of case (RN01)', async () => {
    await service.create('Maria', 'segredo123');

    await expect(service.create('maria', 'outra123')).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.create('MARIA', 'outra123')).rejects.toBeInstanceOf(
      ConflictException,
    );
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
