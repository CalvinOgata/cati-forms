import {
  exportFileName,
  formatDateTime,
  sortableDateTime,
} from './forms.export.js';

describe('export helpers', () => {
  it('shows times as in São Paulo, wherever the server runs', () => {
    // 01:30 UTC on the 4th is still the 3rd in São Paulo (UTC−3).
    expect(formatDateTime('2026-11-04T01:30:00.000Z')).toBe(
      '03/11/2026, 22:30',
    );
    expect(sortableDateTime('2026-11-04T01:30:05.000Z')).toBe(
      '2026-11-03 22:30:05',
    );
  });

  it('names the file after the form, in plain ASCII', () => {
    expect(
      exportFileName({ title: 'Avaliação técnica: “Stack” & ação!' }, 'csv'),
    ).toBe('respostas-avaliacao-tecnica-stack-acao.csv');
    expect(exportFileName({ title: '日本語' }, 'pdf')).toBe(
      'respostas-formulario.pdf',
    );
    expect(exportFileName({ title: 'a'.repeat(200) }, 'pdf')).toBe(
      `respostas-${'a'.repeat(60)}.pdf`,
    );
  });
});
