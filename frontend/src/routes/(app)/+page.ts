import { redirectIfLoggedOut } from '#lib/auth.svelte.js';
import { listForms } from '#lib/forms.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		return { forms: await listForms() };
	} catch (e) {
		redirectIfLoggedOut(e);
		throw e;
	}
};
