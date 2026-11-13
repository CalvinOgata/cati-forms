import { answerTo, sortableDateTime } from './forms.export.js';
import {
  ALL_RESPONSES,
  organizeResponses,
  type ResponseView,
} from './forms.organize.js';
import type { FormDetail } from './forms.types.js';


// exportação para CSV (RF15), organizado de maneira que facilite legibilidade (RN11)

export function responsesCsv(
  form: FormDetail,
  view: ResponseView = ALL_RESPONSES,
): string {
  const header = [
    'Nº',
    'Enviada em',
    ...(form.collectEmail ? ['E-mail'] : []),
    ...form.questions.flatMap((q) =>
      q.type === 'single_choice_justified'
        ? [q.title, `${q.title} (justificativa)`]
        : [q.title],
    ),
  ];
  const rows = organizeResponses(form, view).map((response) => [
    String(response.number),
    sortableDateTime(response.submittedAt),
    ...(form.collectEmail ? [response.email ?? ''] : []),
    ...form.questions.flatMap((question) => {
      const answer = answerTo(response, question);
      switch (question.type) {
        case 'text':
          return [answer?.text ?? ''];
        case 'multiple_choice':
          return [answer?.choices.join('; ') ?? ''];
        case 'single_choice':
          return [answer?.choices[0] ?? ''];
        case 'single_choice_justified':
          return [answer?.choices[0] ?? '', answer?.text ?? ''];
      }
    }),
  ]);
  const lines = [header, ...rows].map((row) => row.map(cell).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

function cell(value: string): string {
  // Respondents type anything, including "=HYPERLINK(...)". A leading ' makes
  // spreadsheets show such a cell as text instead of running it as a formula.
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${text.replaceAll('"', '""')}"`;
}
