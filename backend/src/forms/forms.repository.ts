import { Injectable } from '@nestjs/common';
import type { QuestionType } from './forms.types.js';

// One row type per entity. Each is stored on its own and points to its parent
// by id, the way the database tables will be (RF12, RF13, RNF08).

export interface FormRow {
  id: string;
  title: string;
  description: string;
  collectEmail: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface QuestionRow {
  id: string;
  formId: string;
  /** Order within the form, starting at 0. */
  position: number;
  type: QuestionType;
  title: string;
  options: string[];
}

export interface ResponseRow {
  id: string;
  formId: string;
  email: string | null;
  submittedAt: Date;
}

export interface AnswerRow {
  id: string;
  responseId: string;
  questionId: string;
  choices: string[];
  text: string;
}

/**
 * In-memory tables until there is a database: everything resets on restart.
 * Only inserts and reads: forms can't be edited or deleted (RN07), and neither
 * can responses.
 */
@Injectable()
export class FormsRepository {
  private readonly forms = new Map<string, FormRow>();
  private readonly questions = new Map<string, QuestionRow>();
  private readonly responses = new Map<string, ResponseRow>();
  private readonly answers = new Map<string, AnswerRow>();

  /** Saves a form together with its questions. */
  insertForm(form: FormRow, questions: QuestionRow[]): void {
    this.forms.set(form.id, form);
    for (const question of questions) this.questions.set(question.id, question);
  }

  findForm(id: string): FormRow | undefined {
    return this.forms.get(id);
  }

  allForms(): FormRow[] {
    return [...this.forms.values()];
  }

  /** The form's questions, in order. */
  questionsOf(formId: string): QuestionRow[] {
    return [...this.questions.values()]
      .filter((q) => q.formId === formId)
      .sort((a, b) => a.position - b.position);
  }

  /** Saves a response together with its answers. */
  insertResponse(response: ResponseRow, answers: AnswerRow[]): void {
    this.responses.set(response.id, response);
    for (const answer of answers) this.answers.set(answer.id, answer);
  }

  /** The form's responses, oldest first. */
  responsesOf(formId: string): ResponseRow[] {
    return [...this.responses.values()]
      .filter((r) => r.formId === formId)
      .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  }

  countResponses(formId: string): number {
    return this.responsesOf(formId).length;
  }

  answersOf(responseId: string): AnswerRow[] {
    return [...this.answers.values()].filter(
      (a) => a.responseId === responseId,
    );
  }
}
