import { responsesCsv } from './forms.csv.js';
import type { FormDetail } from './forms.types.js';

const FORM: FormDetail = {
  id: 'f1',
  title: 'Pesquisa',
  description: '',
  collectEmail: true,
  createdBy: 'ana',
  createdAt: '2026-11-03T12:00:00.000Z',
  questions: [
    { id: 'q1', type: 'text', title: 'Conte "algo"', options: [] },
    {
      id: 'q2',
      type: 'multiple_choice',
      title: 'Linguagens',
      options: ['Go', 'C, C++'],
    },
    { id: 'q3', type: 'single_choice', title: 'Turno', options: ['Manhã'] },
    {
      id: 'q4',
      type: 'single_choice_justified',
      title: 'Front ou back?',
      options: ['Front', 'Back'],
    },
  ],
  responses: [
    {
      id: 'r1',
      email: 'joao@example.com',
      // 18:08 UTC is 15:08 in São Paulo.
      submittedAt: '2026-11-03T18:08:37.807Z',
      answers: [
        { questionId: 'q1', choices: [], text: 'Linha 1\nLinha 2' },
        { questionId: 'q2', choices: ['Go', 'C, C++'], text: '' },
        { questionId: 'q3', choices: ['Manhã'], text: '' },
        { questionId: 'q4', choices: ['Back'], text: 'Gosto de APIs.' },
      ],
    },
  ],
};

describe('responsesCsv (RF15)', () => {
  it('has a BOM, CRLF line endings and every cell quoted', () => {
    const csv = responsesCsv(FORM);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      '"Enviada em","E-mail","Conte ""algo""","Linguagens","Turno",' +
        '"Front ou back?","Front ou back? (justificativa)"',
      '"2026-11-03 15:08:37","joao@example.com","Linha 1\nLinha 2",' +
        '"Go; C, C++","Manhã","Back","Gosto de APIs."',
      '',
    ]);
  });

  it('leaves out the e-mail column when the form does not ask for it', () => {
    const [header, row] = responsesCsv({ ...FORM, collectEmail: false })
      .slice(1)
      .split('\r\n');
    expect(header.startsWith('"Enviada em","Conte')).toBe(true);
    expect(row).not.toContain('joao@example.com');
  });

  it('keeps answers that look like formulas from running', () => {
    const csv = responsesCsv({
      ...FORM,
      responses: [
        {
          ...FORM.responses[0],
          answers: [
            { questionId: 'q1', choices: [], text: '=HYPERLINK("x")' },
            { questionId: 'q2', choices: ['Go'], text: '' },
            { questionId: 'q3', choices: ['Manhã'], text: '' },
            { questionId: 'q4', choices: ['Back'], text: '@soma' },
          ],
        },
      ],
    });
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(`"'@soma"`);
  });

  it('is just the header when there are no responses', () => {
    expect(responsesCsv({ ...FORM, responses: [] }).split('\r\n')).toHaveLength(
      2,
    );
  });
});
