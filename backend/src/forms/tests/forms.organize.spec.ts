import { BadRequestException } from '@nestjs/common';
import {
  ALL_RESPONSES,
  describeView,
  organizeResponses,
  responseView,
  type ResponseView,
} from '../forms.organize.js';
import type { FormDetail, FormResponse } from '../forms.types.js';

const response = (
  id: string,
  email: string | null,
  text: string,
  languages: string[],
): FormResponse => ({
  id,
  email,
  submittedAt: '2026-11-03T18:00:00.000Z',
  answers: [
    { questionId: 'q1', choices: [], text },
    { questionId: 'q2', choices: languages, text: '' },
  ],
});

const FORM: FormDetail = {
  id: 'f1',
  title: 'Pesquisa',
  description: '',
  collectEmail: true,
  createdBy: 'ana',
  createdAt: '2026-11-03T12:00:00.000Z',
  questions: [
    { id: 'q1', type: 'text', title: 'Conte algo', options: [] },
    {
      id: 'q2',
      type: 'multiple_choice',
      title: 'Linguagens',
      options: ['Go', 'C, C++', 'TS'],
    },
  ],
  responses: [
    response('r1', 'joao@example.com', 'Gosto de Ação.', ['Go']),
    response('r2', null, 'Prefiro APIs.', ['C, C++', 'TS']),
    response('r3', 'maria@example.com', 'Nada a declarar.', ['Go', 'TS']),
  ],
};

const ids = (view: Partial<ResponseView>) =>
  organizeResponses(FORM, { ...ALL_RESPONSES, ...view }).map(
    (r) => `${r.id}#${r.number}`,
  );

describe('organizeResponses (RN11)', () => {
  it('lists every response, oldest or newest first, numbered as they arrived', () => {
    expect(ids({})).toEqual(['r1#1', 'r2#2', 'r3#3']);
    expect(ids({ order: 'newest' })).toEqual(['r3#3', 'r2#2', 'r1#1']);
  });

  it('searches the answers and the e-mail, ignoring case and accents', () => {
    expect(ids({ search: '  acao ' })).toEqual(['r1#1']);
    expect(ids({ search: 'MARIA@' })).toEqual(['r3#3']);
    expect(ids({ search: 'c++' })).toEqual(['r2#2']);
    expect(ids({ search: 'ninguém' })).toEqual([]);
  });

  it('does not match across two answers', () => {
    expect(ids({ search: 'apis.c' })).toEqual([]);
    expect(ids({ search: 'apis. c' })).toEqual([]);
  });

  it('keeps the responses that chose an option, with the search and order', () => {
    const choice = { questionId: 'q2', option: 'TS' };
    expect(ids({ choice })).toEqual(['r2#2', 'r3#3']);
    expect(ids({ choice, order: 'newest' })).toEqual(['r3#3', 'r2#2']);
    expect(ids({ choice, search: 'nada' })).toEqual(['r3#3']);
  });
});

describe('responseView', () => {
  it('defaults to every response, oldest first', () => {
    expect(responseView(FORM, {})).toEqual(ALL_RESPONSES);
  });

  it('reads the order, search and option', () => {
    expect(
      responseView(FORM, {
        order: 'newest',
        q: 'go',
        question: 'q2',
        option: 'C, C++',
      }),
    ).toEqual({
      order: 'newest',
      search: 'go',
      choice: { questionId: 'q2', option: 'C, C++' },
    });
  });

  it('rejects a question or option the form does not have', () => {
    for (const query of [
      { question: 'q2' },
      { option: 'Go' },
      { question: 'q2', option: 'Rust' },
      { question: 'q1', option: '' },
      { question: 'nope', option: 'Go' },
    ]) {
      expect(() => responseView(FORM, query)).toThrow(BadRequestException);
    }
  });
});

describe('describeView', () => {
  it('says how the responses are organized', () => {
    expect(describeView(FORM, ALL_RESPONSES)).toBe('Mais antigas primeiro');
    expect(
      describeView(FORM, {
        order: 'newest',
        search: ' go ',
        choice: { questionId: 'q2', option: 'TS' },
      }),
    ).toBe('Mais recentes primeiro · busca: “go” · Linguagens: TS');
  });
});
