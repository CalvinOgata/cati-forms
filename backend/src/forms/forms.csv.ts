import { answerTo, sortableDateTime } from './forms.export.js';
import type { FormDetail } from './forms.types.js';

/**
 * The responses as CSV (RF15): one row per response, oldest first, and one
 * column per question. Single choice with justification takes two columns, the
 * option and the justification; checked options are joined with "; ".
 *
 * RFC 4180 (commas, CRLF, every cell quoted), with a BOM so Excel reads the
 * file as UTF-8 and keeps the accents.
 */
export function responsesCsv(form: FormDetail): string {
  const header = [
    'Enviada em',
    ...(form.collectEmail ? ['E-mail'] : []),
    ...form.questions.flatMap((q) =>
      q.type === 'single_choice_justified'
        ? [q.title, `${q.title} (justificativa)`]
        : [q.title],
    ),
  ];
  const rows = form.responses.map((response) => [
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
