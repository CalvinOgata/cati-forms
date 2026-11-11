import { BadRequestException } from '@nestjs/common';
import type { FormDetail, FormResponse } from './forms.types.js';

// Organizing a form's responses (RN11): order, text search and a filter by the
// option chosen. The form page does the same in the browser
// (frontend/src/lib/forms.ts), and the exports follow what's on the screen.

export const RESPONSE_ORDERS = ['newest', 'oldest'] as const;

export type ResponseOrder = (typeof RESPONSE_ORDERS)[number];

export interface ResponseView {
  order: ResponseOrder;
  /** Text to look for in the answers and the e-mail; empty for every response. */
  search: string;
  /** Only the responses that chose this option. */
  choice: { questionId: string; option: string } | null;
}

/** Every response, in the order they arrived. */
export const ALL_RESPONSES: ResponseView = {
  order: 'oldest',
  search: '',
  choice: null,
};

/** Numbered in the order it arrived, whatever the order or filter. */
export interface NumberedResponse extends FormResponse {
  number: number;
}

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

/** Whether the view leaves any response out. */
export function isFiltered(view: ResponseView): boolean {
  return view.search.trim() !== '' || view.choice !== null;
}

/** "Mais recentes primeiro · busca: “go” · Linguagens: Go", for the PDF. */
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

/** The query string of the export routes, e.g. `?order=newest&q=go`. */
export interface ResponseQuery {
  order?: ResponseOrder;
  q?: string;
  question?: string;
  option?: string;
}

/** The view a query asks for. 400 if it names a question or option the form lacks. */
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

/** The e-mail and every answer, folded for searching. */
function searchText(response: FormResponse): string {
  const fields = response.answers.flatMap((a) => [...a.choices, a.text]);
  // One field per line, so a search can't match across two of them.
  return fold([response.email ?? '', ...fields].join('\n'));
}

/** Ignores case and accents: "acao" finds "Ação". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
