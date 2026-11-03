// What the forms API sends and receives. The frontend mirrors these types in
// frontend/src/lib/forms.ts.

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
  /** Empty for text questions. */
  options: string[];
}

export interface Form {
  id: string;
  title: string;
  description: string;
  /** Whether respondents must give a contact e-mail (RF07). */
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

/**
 * One answer per question. `choices` holds the selected options (exactly one
 * for single choice, none for text); `text` holds the written answer or, for
 * single choice with justification, the justification (empty otherwise).
 */
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

/** A form and everything about it, for logged-in users (RN10). */
export interface FormDetail extends Form {
  responses: FormResponse[];
}
