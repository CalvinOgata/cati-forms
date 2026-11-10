import type {
  Answer,
  FormDetail,
  FormResponse,
  Question,
} from './forms.types.js';

// Shared by the CSV (RF15) and PDF (RF16) exports of a form's responses.

/** Exports show times as in São Carlos, wherever the server runs. */
export const EXPORT_TIME_ZONE = 'America/Sao_Paulo';

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: EXPORT_TIME_ZONE,
  dateStyle: 'short',
  timeStyle: 'short',
});

const dateTimeParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: EXPORT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** "03/11/2026, 15:08", as on the form page. */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** "2026-11-03 15:08:37": sorts as text, and spreadsheets read it as a date. */
export function sortableDateTime(iso: string): string {
  const part = Object.fromEntries(
    dateTimeParts.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}:${part.second}`;
}

/**
 * "respostas-pesquisa-de-stack.csv". Only ASCII letters, digits and dashes, so
 * the name survives every browser and file system.
 */
export function exportFileName(
  form: Pick<FormDetail, 'title'>,
  extension: 'csv' | 'pdf',
): string {
  const slug = form.title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');
  return `respostas-${slug || 'formulario'}.${extension}`;
}

/** The response's answer to the question. */
export function answerTo(
  response: FormResponse,
  question: Question,
): Answer | undefined {
  return response.answers.find((a) => a.questionId === question.id);
}
