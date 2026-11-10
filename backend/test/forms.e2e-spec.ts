import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { SAMPLE_USER } from './../src/users/users.service.js';
import { createTestApp } from './create-app.js';

const NEW_FORM = {
  title: 'Pesquisa de stack',
  description: 'Linha 1\nLinha 2',
  collectEmail: true,
  questions: [
    { type: 'text', title: 'Conte sobre um projeto.', options: [] },
    { type: 'multiple_choice', title: 'Linguagens', options: ['Go', 'TS'] },
    {
      type: 'single_choice_justified',
      title: 'Front ou back?',
      options: ['Front', 'Back'],
    },
  ],
};

describe('Forms (e2e)', () => {
  let app: INestApplication<App>;
  /** Logged in as the sample user. */
  let admin: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    app = await createTestApp();
    admin = request.agent(app.getHttpServer());
    await admin.post('/api/auth/login').send(SAMPLE_USER).expect(200);
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires a login for the management routes (RN03)', async () => {
    const server = app.getHttpServer();
    await request(server).get('/api/forms').expect(401);
    await request(server).get('/api/forms/x').expect(401);
    await request(server).post('/api/forms').send(NEW_FORM).expect(401);
    await request(server).get('/api/forms/x/export.csv').expect(401);
    await request(server).get('/api/forms/x/export.pdf').expect(401);
  });

  it('creates, shares, answers and reads a form (RF03–RF09, RN10)', async () => {
    const created = await admin.post('/api/forms').send(NEW_FORM).expect(201);
    const form = created.body;
    expect(form).toMatchObject({
      title: 'Pesquisa de stack',
      collectEmail: true,
      createdBy: 'admin',
    });
    expect(form.questions).toHaveLength(3);

    // Anyone with the link: no cookie (RN09), and no responses in the payload.
    const visitor = request(app.getHttpServer());
    const shared = await visitor
      .get(`/api/public/forms/${form.id}`)
      .expect(200);
    expect(shared.body).toEqual(form);

    const [text, multiple, single] = form.questions;
    const sent = await request(app.getHttpServer())
      .post(`/api/public/forms/${form.id}/responses`)
      .send({
        email: 'joao@example.com',
        answers: [
          { questionId: text.id, choices: [], text: 'Um app.' },
          { questionId: multiple.id, choices: ['Go', 'TS'], text: '' },
          { questionId: single.id, choices: ['Back'], text: 'APIs.' },
        ],
      })
      .expect(201);
    expect(Object.keys(sent.body).sort()).toEqual(['id', 'submittedAt']);

    const list = await admin.get('/api/forms').expect(200);
    expect(list.body[0]).toMatchObject({
      id: form.id,
      questionCount: 3,
      responseCount: 1,
    });

    const detail = await admin.get(`/api/forms/${form.id}`).expect(200);
    expect(detail.body.responses).toEqual([
      {
        id: sent.body.id,
        email: 'joao@example.com',
        submittedAt: sent.body.submittedAt,
        answers: [
          { questionId: text.id, choices: [], text: 'Um app.' },
          { questionId: multiple.id, choices: ['Go', 'TS'], text: '' },
          { questionId: single.id, choices: ['Back'], text: 'APIs.' },
        ],
      },
    ]);
  });

  it('keeps forms and responses across a restart (RF12, RF13)', async () => {
    const form = (await admin.post('/api/forms').send(NEW_FORM)).body;
    const [text, multiple, single] = form.questions;
    await request(app.getHttpServer())
      .post(`/api/public/forms/${form.id}/responses`)
      .send({
        email: 'joao@example.com',
        answers: [
          { questionId: text.id, choices: [], text: 'Um app.' },
          { questionId: multiple.id, choices: ['TS'], text: '' },
          { questionId: single.id, choices: ['Front'], text: 'Gosto.' },
        ],
      })
      .expect(201);
    const before = (await admin.get(`/api/forms/${form.id}`)).body;

    await app.close();
    app = await createTestApp({ keepData: true });
    admin = request.agent(app.getHttpServer());
    await admin.post('/api/auth/login').send(SAMPLE_USER).expect(200);

    expect((await admin.get(`/api/forms/${form.id}`)).body).toEqual(before);
    // The sample form isn't created again.
    const list = await admin.get('/api/forms').expect(200);
    expect(list.body.map((f: { title: string }) => f.title)).toEqual([
      NEW_FORM.title,
      'Exemplo: inscrição no Banco de Talentos',
    ]);
  });

  it('lists the sample form created on startup', async () => {
    const list = await admin.get('/api/forms').expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({
        title: 'Exemplo: inscrição no Banco de Talentos',
        createdBy: 'admin',
        questionCount: 3,
        responseCount: 1,
      }),
    ]);
  });

  it('rejects an invalid form with messages per question', async () => {
    const res = await admin
      .post('/api/forms')
      .send({
        ...NEW_FORM,
        title: ' ',
        questions: [{ type: 'multiple_choice', title: 'Q', options: ['A'] }],
      })
      .expect(400);
    expect(res.body.message).toEqual([
      'Dê um título ao formulário.',
      'Pergunta 1: Adicione pelo menos duas opções.',
    ]);
  });

  it('rejects a malformed body before the service sees it', async () => {
    await admin
      .post('/api/forms')
      .send({
        ...NEW_FORM,
        questions: [{ type: 'scale', title: 'Q', options: [] }],
      })
      .expect(400)
      .expect((res) =>
        expect(res.body.message).toEqual([
          'questions.0.Tipo de pergunta inválido.',
        ]),
      );
    // Unknown fields, also inside questions, are refused.
    await admin
      .post('/api/forms')
      .send({ ...NEW_FORM, id: 'meu-id' })
      .expect(400);
    await admin
      .post('/api/forms')
      .send({
        ...NEW_FORM,
        questions: [{ ...NEW_FORM.questions[0], required: false }],
      })
      .expect(400);
    await admin.post('/api/forms').send({ title: 'Só título' }).expect(400);
  });

  it('has single choice questions without a justification', async () => {
    const created = await admin
      .post('/api/forms')
      .send({
        title: 'Disponibilidade',
        description: '',
        collectEmail: false,
        questions: [
          {
            type: 'single_choice',
            title: 'Turno',
            options: ['Manhã', 'Noite'],
          },
        ],
      })
      .expect(201);
    const form = created.body;
    expect(form.questions[0]).toMatchObject({
      type: 'single_choice',
      options: ['Manhã', 'Noite'],
    });

    const respond = (choices: string[]) =>
      request(app.getHttpServer())
        .post(`/api/public/forms/${form.id}/responses`)
        .send({
          answers: [{ questionId: form.questions[0].id, choices, text: '' }],
        });
    const res = await respond([]).expect(400);
    expect(res.body.message).toEqual(['Pergunta 1: Escolha uma opção.']);
    await respond(['Noite']).expect(201);

    const detail = await admin.get(`/api/forms/${form.id}`).expect(200);
    expect(detail.body.responses[0].answers).toEqual([
      { questionId: form.questions[0].id, choices: ['Noite'], text: '' },
    ]);
  });

  it('rejects an incomplete response (RN04, RN05)', async () => {
    const form = (await admin.post('/api/forms').send(NEW_FORM)).body;
    const [text, multiple, single] = form.questions;
    const res = await request(app.getHttpServer())
      .post(`/api/public/forms/${form.id}/responses`)
      .send({
        email: 'não é e-mail',
        answers: [
          { questionId: text.id, choices: [], text: 'Oi' },
          { questionId: multiple.id, choices: [], text: '' },
          { questionId: single.id, choices: ['Back'], text: '' },
        ],
      })
      .expect(400);
    expect(res.body.message).toEqual([
      'Informe um e-mail válido.',
      'Pergunta 2: Marque pelo menos uma opção.',
      'Pergunta 3: Escreva uma justificativa.',
    ]);
    const detail = await admin.get(`/api/forms/${form.id}`);
    expect(detail.body.responses).toEqual([]);
  });

  it('answers 404 for an unknown form', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/public/forms/nao-existe')
      .expect(404);
    expect(res.body.message).toBe('Formulário não encontrado.');
    await request(app.getHttpServer())
      .post('/api/public/forms/nao-existe/responses')
      .send({ answers: [] })
      .expect(404);
    await admin.get('/api/forms/nao-existe').expect(404);
    await admin.get('/api/forms/nao-existe/export.csv').expect(404);
    await admin.get('/api/forms/nao-existe/export.pdf').expect(404);
  });

  it('exports the responses as CSV and PDF (RF15, RF16)', async () => {
    const form = (await admin.post('/api/forms').send(NEW_FORM)).body;
    const [text, multiple, single] = form.questions;
    await request(app.getHttpServer())
      .post(`/api/public/forms/${form.id}/responses`)
      .send({
        email: 'joao@example.com',
        answers: [
          { questionId: text.id, choices: [], text: 'Um app.' },
          { questionId: multiple.id, choices: ['Go', 'TS'], text: '' },
          { questionId: single.id, choices: ['Back'], text: 'APIs.' },
        ],
      })
      .expect(201);

    const csv = await admin
      .get(`/api/forms/${form.id}/export.csv`)
      .expect(200)
      .expect('Content-Type', 'text/csv; charset=utf-8')
      .expect(
        'Content-Disposition',
        'attachment; filename="respostas-pesquisa-de-stack.csv"',
      )
      .expect('Cache-Control', 'no-store');
    const [header, row] = csv.text.replace(/^\uFEFF/, '').split('\r\n');
    expect(header).toBe(
      '"Enviada em","E-mail","Conte sobre um projeto.","Linguagens",' +
        '"Front ou back?","Front ou back? (justificativa)"',
    );
    expect(row).toMatch(
      /^"\d{4}-\d\d-\d\d \d\d:\d\d:\d\d","joao@example.com","Um app.","Go; TS","Back","APIs."$/,
    );

    const pdf = await admin
      .get(`/api/forms/${form.id}/export.pdf`)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200)
      .expect('Content-Type', 'application/pdf')
      .expect(
        'Content-Disposition',
        'attachment; filename="respostas-pesquisa-de-stack.pdf"',
      );
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('has no way to edit or delete a form (RN07)', async () => {
    const form = (await admin.post('/api/forms').send(NEW_FORM)).body;
    await admin.put(`/api/forms/${form.id}`).send(NEW_FORM).expect(404);
    await admin.patch(`/api/forms/${form.id}`).send({ title: 'x' }).expect(404);
    await admin.delete(`/api/forms/${form.id}`).expect(404);
    await admin.get(`/api/forms/${form.id}`).expect(200);
  });
});
