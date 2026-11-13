import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  Form,
  FormResponse,
  FormSummary,
  QuestionType,
} from './forms.types.js';

// formulários, perguntas, e respostas possuem seus campo separados
// todos linkados por chaves únicas (RF12, RF13, RNF08), veja prisma/schema.prisma

export interface NewForm {
  id: string;
  title: string;
  description: string;
  collectEmail: boolean;
  authorId: string;
  createdAt: Date;
  questions: {
    id: string;
    position: number;
    type: QuestionType;
    title: string;
    options: string[];
  }[];
}

export interface NewResponse {
  id: string;
  formId: string;
  email: string | null;
  submittedAt: Date;
  answers: {
    id: string;
    questionId: string;
    choices: string[];
    text: string;
  }[];
}

// formulário com suas questões em ordem e com o nome do autor
const formWithQuestions = {
  questions: { orderBy: { position: 'asc' } },
  author: { select: { username: true } },
} satisfies Prisma.FormInclude;

type FormRow = Prisma.FormGetPayload<{ include: typeof formWithQuestions }>;

// APENAS INSERE E LÊ
// formulários não podem ser editados ou deletados (RN07)

@Injectable()
export class FormsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // salva um formulário junto com suas perguntas
  async insertForm({ questions, ...form }: NewForm): Promise<Form> {
    const row = await this.prisma.form.create({
      data: { ...form, questions: { create: questions } },
      include: formWithQuestions,
    });
    return toForm(row);
  }

  // encontra um formulário baseado no seu id
  async findForm(id: string): Promise<Form | null> {
    const row = await this.prisma.form.findUnique({
      where: { id },
      include: formWithQuestions,
    });
    return row && toForm(row);
  }

  // conta quantos formulários existem no banco de dados
  countForms(): Promise<number> {
    return this.prisma.form.count();
  }

  // lista todos os formulários, dos mais novos, aos mais antigos, informa quantas perguntas e respostas tem
  async listForms(): Promise<FormSummary[]> {
    const rows = await this.prisma.form.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        author: { select: { username: true } },
        _count: { select: { questions: true, responses: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      createdBy: row.author.username,
      createdAt: row.createdAt.toISOString(),
      questionCount: row._count.questions,
      responseCount: row._count.responses,
    }));
  }

  // salva a resposta junto com todas as respostas de cada pergunta
  async insertResponse({
    answers,
    ...response
  }: NewResponse): Promise<Pick<FormResponse, 'id' | 'submittedAt'>> {
    const row = await this.prisma.response.create({
      data: { ...response, answers: { create: answers } },
    });
    return { id: row.id, submittedAt: row.submittedAt.toISOString() };
  }

  // respostas do formulário, as mais antigas primeiros, cada uma das respostas em ordem de pergunta
  async responsesOf(formId: string): Promise<FormResponse[]> {
    const rows = await this.prisma.response.findMany({
      where: { formId },
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      include: { answers: { orderBy: { question: { position: 'asc' } } } },
    });
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      answers: row.answers.map(({ questionId, choices, text }) => ({
        questionId,
        choices,
        text,
      })),
      submittedAt: row.submittedAt.toISOString(),
    }));
  }
}

// função que monta o formulário no banco
function toForm(row: FormRow): Form {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    collectEmail: row.collectEmail,
    questions: row.questions.map(({ id, type, title, options }) => ({
      id,
      type,
      title,
      options,
    })),
    createdBy: row.author.username,
    createdAt: row.createdAt.toISOString(),
  };
}
