import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { SAMPLE_USER } from './../src/users/users.service.js';
import { createTestApp } from './create-app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('logs in with the sample user, reads the session, and logs out', async () => {
    // An agent keeps cookies between requests, like a browser.
    const agent = request.agent(app.getHttpServer());

    const login = await agent
      .post('/api/auth/login')
      .send(SAMPLE_USER)
      .expect(200);
    expect(login.body).toEqual({
      username: 'admin',
      createdAt: expect.any(String),
    });
    expect(login.headers['set-cookie']?.[0]).toMatch(/^session=.+HttpOnly/);

    await agent
      .get('/api/auth/me')
      .expect(200)
      .expect((res) => expect(res.body.username).toBe('admin'));

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('signs up a new user and logs them in right away', async () => {
    const agent = request.agent(app.getHttpServer());

    const signup = await agent
      .post('/api/auth/signup')
      .send({ username: 'maria', password: 'segredo123' })
      .expect(201);
    expect(signup.body.username).toBe('maria');

    await agent
      .get('/api/auth/me')
      .expect(200)
      .expect((res) => expect(res.body.username).toBe('maria'));

    // The new account also works for a later login.
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'maria', password: 'segredo123' })
      .expect(200);
  });

  it('keeps accounts across a restart, but not sessions', async () => {
    const signup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ username: 'maria', password: 'segredo123' })
      .expect(201);
    const cookie = signup.headers['set-cookie'];

    await app.close();
    app = await createTestApp({ keepData: true });

    // Sessions live in memory (RNF06), so the old cookie no longer works...
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(401);
    // ...but the account is in the database.
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'maria', password: 'segredo123' })
      .expect(200);
  });

  it('rejects a username that is already taken, ignoring case (RN01)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ username: 'ADMIN', password: 'outrasenha' })
      .expect(409);
    expect(res.body.message).toBe('Este nome de usuário já está em uso.');
  });

  it('rejects a wrong password and an unknown user with the same message', async () => {
    const server = app.getHttpServer();
    const wrongPassword = await request(server)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'errada' })
      .expect(401);
    const unknownUser = await request(server)
      .post('/api/auth/login')
      .send({ username: 'ninguem', password: 'qualquer' })
      .expect(401);
    expect(wrongPassword.body.message).toBe('Usuário ou senha incorretos.');
    expect(unknownUser.body.message).toBe(wrongPassword.body.message);
  });

  it('validates the sign-up body', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post('/api/auth/signup')
      .send({ username: 'ab', password: '123' })
      .expect(400)
      .expect((res) =>
        expect(res.body.message).toEqual([
          'O nome de usuário deve ter entre 3 e 32 caracteres.',
          'A senha deve ter entre 6 e 128 caracteres.',
        ]),
      );
    await request(server)
      .post('/api/auth/signup')
      .send({ username: 'joao', password: 'segredo123', isAdmin: true })
      .expect(400);
  });

  it('never returns the password or its hash', async () => {
    const agent = request.agent(app.getHttpServer());
    const responses = [
      await agent
        .post('/api/auth/signup')
        .send({ username: 'ana', password: 'segredo123' }),
      await agent
        .post('/api/auth/login')
        .send({ username: 'ana', password: 'segredo123' }),
      await agent.get('/api/auth/me'),
    ];
    for (const res of responses) {
      expect(res.text).not.toContain('segredo123');
      expect(Object.keys(res.body).sort()).toEqual(['createdAt', 'username']);
    }
  });

  it('requires a session for /api/auth/me', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
