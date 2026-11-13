import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import { newId } from '../prisma/new-id.js';
import { UsersService } from '../users/users.service.js';
import type {
  AnswerDto,
  CreateFormDto,
  CreateQuestionDto,
  SubmitResponseDto,
} from './forms.dto.js';
import { FormsRepository } from './forms.repository.js';
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
  constructor(
    private readonly repository: FormsRepository,
    private readonly users: UsersService,
  ) {}

  // cria um formulário de exemplo, para que o aplicativo não fique vazio no primeiro uso
  async onModuleInit(): Promise<void> {
    if ((await this.repository.countForms()) > 0) return;
    const admin = await this.users.sampleUser();
    const form = await this.create(SAMPLE_FORM, admin.id);
    await this.submit(form.id, sampleResponse(form));
  }

  // qualquer usuário logado pode criar um formulário (RF03-RF07 e RN03)
  async create(input: CreateFormDto, authorId: string): Promise<Form> {
    const errors = formErrors(input);
    if (errors.length) throw new BadRequestException(errors);

    return this.repository.insertForm({
      id: newId(),
      title: input.title.trim(),
      description: input.description.trim(),
      collectEmail: input.collectEmail,
      authorId,
      createdAt: new Date(),
      questions: input.questions.map((q, position) => ({
        id: newId(),
        position,
        type: q.type,
        title: q.title.trim(),
        options: q.type === 'text' ? [] : q.options.map((o) => o.trim()),
      })),
    });
  }

  // lista os formulários, do mais novo ao mais velho (repository faz a ordenação) (RN02, RN10)
  list(): Promise<FormSummary[]> {
    return this.repository.listForms();
  }

  // o formulário com todas as suas respostas (RN10)
  async detail(id: string): Promise<FormDetail> {
    const form = await this.publicForm(id);
    return { ...form, responses: await this.repository.responsesOf(id) };
  }

  // aquilo que é público para todos verem, o formulário com suas questões, sem respostas
  async publicForm(id: string): Promise<Form> {
    const form = await this.repository.findForm(id);
    if (!form) throw new NotFoundException('Formulário não encontrado.');
    return form;
  }

  // guarda uma resposta linkando ao seu formulário (RF13), se todas as questões foram respondidas
  async submit(
    formId: string,
    input: SubmitResponseDto,
  ): Promise<Pick<FormResponse, 'id' | 'submittedAt'>> {
    const form = await this.publicForm(formId);
    const errors = responseErrors(form, input);
    if (errors.length) throw new BadRequestException(errors);

    return this.repository.insertResponse({
      id: newId(),
      formId,
      // Only kept when the form asks for it (RN08).
      email: form.collectEmail ? input.email!.trim() : null,
      submittedAt: new Date(),
      answers: form.questions.map((question) => {
        const answer = input.answers.find((a) => a.questionId === question.id)!;
        return {
          id: newId(),
          questionId: question.id,
          choices: question.type === 'text' ? [] : answer.choices,
          text: hasText(question) ? answer.text.trim() : '',
        };
      }),
    });
  }
}

// todas as funções abaixo validam se o formulário foi montado corretamente

// verificar the a resposta tem texto escrito
function hasText(question: Question): boolean {
  return (
    question.type === 'text' || question.type === 'single_choice_justified'
  );
}

// verificar erros gerais
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

// verificar erros específicos na formulação das perguntas
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

// verificar se existem erros na forma que alguém respondeu o formulário no geral
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

  // todas as perguntas são obrigatórias (RN04)
  form.questions.forEach((question, index) => {
    const answer = input.answers.find((a) => a.questionId === question.id);
    const error = answerError(question, answer);
    if (error) errors.push(`Pergunta ${index + 1}: ${error}`);
  });
  return errors;
}

// verificar erros de respostas a perguntas individuais
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
    case 'single_choice':
    case 'single_choice_justified':
      if (choices.length !== 1) return 'Escolha uma opção.';
      if (!validChoices) return 'Opção inválida.';
      if (question.type === 'single_choice') return null;
      // The justification is required too (RN05).
      return answer!.text.trim() ? null : 'Escreva uma justificativa.';
  }
}
