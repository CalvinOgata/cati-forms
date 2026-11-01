import { api } from './api.js';

/*
 * Forms client: types, validation and calls to /api/forms. The backend applies
 * the same rules (backend/src/forms/forms.service.ts); checking here too lets the
 * pages point at the exact field before anything is sent.
 */

export type QuestionType = 'text' | 'multiple_choice' | 'single_choice_justified';

/** Labels shown in the builder and on the form page. */
export const QUESTION_TYPES: Record<QuestionType, string> = {
	text: 'Discursiva',
	multiple_choice: 'Múltipla escolha',
	single_choice_justified: 'Escolha única com justificativa'
};

export type Question = {
	id: string;
	type: QuestionType;
	title: string;
	/** Empty for text questions. */
	options: string[];
};

export type Form = {
	id: string;
	title: string;
	description: string;
	/** Whether respondents must give a contact e-mail (RF07). */
	collectEmail: boolean;
	questions: Question[];
	createdBy: string;
	createdAt: string;
};

export type FormSummary = Omit<Form, 'questions' | 'collectEmail'> & {
	questionCount: number;
	responseCount: number;
};

/**
 * One answer per question. `choices` holds the selected options (exactly one for
 * single choice, none for text); `text` holds the written answer or, for single
 * choice, the justification.
 */
export type Answer = { questionId: string; choices: string[]; text: string };

export type FormResponse = {
	id: string;
	email: string | null;
	answers: Answer[];
	submittedAt: string;
};

/** A form and everything about it, for logged-in users (RN10). */
export type FormDetail = Form & { responses: FormResponse[] };

export type NewForm = Pick<Form, 'title' | 'description' | 'collectEmail'> & {
	questions: Omit<Question, 'id'>[];
};

export type NewResponse = { email: string | null; answers: Answer[] };

/** Field errors, keyed by field: `title`, `questions` or a question's index. */
export type FormErrors = Record<string, string>;

export function validateNewForm(form: NewForm): FormErrors {
	const errors: FormErrors = {};
	if (!form.title.trim()) errors.title = 'Dê um título ao formulário.';
	if (form.questions.length === 0) errors.questions = 'Adicione pelo menos uma pergunta.';

	form.questions.forEach((question, index) => {
		const options = question.options.map((option) => option.trim());
		if (!question.title.trim()) {
			errors[index] = 'Escreva a pergunta.';
		} else if (question.type === 'text') {
			// No options to check.
		} else if (options.some((option) => !option)) {
			errors[index] = 'Preencha ou remova as opções vazias.';
		} else if (options.length < 2) {
			errors[index] = 'Adicione pelo menos duas opções.';
		} else if (new Set(options).size !== options.length) {
			errors[index] = 'As opções não podem se repetir.';
		}
	});
	return errors;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Errors keyed by question id, plus `email`. Every question is required (RN04, RN05). */
export function validateResponse(form: Form, response: NewResponse): Record<string, string> {
	const errors: Record<string, string> = {};
	if (form.collectEmail && !EMAIL_PATTERN.test(response.email ?? '')) {
		errors.email = 'Informe um e-mail válido.';
	}
	for (const question of form.questions) {
		const answer = response.answers.find((a) => a.questionId === question.id);
		const error = answerError(question, answer);
		if (error) errors[question.id] = error;
	}
	return errors;
}

function answerError(question: Question, answer: Answer | undefined): string | null {
	const valid = (choice: string) => question.options.includes(choice);
	switch (question.type) {
		case 'text':
			return answer?.text.trim() ? null : 'Esta pergunta é obrigatória.';
		case 'multiple_choice':
			// Any number of options may be checked, but at least one (RN06).
			return answer?.choices.length && answer.choices.every(valid)
				? null
				: 'Marque pelo menos uma opção.';
		case 'single_choice_justified':
			if (answer?.choices.length !== 1 || !valid(answer.choices[0])) return 'Escolha uma opção.';
			return answer.text.trim() ? null : 'Escreva uma justificativa.';
	}
}

/** GET /api/forms: every form, newest first (RN02, RN10). */
export function listForms(): Promise<FormSummary[]> {
	return api('/forms');
}

/** GET /api/forms/:id: the form with its responses, for logged-in users. */
export function getForm(id: string): Promise<FormDetail> {
	return api(`/forms/${encodeURIComponent(id)}`);
}

/** GET /api/public/forms/:id: what someone with the link sees, no login needed (RN09). */
export function getPublicForm(id: string): Promise<Form> {
	return api(`/public/forms/${encodeURIComponent(id)}`);
}

/** POST /api/forms: creates the form; it can't be edited or deleted afterwards (RN07). */
export function createForm(input: NewForm): Promise<Form> {
	return api('/forms', { method: 'POST', body: JSON.stringify(input) });
}

/** POST /api/public/forms/:id/responses: anyone with the link can answer (RF09). */
export async function submitResponse(formId: string, input: NewResponse): Promise<void> {
	await api(`/public/forms/${encodeURIComponent(formId)}/responses`, {
		method: 'POST',
		body: JSON.stringify(input)
	});
}
