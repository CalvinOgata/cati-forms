import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { resetDatabase } from '../../test/database.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import type { CreateFormDto } from './forms.dto.js';
import { FormsRepository } from './forms.repository.js';
import { FormsService } from './forms.service.js';
import type { Form } from './forms.types.js';

const NEW_FORM: CreateFormDto = {
  title: '  Pesquisa  ',
  description: '',
  collectEmail: true,
  questions: [
    { type: 'text', title: 'Conte sobre você', options: ['ignorada'] },
    {
      type: 'multiple_choice',
      title: 'Linguagens',
      options: ['Go', 'TS', 'Py'],
    },
    {
      type: 'single_choice_justified',
      title: 'Front ou back?',
      options: ['Front', 'Back'],
    },
  ],
};

/** The BadRequestException's message list, or a failure if nothing was thrown. */
async function errorsOf(action: Promise<unknown>): Promise<string[]> {
  try {
    await action;
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    const body = (error as BadRequestException).getResponse() as {
      message: string[];
    };
    return body.message;
  }
  throw new Error('expected a BadRequestException');
}

describe('FormsService', () => {
  let module: TestingModule;
  let service: FormsService;
  let prisma: PrismaService;
  /** The user who creates the forms in these tests. */
  let ana: string;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
      providers: [FormsService, FormsRepository, UsersService],
    }).compile();
    prisma = module.get(PrismaService);
    await resetDatabase(prisma);
    // Without init(): no sample data, so each test starts empty.
    service = module.get(FormsService);
    ana = (await module.get(UsersService).create('ana', 'segredo123')).id;
  });

  afterEach(async () => {
    await module.close();
  });

  describe('create', () => {
    it('stores the form and each question as separate rows (RF12, RNF08)', async () => {
      const form = await service.create(NEW_FORM, ana);

      expect(form).toMatchObject({
        title: 'Pesquisa',
        collectEmail: true,
        createdBy: 'ana',
      });
      expect(
        await prisma.form.findUnique({ where: { id: form.id } }),
      ).toMatchObject({ authorId: ana });
      const rows = await prisma.question.findMany({
        where: { formId: form.id },
        orderBy: { position: 'asc' },
      });
      expect(rows.map((q) => [q.position, q.id])).toEqual(
        form.questions.map((q, position) => [position, q.id]),
      );
      // Text questions have no options.
      expect(form.questions[0].options).toEqual([]);
    });

    it('rejects a blank title and an empty question list, saving nothing', async () => {
      expect(
        await errorsOf(
          service.create({ ...NEW_FORM, title: '  ', questions: [] }, ana),
        ),
      ).toEqual([
        'Dê um título ao formulário.',
        'Adicione pelo menos uma pergunta.',
      ]);
      expect(await prisma.form.count()).toBe(0);
    });

    it('says which question is wrong', async () => {
      const bad = (options: string[]) => ({
        type: 'multiple_choice' as const,
        title: 'Q',
        options,
      });
      expect(
        await errorsOf(
          service.create(
            {
              ...NEW_FORM,
              questions: [
                { type: 'text', title: ' ', options: [] },
                bad(['Só uma']),
                bad(['A', ' ']),
                bad(['A', 'A ']),
              ],
            },
            ana,
          ),
        ),
      ).toEqual([
        'Pergunta 1: Escreva a pergunta.',
        'Pergunta 2: Adicione pelo menos duas opções.',
        'Pergunta 3: Preencha ou remova as opções vazias.',
        'Pergunta 4: As opções não podem se repetir.',
      ]);
    });
  });

  describe('submit', () => {
    let form: Form;
    const answers = (texts: [string, string[], string, string]) => {
      const [text, multiple, single, justification] = texts;
      return [
        { questionId: form.questions[0].id, choices: [], text },
        { questionId: form.questions[1].id, choices: multiple, text: '' },
        {
          questionId: form.questions[2].id,
          choices: single ? [single] : [],
          text: justification,
        },
      ];
    };

    beforeEach(async () => {
      form = await service.create(NEW_FORM, ana);
    });

    it('stores the response and its answers linked to the form (RF13)', async () => {
      const { id } = await service.submit(form.id, {
        email: ' joao@example.com ',
        answers: answers([' Oi ', ['Go', 'TS', 'Py'], 'Back', 'APIs']),
      });

      expect(
        await prisma.response.findMany({ where: { formId: form.id } }),
      ).toEqual([expect.objectContaining({ id, email: 'joao@example.com' })]);
      expect(await prisma.answer.count({ where: { responseId: id } })).toBe(3);
      // Every option can be checked (RN06), and text is trimmed.
      expect((await service.detail(form.id)).responses[0].answers).toEqual(
        answers(['Oi', ['Go', 'TS', 'Py'], 'Back', 'APIs']),
      );
    });

    it('requires every question, the justification and the e-mail (RN04, RN05, RN08)', async () => {
      expect(
        await errorsOf(
          service.submit(form.id, { answers: answers([' ', [], '', '']) }),
        ),
      ).toEqual([
        'Informe um e-mail válido.',
        'Pergunta 1: Esta pergunta é obrigatória.',
        'Pergunta 2: Marque pelo menos uma opção.',
        'Pergunta 3: Escolha uma opção.',
      ]);
      expect(
        await errorsOf(
          service.submit(form.id, {
            email: 'a@b.co',
            answers: answers(['Oi', ['Go'], 'Back', '  ']),
          }),
        ),
      ).toEqual(['Pergunta 3: Escreva uma justificativa.']);
      expect(await prisma.response.count()).toBe(0);
    });

    it('needs exactly one option for single choice, but no justification', async () => {
      const shift = await service.create(
        {
          title: 'Turno',
          description: '',
          collectEmail: false,
          questions: [
            {
              type: 'single_choice',
              title: 'Qual turno?',
              options: ['Manhã', 'Tarde'],
            },
          ],
        },
        ana,
      );
      const questionId = shift.questions[0].id;
      const submit = (choices: string[], text: string) =>
        service.submit(shift.id, { answers: [{ questionId, choices, text }] });

      expect(await errorsOf(submit([], 'Tarde'))).toEqual([
        'Pergunta 1: Escolha uma opção.',
      ]);
      expect(await errorsOf(submit(['Manhã', 'Tarde'], ''))).toEqual([
        'Pergunta 1: Escolha uma opção.',
      ]);
      // Any text sent along isn't kept: there is no justification to keep.
      await submit(['Tarde'], 'ignorada');
      expect((await service.detail(shift.id)).responses[0].answers).toEqual([
        { questionId, choices: ['Tarde'], text: '' },
      ]);
    });

    it('treats a missing answer as unanswered', async () => {
      expect(
        await errorsOf(
          service.submit(form.id, {
            email: 'a@b.co',
            answers: answers(['Oi', ['Go'], 'Back', 'x']).slice(1),
          }),
        ),
      ).toEqual(['Pergunta 1: Esta pergunta é obrigatória.']);
    });

    it('rejects options and questions that are not in the form', async () => {
      const valid = answers(['Oi', ['Go'], 'Back', 'x']);
      expect(
        await errorsOf(
          service.submit(form.id, {
            email: 'a@b.co',
            answers: [
              valid[0],
              { ...valid[1], choices: ['Go', 'Rust'] },
              { ...valid[2], choices: ['Front', 'Back'] },
              { questionId: 'outra', choices: [], text: 'x' },
              valid[0],
            ],
          }),
        ),
      ).toEqual([
        'Há respostas para perguntas que não existem neste formulário.',
        'Cada pergunta só pode ter uma resposta.',
        'Pergunta 2: Opção inválida.',
        'Pergunta 3: Escolha uma opção.',
      ]);
    });

    it('drops the e-mail when the form does not ask for it', async () => {
      const noEmail = await service.create(
        { ...NEW_FORM, collectEmail: false },
        ana,
      );
      form = noEmail;
      await service.submit(noEmail.id, {
        email: 'joao@example.com',
        answers: answers(['Oi', ['Go'], 'Back', 'x']),
      });
      expect((await service.detail(noEmail.id)).responses[0].email).toBeNull();
    });
  });

  it('lists every form newest first, with counts', async () => {
    // Only Date is faked: the database driver still needs real timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-01-01'));
      const older = await service.create(NEW_FORM, ana);
      vi.setSystemTime(new Date('2026-02-01'));
      const newer = await service.create(
        { ...NEW_FORM, questions: [NEW_FORM.questions[0]] },
        ana,
      );
      await service.submit(older.id, {
        email: 'a@b.co',
        answers: [
          { questionId: older.questions[0].id, choices: [], text: 'x' },
          { questionId: older.questions[1].id, choices: ['Go'], text: '' },
          { questionId: older.questions[2].id, choices: ['Back'], text: 'x' },
        ],
      });

      expect(
        (await service.list()).map((f) => [
          f.id,
          f.questionCount,
          f.responseCount,
        ]),
      ).toEqual([
        [newer.id, 1, 0],
        [older.id, 3, 1],
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('answers 404 for an unknown form', async () => {
    await expect(service.publicForm('nope')).rejects.toThrow(NotFoundException);
    await expect(service.detail('nope')).rejects.toThrow(NotFoundException);
  });

  it('creates the sample form on startup only while there are no forms', async () => {
    await module.init();
    expect(await prisma.form.count()).toBe(1);
    expect(await prisma.response.count()).toBe(1);

    // A restart finds the sample already there.
    await service.onModuleInit();
    expect(await prisma.form.count()).toBe(1);
  });
});
