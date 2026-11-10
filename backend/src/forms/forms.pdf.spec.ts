import { printable, responsesPdf } from './forms.pdf.js';
import type { FormDetail, FormResponse } from './forms.types.js';

const FORM: FormDetail = {
  id: 'f1',
  title: 'Pesquisa',
  description: 'Linha 1\nLinha 2',
  collectEmail: true,
  createdBy: 'ana',
  createdAt: '2026-11-03T12:00:00.000Z',
  questions: [
    { id: 'q1', type: 'text', title: 'Conte sobre você', options: [] },
    {
      id: 'q2',
      type: 'single_choice_justified',
      title: 'Front ou back?',
      options: ['Front', 'Back'],
    },
  ],
  responses: [],
};

const response = (n: number): FormResponse => ({
  id: `r${n}`,
  email: `pessoa${n}@example.com`,
  submittedAt: '2026-11-03T18:00:00.000Z',
  answers: [
    {
      questionId: 'q1',
      choices: [],
      text: 'Uma resposta comprida. '.repeat(20),
    },
    { questionId: 'q2', choices: ['Back'], text: 'Gosto de APIs.' },
  ],
});

/** Page objects in the file (not the page tree, which is "/Type /Pages"). */
const pageCount = (pdf: Buffer) =>
  pdf.toString('latin1').match(/\/Type \/Page\b(?!s)/g)?.length ?? 0;

describe('responsesPdf (RF16)', () => {
  it('makes a one-page PDF when there are no responses', async () => {
    const pdf = await responsesPdf(FORM);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1').trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pageCount(pdf)).toBe(1);
  });

  it('adds pages as the responses grow', async () => {
    const pdf = await responsesPdf({
      ...FORM,
      responses: Array.from({ length: 20 }, (_, i) => response(i + 1)),
    });
    expect(pageCount(pdf)).toBeGreaterThan(3);
  });

  it('embeds its font, so any Latin, Greek or Cyrillic text shows', async () => {
    const pdf = (await responsesPdf(FORM)).toString('latin1');
    expect(pdf).toContain('/FontFile2');
    expect(pdf).toContain('DejaVuSans');
  });

  it('marks characters the font lacks instead of dropping them', () => {
    expect(printable('ação → ✓ α Ж 😀')).toBe('ação → ✓ α Ж 😀');
    expect(printable('日本 fim')).toBe('�� fim');
    // Invisible joiners and variation selectors are left alone.
    expect(printable('❤️')).toBe('❤️');
  });
});
