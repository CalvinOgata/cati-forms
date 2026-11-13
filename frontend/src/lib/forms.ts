import isEmail from 'validator/es/lib/isEmail';
import { api, apiFile } from './api.js';

// Página frontend dos formulários
// validação das informações ocorre tanto aqui quanto no back, para que o usuário não perca tempo

export type QuestionType = 'text' | 'multiple_choice' | 'single_choice' | 'single_choice_justified'; // informação repetida no backend

// tipos de perguntas mostradas na página de formulário
export const QUESTION_TYPES: Record<QuestionType, string> = {
	text: 'Discursiva',
	multiple_choice: 'Múltipla escolha',
	single_choice: 'Escolha única',
	single_choice_justified: 'Escolha única com justificativa'
};

// uma única opção é selecionada
export const isSingleChoice = (type: QuestionType) =>
	type === 'single_choice' || type === 'single_choice_justified';

// a resposta tem texto escrito, o texto em si ou justificativa
export const hasText = (type: QuestionType) =>
	type === 'text' || type === 'single_choice_justified';

export type Question = {
	id: string;
	type: QuestionType;
	title: string;
	// vazio para questões de texto
	options: string[];
};

export type Form = {
	id: string;
	title: string;
	description: string;
	// se o respondente coloca o email ou não (RF07).
	collectEmail: boolean;
	questions: Question[];
	createdBy: string;
	createdAt: string;
};

export type FormSummary = Omit<Form, 'questions' | 'collectEmail'> & {
	questionCount: number;
	responseCount: number;
};

// uma resposta apenas por questão
export type Answer = { questionId: string; choices: string[]; text: string };

export type FormResponse = {
	id: string;
	email: string | null;
	answers: Answer[];
	submittedAt: string;
};

// o formulário e tudo sobre ele, para usuários logados (RN10)
export type FormDetail = Form & { responses: FormResponse[] };

export type NewForm = Pick<Form, 'title' | 'description' | 'collectEmail'> & {
	questions: Omit<Question, 'id'>[];
};

export type NewResponse = { email: string | null; answers: Answer[] };

/** Field errors, keyed by field: `title`, `questions` or a question's index. */
//
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

/** Errors keyed by question id, plus `email`. Every question is required (RN04, RN05). */
export function validateResponse(form: Form, response: NewResponse): Record<string, string> {
	const errors: Record<string, string> = {};
	// The same check as the backend (class-validator's isEmail), so an address
	// accepted here is never turned away after sending.
	if (form.collectEmail && !isEmail(response.email ?? '')) {
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
		case 'single_choice':
		case 'single_choice_justified':
			if (answer?.choices.length !== 1 || !valid(answer.choices[0])) return 'Escolha uma opção.';
			if (question.type === 'single_choice') return null;
			return answer.text.trim() ? null : 'Escreva uma justificativa.';
	}
}

/*
 * Organizing the responses (RN11). The export routes apply the same rules
 * (backend/src/forms/forms.organize.ts), so a file has what the page shows.
 */

export type ResponseView = {
	order: 'newest' | 'oldest';
	/** Text to look for in the answers and the e-mail; empty for every response. */
	search: string;
	/** Only the responses that chose this option. */
	choice: { questionId: string; option: string } | null;
};

/** Numbered in the order it arrived, whatever the order or filter. */
export type NumberedResponse = FormResponse & { number: number };

export function organizeResponses(form: FormDetail, view: ResponseView): NumberedResponse[] {
	const search = fold(view.search.trim());
	const { choice } = view;
	const responses = form.responses
		.map((response, i) => ({ ...response, number: i + 1 }))
		.filter((response) => !search || searchText(response).includes(search))
		.filter(
			(response) =>
				!choice ||
				response.answers.some(
					(a) => a.questionId === choice.questionId && a.choices.includes(choice.option)
				)
		);
	return view.order === 'newest' ? responses.toReversed() : responses;
}

/** The e-mail and every answer, folded for searching. */
function searchText(response: FormResponse): string {
	const fields = response.answers.flatMap((a) => [...a.choices, a.text]);
	// One field per line, so a search can't match across two of them.
	return fold([response.email ?? '', ...fields].join('\n'));
}

/** Ignores case and accents: "acao" finds "Ação". */
function fold(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** GET /api/forms: every form, newest first (RN02, RN10). */
export function listForms(): Promise<FormSummary[]> {
	return api('/forms');
}

/** GET /api/forms/:id: the form with its responses, for logged-in users. */
export function getForm(id: string): Promise<FormDetail> {
	return api(`/forms/${encodeURIComponent(id)}`);
}

/**
 * GET /api/forms/:id/export.csv or .pdf: the responses as a file (RF15, RF16),
 * organized as on the page (RN11).
 */
export function exportResponses(id: string, format: 'csv' | 'pdf', view: ResponseView) {
	const query = new URLSearchParams({ order: view.order });
	if (view.search.trim()) query.set('q', view.search.trim());
	if (view.choice) {
		query.set('question', view.choice.questionId);
		query.set('option', view.choice.option);
	}
	return apiFile(`/forms/${encodeURIComponent(id)}/export.${format}?${query}`);
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
