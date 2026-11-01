import { error } from '@sveltejs/kit';
import { ApiError } from '#lib/api.js';
import { getPublicForm } from '#lib/forms.js';
import type { PageLoad } from './$types';

// Public: no session check, anyone with the link can answer (RN09).
export const load: PageLoad = async ({ params }) => {
	try {
		return { form: await getPublicForm(params.id) };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) error(404, e.message);
		throw e;
	}
};
