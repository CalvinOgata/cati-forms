import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import { newId } from '../prisma/new-id.js';
import type {
  AnswerDto,
  CreateFormDto,
  CreateQuestionDto,
  SubmitResponseDto,
} from './forms.dto.js';
import {
  FormsRepository,
  type AnswerRow,
  type FormRow,
  type QuestionRow,
  type ResponseRow,
} from './forms.repository.js';
import { SAMPLE_FORM, sampleResponse } from './forms.sample.js';
import type {
  Form,
  FormDetail,
  FormResponse,
  FormSummary,
  Question,
} from './forms.types.js';

@Injectable()
export class FormsService implements OnModuleInit {
  constructor(private readonly repository: FormsRepository) {}

  /** Creates an example form with one response, so the app isn't empty on first use. */
  onModuleInit(): void {
    const form = this.create(SAMPLE_FORM, 'admin');
    this.submit(form.id, sampleResponse(form));
  }

  /** RF03–RF07. Any logged-in user can create a form (RN03). */
  create(input: CreateFormDto, createdBy: string): Form {
    const errors = formErrors(input);
    if (errors.length) throw new BadRequestException(errors);

    const form: FormRow = {
      id: newId(),
      title: input.title.trim(),
      description: input.description.trim(),
      collectEmail: input.collectEmail,
      createdBy,
      createdAt: new Date(),
    };
    const questions: QuestionRow[] = input.questions.map((q, position) => ({
      id: newId(),
      formId: form.id,
      position,
      type: q.type,
      title: q.title.trim(),
      options: q.type === 'text' ? [] : q.options.map((o) => o.trim()),
    }));
    this.repository.insertForm(form, questions);
    return toForm(form, questions);
  }

  /** Every form, newest first: any user sees all of them (RN02, RN10). */
  list(): FormSummary[] {
    return this.repository
      .allForms()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((form) => ({
        id: form.id,
        title: form.title,
        description: form.description,
        createdBy: form.createdBy,
        createdAt: form.createdAt.toISOString(),
        questionCount: this.repository.questionsOf(form.id).length,
        responseCount: this.repository.countResponses(form.id),
      }));
  }

  /** The form with all its responses (RN10). */
  detail(id: string): FormDetail {
    const form = this.publicForm(id);
    const responses = this.repository
      .responsesOf(id)
      .map((response) => this.toFormResponse(response, form.questions));
    return { ...form, responses };
  }

  /** What anyone with the link sees (RF09, RN09): the questions, no responses. */
  publicForm(id: string): Form {
    const form = this.repository.findForm(id);
    if (!form) throw new NotFoundException('Formulário não encontrado.');
    return toForm(form, this.repository.questionsOf(id));
  }

  /** Stores a response linked to its form (RF13), if every question is answered. */
  submit(
    formId: string,
    input: SubmitResponseDto,
  ): Pick<FormResponse, 'id' | 'submittedAt'> {
    const form = this.publicForm(formId);
    const errors = responseErrors(form, input);
    if (errors.length) throw new BadRequestException(errors);

    const response: ResponseRow = {
      id: newId(),
      formId,
      // Only kept when the form asks for it (RN08).
      email: form.collectEmail ? input.email!.trim() : null,
      submittedAt: new Date(),
    };
    const answers: AnswerRow[] = form.questions.map((question) => {
      const answer = input.answers.find((a) => a.questionId === question.id)!;
      return {
        id: newId(),
        responseId: response.id,
        questionId: question.id,
        choices: question.type === 'text' ? [] : answer.choices,
        text: question.type === 'multiple_choice' ? '' : answer.text.trim(),
      };
    });
    this.repository.insertResponse(response, answers);
    return { id: response.id, submittedAt: response.submittedAt.toISOString() };
  }

  private toFormResponse(
    response: ResponseRow,
    questions: Question[],
  ): FormResponse {
    const answers = this.repository.answersOf(response.id);
    return {
      id: response.id,
      email: response.email,
      // In question order.
      answers: questions.flatMap((question) => {
        const answer = answers.find((a) => a.questionId === question.id);
        return answer
          ? [
              {
                questionId: answer.questionId,
                choices: answer.choices,
                text: answer.text,
              },
            ]
          : [];
      }),
      submittedAt: response.submittedAt.toISOString(),
    };
  }
}

function toForm(form: FormRow, questions: QuestionRow[]): Form {
  return {
    id: form.id,
    title: form.title,
    description: form.description,
    collectEmail: form.collectEmail,
    questions: questions.map((q) => ({
      id: q.id,
      type: q.type,
      title: q.title,
      options: q.options,
    })),
    createdBy: form.createdBy,
    createdAt: form.createdAt.toISOString(),
  };
}

function formErrors(input: CreateFormDto): string[] {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push('Dê um título ao formulário.');
  if (input.questions.length === 0) {
    errors.push('Adicione pelo menos uma pergunta.');
  }
  input.questions.forEach((question, index) => {
    const error = questionError(question);
    if (error) errors.push(`Pergunta ${index + 1}: ${error}`);
  });
  return errors;
}

function questionError(question: CreateQuestionDto): string | null {
  if (!question.title.trim()) return 'Escreva a pergunta.';
  if (question.type === 'text') return null;

  const options = question.options.map((o) => o.trim());
  if (options.some((o) => !o)) return 'Preencha ou remova as opções vazias.';
  if (options.length < 2) return 'Adicione pelo menos duas opções.';
  if (new Set(options).size !== options.length) {
    return 'As opções não podem se repetir.';
  }
  return null;
}

function responseErrors(form: Form, input: SubmitResponseDto): string[] {
  const errors: string[] = [];
  if (form.collectEmail && !isEmail(input.email?.trim() ?? '')) {
    errors.push('Informe um e-mail válido.');
  }

  const questionIds = new Set(form.questions.map((q) => q.id));
  const answeredIds = input.answers.map((a) => a.questionId);
  if (answeredIds.some((id) => !questionIds.has(id))) {
    errors.push(
      'Há respostas para perguntas que não existem neste formulário.',
    );
  }
  if (new Set(answeredIds).size !== answeredIds.length) {
    errors.push('Cada pergunta só pode ter uma resposta.');
  }

  // Every question is required (RN04).
  form.questions.forEach((question, index) => {
    const answer = input.answers.find((a) => a.questionId === question.id);
    const error = answerError(question, answer);
    if (error) errors.push(`Pergunta ${index + 1}: ${error}`);
  });
  return errors;
}

function answerError(
  question: Question,
  answer: AnswerDto | undefined,
): string | null {
  const choices = answer?.choices ?? [];
  const validChoices =
    choices.every((c) => question.options.includes(c)) &&
    new Set(choices).size === choices.length;

  switch (question.type) {
    case 'text':
      return answer?.text.trim() ? null : 'Esta pergunta é obrigatória.';
    case 'multiple_choice':
      // Any number of options may be checked, but at least one (RN06).
      if (choices.length === 0) return 'Marque pelo menos uma opção.';
      return validChoices ? null : 'Opção inválida.';
    case 'single_choice_justified':
      if (choices.length !== 1) return 'Escolha uma opção.';
      if (!validChoices) return 'Opção inválida.';
      // The justification is required too (RN05).
      return answer!.text.trim() ? null : 'Escreva uma justificativa.';
  }
}
