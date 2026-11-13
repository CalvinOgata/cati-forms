import type { CreateFormDto, SubmitResponseDto } from './forms.dto.js';
import type { Form } from './forms.types.js';

// Formulário de exemplo, criado no inicio da aplicação, com uma pergunta de cada tipo
export const SAMPLE_FORM: CreateFormDto = {
  title: 'Exemplo: inscrição no Banco de Talentos',
  description: 'Formulário de exemplo, com um tipo de pergunta de cada.',
  collectEmail: true,
  questions: [
    {
      type: 'text',
      title: 'Por que você quer entrar na Cati Jr.?',
      options: [],
    },
    {
      type: 'multiple_choice',
      title: 'Quais áreas te interessam?',
      options: ['Frontend', 'Backend', 'Design', 'Gestão'],
    },
    {
      type: 'single_choice',
      title: 'Em que turno você prefere as reuniões?',
      options: ['Manhã', 'Tarde', 'Noite'],
    },
    {
      type: 'single_choice_justified',
      title: 'Quantas horas por semana você pode dedicar?',
      options: ['Até 5 horas', 'De 5 a 10 horas', 'Mais de 10 horas'],
    },
  ],
};

// uma resposta simples ao formulário, servindo de exemplo
export function sampleResponse(form: Form): SubmitResponseDto {
  const [why, areas, shift, hours] = form.questions;
  return {
    email: 'ana@example.com',
    answers: [
      {
        questionId: why.id,
        choices: [],
        text: 'Quero aprender trabalhando em projetos reais.',
      },
      { questionId: areas.id, choices: ['Frontend', 'Design'], text: '' },
      { questionId: shift.id, choices: ['Tarde'], text: '' },
      {
        questionId: hours.id,
        choices: ['De 5 a 10 horas'],
        text: 'Tenho aulas de manhã e as tardes livres.',
      },
    ],
  };
}
