import { readFileSync } from 'node:fs';
import { create, type Font } from 'fontkit';
import PDFDocument from 'pdfkit';
import { answerTo, formatDateTime } from './forms.export.js';
import {
  ALL_RESPONSES,
  describeView,
  isFiltered,
  organizeResponses,
  type NumberedResponse,
  type ResponseView,
} from './forms.organize.js';
import type { Answer, FormDetail, Question } from './forms.types.js';

// The PDF's built-in fonts only cover Latin-1, and respondents type anything.
// DejaVu Sans also covers Greek, Cyrillic, arrows, symbols and some emoji (see
// assets/fonts/LICENSE). The path works from src/ (tests) and dist/ alike.
const fontsDir = new URL('../../assets/fonts/', import.meta.url);
const REGULAR = readFileSync(new URL('DejaVuSans.ttf', fontsDir));
const BOLD = readFileSync(new URL('DejaVuSans-Bold.ttf', fontsDir));
const fonts = [REGULAR, BOLD].map((buffer) => create(buffer) as Font);

const MARGIN = 56; // 2 cm
const TEXT = '#1a1a1a';
const MUTED = '#5f6368';
const RULE = '#d0d4da';

type Doc = PDFKit.PDFDocument;

/**
 * The responses as a PDF (RF16): the form's title and details, then each
 * response, ordered and filtered as the view says (RN11), with every question
 * and its answer, and page numbers at the bottom.
 */
export function responsesPdf(
  form: FormDetail,
  view: ResponseView = ALL_RESPONSES,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    lang: 'pt-BR',
    info: {
      Title: printable(form.title),
      Subject: 'Respostas do formulário',
      Creator: 'Cati Forms',
    },
  });
  doc.registerFont('regular', REGULAR);
  doc.registerFont('bold', BOLD);
  const pdf = collect(doc);
  const responses = organizeResponses(form, view);

  heading(doc, form, view, responses.length);
  if (responses.length === 0) {
    doc.font('regular').fontSize(11).fillColor(MUTED);
    doc.text(
      isFiltered(view)
        ? 'Nenhuma resposta corresponde aos filtros.'
        : 'Nenhuma resposta ainda.',
    );
  }
  for (const response of responses) responseBlock(doc, form, response);
  pageNumbers(doc);

  doc.end();
  return pdf;
}

function collect(doc: Doc): Promise<Buffer> {
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function heading(
  doc: Doc,
  form: FormDetail,
  view: ResponseView,
  shown: number,
): void {
  doc.font('bold').fontSize(18).fillColor(TEXT).text(printable(form.title));
  if (form.description) {
    doc.moveDown(0.3).font('regular').fontSize(10.5);
    doc.text(printable(form.description));
  }
  const total = form.responses.length;
  const count = isFiltered(view) ? `${shown} de ${total}` : `${total}`;
  doc.moveDown(0.5).font('regular').fontSize(9).fillColor(MUTED);
  doc.text(
    `Criado por ${printable(form.createdBy)} em ${formatDateTime(form.createdAt)} · ` +
      `${count} ${total === 1 ? 'resposta' : 'respostas'} · ` +
      `exportado em ${formatDateTime(new Date().toISOString())}`,
  );
  doc.text(printable(describeView(form, view)));
  rule(doc);
}

function responseBlock(
  doc: Doc,
  form: FormDetail,
  response: NumberedResponse,
): void {
  keepTogether(doc, 90);
  doc.font('bold').fontSize(12).fillColor(TEXT);
  doc.text(`Resposta ${response.number}`);
  doc.font('regular').fontSize(9).fillColor(MUTED);
  doc.text(
    [formatDateTime(response.submittedAt), response.email]
      .filter(Boolean)
      .map((s) => printable(s!))
      .join(' · '),
  );

  for (const question of form.questions) {
    const answer = answerTo(response, question);
    keepTogether(doc, 40);
    doc.moveDown(0.7).font('bold').fontSize(10).fillColor(TEXT);
    doc.text(printable(question.title));
    doc.moveDown(0.15).font('regular');
    doc.text(printable(answerText(question, answer)));
    if (question.type === 'single_choice_justified') {
      doc.moveDown(0.15).fillColor(MUTED);
      indented(doc, `Justificativa: ${printable(answer?.text ?? '')}`);
    }
  }
  rule(doc);
}

function answerText(question: Question, answer: Answer | undefined): string {
  switch (question.type) {
    case 'text':
      return answer?.text ?? '';
    case 'multiple_choice':
      // One per line: an option can itself contain a comma ("C, C++").
      return answer?.choices.map((choice) => `• ${choice}`).join('\n') ?? '';
    case 'single_choice':
    case 'single_choice_justified':
      return answer?.choices[0] ?? '';
  }
}

/** Every line indented, not just the first. */
function indented(doc: Doc, text: string): void {
  const indent = 12;
  doc.text(text, MARGIN + indent, doc.y, {
    width: doc.page.width - 2 * MARGIN - indent,
  });
  doc.x = MARGIN;
}

/** A thin line between responses. */
function rule(doc: Doc): void {
  doc.moveDown(1);
  if (doc.y > bottom(doc) - 24) {
    doc.addPage();
    return;
  }
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(doc.page.width - MARGIN, doc.y)
    .lineWidth(0.5)
    .strokeColor(RULE)
    .stroke();
  doc.moveDown(1);
}

/** Starts a new page unless there's room for `height` more points of content. */
function keepTogether(doc: Doc, height: number): void {
  if (doc.y + height > bottom(doc)) doc.addPage();
}

function bottom(doc: Doc): number {
  return doc.page.height - doc.page.margins.bottom;
}

function pageNumbers(doc: Doc): void {
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    // Text inside the bottom margin would otherwise start a new page.
    doc.page.margins.bottom = 0;
    doc.font('regular').fontSize(8).fillColor(MUTED);
    doc.text(
      `Página ${i + 1} de ${count}`,
      MARGIN,
      doc.page.height - MARGIN / 2 - 4,
      { width: doc.page.width - 2 * MARGIN, align: 'center', lineBreak: false },
    );
    doc.page.margins.bottom = MARGIN;
  }
}

/**
 * Characters the fonts can't draw (Chinese, for one) would vanish from the PDF
 * without a trace; they become "�" instead. The CSV keeps the original text.
 */
export function printable(text: string): string {
  return text.replace(/[^\s\p{Default_Ignorable_Code_Point}]/gu, (char) =>
    fonts.every((font) => font.hasGlyphForCodePoint(char.codePointAt(0)!))
      ? char
      : '�',
  );
}
