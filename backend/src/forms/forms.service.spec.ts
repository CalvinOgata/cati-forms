import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
function errorsOf(action: () => unknown): string[] {
  try {
    action();
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
  let service: FormsService;
  let repository: FormsRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [FormsService, FormsRepository],
    }).compile();
    // Without init(): no sample form, so each test starts empty.
    service = module.get(FormsService);
    repository = module.get(FormsRepository);
  });

  describe('create', () => {
    it('stores the form and each question as separate rows (RF12, RNF08)', () => {
      const form = service.create(NEW_FORM, 'ana');

      expect(form).toMatchObject({
        title: 'Pesquisa',
        collectEmail: true,
        createdBy: 'ana',
      });
      expect(repository.findForm(form.id)).toBeDefined();
      const rows = repository.questionsOf(form.id);
      expect(rows.map((q) => [q.position, q.formId])).toEqual([
        [0, form.id],
        [1, form.id],
        [2, form.id],
      ]);
      // Text questions have no options.
      expect(form.questions[0].options).toEqual([]);
    });

    it('rejects a blank title and an empty question list', () => {
      expect(
        errorsOf(() =>
          service.create({ ...NEW_FORM, title: '  ', questions: [] }, 'ana'),
        ),
      ).toEqual([
        'Dê um título ao formulário.',
        'Adicione pelo menos uma pergunta.',
      ]);
    });

    it('says which question is wrong', () => {
      const bad = (options: string[]) => ({
        type: 'multiple_choice' as const,
        title: 'Q',
        options,
      });
      expect(
        errorsOf(() =>
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
            'ana',
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

    beforeEach(() => {
      form = service.create(NEW_FORM, 'ana');
    });

    it('stores the response and its answers linked to the form (RF13)', () => {
      const { id } = service.submit(form.id, {
        email: ' joao@example.com ',
        answers: answers([' Oi ', ['Go', 'TS', 'Py'], 'Back', 'APIs']),
      });

      expect(repository.responsesOf(form.id)).toEqual([
        expect.objectContaining({ id, email: 'joao@example.com' }),
      ]);
      expect(repository.answersOf(id)).toHaveLength(3);
      // Every option can be checked (RN06), and text is trimmed.
      expect(service.detail(form.id).responses[0].answers).toEqual(
        answers(['Oi', ['Go', 'TS', 'Py'], 'Back', 'APIs']),
      );
    });

    it('requires every question, the justification and the e-mail (RN04, RN05, RN08)', () => {
      expect(
        errorsOf(() =>
          service.submit(form.id, { answers: answers([' ', [], '', '']) }),
        ),
      ).toEqual([
        'Informe um e-mail válido.',
        'Pergunta 1: Esta pergunta é obrigatória.',
        'Pergunta 2: Marque pelo menos uma opção.',
        'Pergunta 3: Escolha uma opção.',
      ]);
      expect(
        errorsOf(() =>
          service.submit(form.id, {
            email: 'a@b.co',
            answers: answers(['Oi', ['Go'], 'Back', '  ']),
          }),
        ),
      ).toEqual(['Pergunta 3: Escreva uma justificativa.']);
    });

    it('treats a missing answer as unanswered', () => {
      expect(
        errorsOf(() =>
          service.submit(form.id, {
            email: 'a@b.co',
            answers: answers(['Oi', ['Go'], 'Back', 'x']).slice(1),
          }),
        ),
      ).toEqual(['Pergunta 1: Esta pergunta é obrigatória.']);
    });

    it('rejects options and questions that are not in the form', () => {
      const valid = answers(['Oi', ['Go'], 'Back', 'x']);
      expect(
        errorsOf(() =>
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

    it('drops the e-mail when the form does not ask for it', () => {
      const noEmail = service.create(
        { ...NEW_FORM, collectEmail: false },
        'ana',
      );
      form = noEmail;
      service.submit(noEmail.id, {
        email: 'joao@example.com',
        answers: answers(['Oi', ['Go'], 'Back', 'x']),
      });
      expect(service.detail(noEmail.id).responses[0].email).toBeNull();
    });
  });

  it('lists every form newest first, with counts', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01'));
      const older = service.create(NEW_FORM, 'ana');
      vi.setSystemTime(new Date('2026-02-01'));
      const newer = service.create(
        { ...NEW_FORM, questions: [NEW_FORM.questions[0]] },
        'bia',
      );
      service.submit(older.id, {
        email: 'a@b.co',
        answers: [
          { questionId: older.questions[0].id, choices: [], text: 'x' },
          { questionId: older.questions[1].id, choices: ['Go'], text: '' },
          { questionId: older.questions[2].id, choices: ['Back'], text: 'x' },
        ],
      });

      expect(
        service.list().map((f) => [f.id, f.questionCount, f.responseCount]),
      ).toEqual([
        [newer.id, 1, 0],
        [older.id, 3, 1],
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('answers 404 for an unknown form', () => {
    expect(() => service.publicForm('nope')).toThrow(NotFoundException);
    expect(() => service.detail('nope')).toThrow(NotFoundException);
  });
});
