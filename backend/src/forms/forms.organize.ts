import { BadRequestException } from '@nestjs/common';
import type { FormDetail, FormResponse } from './forms.types.js';

// funções responsáveis por organizar as respostas dos formulários e a ordem que se encontram, a página de formulários faz o mesmo no navegador (frontend/src/lib/forms.ts)
// ao exportar para PDF ou csv, o arquivo segue a mesma ordem que está na tela

export const RESPONSE_ORDERS = ['newest', 'oldest'] as const;

export type ResponseOrder = (typeof RESPONSE_ORDERS)[number];

export interface ResponseView {
  order: ResponseOrder;
  search: string;
  // filtro de respostas ao formulário que marcaram uma tal opção
  choice: { questionId: string; option: string } | null;
}

// todas as respostas, baseado na ordem que elas chegaram
export const ALL_RESPONSES: ResponseView = {
  order: 'oldest',
  search: '',
  choice: null,
};

// numeradas na ordem que elas chegaram, não importando o filtro ou a ordem
export interface NumberedResponse extends FormResponse {
  number: number;
}

// organizar as respostas com baseado nos parametros
export function organizeResponses(
  form: FormDetail,
  view: ResponseView,
): NumberedResponse[] {
  const search = fold(view.search.trim());
  const { choice } = view;
  const responses = form.responses
    .map((response, i) => ({ ...response, number: i + 1 }))
    .filter((response) => !search || searchText(response).includes(search))
    .filter(
      (response) =>
        !choice ||
        response.answers.some(
          (a) =>
            a.questionId === choice.questionId &&
            a.choices.includes(choice.option),
        ),
    );
  return view.order === 'newest' ? responses.toReversed() : responses;
}

// verifica se a função 'view' deixa qualquer resposta de fora
export function isFiltered(view: ResponseView): boolean {
  return view.search.trim() !== '' || view.choice !== null;
}

// mais recentes primeiro, e destaca buscas
export function describeView(form: FormDetail, view: ResponseView): string {
  const parts = [
    view.order === 'newest'
      ? 'Mais recentes primeiro'
      : 'Mais antigas primeiro',
  ];
  if (view.search.trim()) parts.push(`busca: “${view.search.trim()}”`);
  if (view.choice) {
    const { questionId, option } = view.choice;
    const question = form.questions.find((q) => q.id === questionId);
    parts.push(`${question?.title}: ${option}`);
  }
  return parts.join(' · ');
}

// a query das rotas de exportação (?order=newst&q=go)
export interface ResponseQuery {
  order?: ResponseOrder;
  q?: string;
  question?: string;
  option?: string;
}

// a vizualização das respostas que a query pede por
// erro 400 se tem uma questão ou opção não existente
export function responseView(
  form: FormDetail,
  query: ResponseQuery,
): ResponseView {
  const { order = 'oldest', q = '', question, option } = query;
  if (question === undefined && option === undefined) {
    return { order, search: q, choice: null };
  }
  const options = form.questions.find(
    (candidate) => candidate.id === question && candidate.type !== 'text',
  )?.options;
  if (option === undefined || !options?.includes(option)) {
    throw new BadRequestException('Filtro de opção inválido.');
  }
  return { order, search: q, choice: { questionId: question!, option } };
}

// o email e cada resposta
function searchText(response: FormResponse): string {
  const fields = response.answers.flatMap((a) => [...a.choices, a.text]);
  // One field per line, so a search can't match across two of them.
  return fold([response.email ?? '', ...fields].join('\n'));
}

// ignora acentuação e maiusculas
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
