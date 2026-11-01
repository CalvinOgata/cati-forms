import { redirect } from '@sveltejs/kit';
import { getSession } from '#lib/auth.svelte.js';
import type { PageLoad } from './$types';

// Already logged in: skip the form.
export const load: PageLoad = async () => {
	if (await getSession()) redirect(307, '/');
};
