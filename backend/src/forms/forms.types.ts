// o que a API dos formulários recebe e envia
// o frontend copia esses tipos em frontend/src/lib/forms.ts

export const QUESTION_TYPES = [
  'text',
  'multiple_choice',
  'single_choice',
  'single_choice_justified',
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  // vazio para questões de texto apenas
  options: string[];
}

export interface Form {
  id: string;
  title: string;
  description: string;
  // o formulário deve coletar o email do respondente? (RF07)
  collectEmail: boolean;
  questions: Question[];
  createdBy: string;
  createdAt: string;
}

export interface FormSummary {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  questionCount: number;
  responseCount: number;
}


// uma resposta por questão, a caixa 'choices' guarda as opções selecionadas (uma ou múltiplas)
// caixa de texto para questões com justificativa ou discursivas, vazia caso contrário
export interface Answer {
  questionId: string;
  choices: string[];
  text: string;
}

export interface FormResponse {
  id: string;
  email: string | null;
  answers: Answer[];
  submittedAt: string;
}

// detalhes do formulário (incluindo suas respostas), para usuários logados (RN10)
export interface FormDetail extends Form {
  responses: FormResponse[];
}
