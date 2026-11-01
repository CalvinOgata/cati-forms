import { error } from '@sveltejs/kit';
import { ApiError } from '#lib/api.js';
import { getForm } from '#lib/forms.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		return { form: await getForm(params.id) };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) error(404, e.message);
		throw e;
	}
};
