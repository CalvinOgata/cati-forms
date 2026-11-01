import { redirect } from '@sveltejs/kit';
import { getSession } from '#lib/auth.svelte.js';
import type { PageLoad } from './$types';

// Runs before the home page renders: only logged-in users get past this point.
export const load: PageLoad = async () => {
	const user = await getSession();
	if (!user) redirect(307, '/login');
	return { user };
};
