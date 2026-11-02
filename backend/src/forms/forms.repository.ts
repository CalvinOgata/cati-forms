import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  Form,
  FormResponse,
  FormSummary,
  QuestionType,
} from './forms.types.js';

// Forms, questions, responses and answers are separate tables linked by foreign
// keys (RF12, RF13, RNF08); see prisma/schema.prisma. This class holds the
// queries and turns rows into what the API returns.

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

/** A form with its questions in order and its author's username. */
const formWithQuestions = {
  questions: { orderBy: { position: 'asc' } },
  author: { select: { username: true } },
} satisfies Prisma.FormInclude;

type FormRow = Prisma.FormGetPayload<{ include: typeof formWithQuestions }>;

/**
 * Only inserts and reads: forms can't be edited or deleted (RN07), and
 * neither can responses.
 */
@Injectable()
export class FormsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Saves a form together with its questions, all or nothing. */
  async insertForm({ questions, ...form }: NewForm): Promise<Form> {
    const row = await this.prisma.form.create({
      data: { ...form, questions: { create: questions } },
      include: formWithQuestions,
    });
    return toForm(row);
  }

  async findForm(id: string): Promise<Form | null> {
    const row = await this.prisma.form.findUnique({
      where: { id },
      include: formWithQuestions,
    });
    return row && toForm(row);
  }

  countForms(): Promise<number> {
    return this.prisma.form.count();
  }

  /** Every form, newest first, with how many questions and responses it has. */
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

  /** Saves a response together with its answers, all or nothing. */
  async insertResponse({
    answers,
    ...response
  }: NewResponse): Promise<Pick<FormResponse, 'id' | 'submittedAt'>> {
    const row = await this.prisma.response.create({
      data: { ...response, answers: { create: answers } },
    });
    return { id: row.id, submittedAt: row.submittedAt.toISOString() };
  }

  /** The form's responses, oldest first, each with its answers in question order. */
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
