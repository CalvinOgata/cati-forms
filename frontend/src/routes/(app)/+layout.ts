import { redirect } from '@sveltejs/kit';
import { getSession } from '#lib/auth.svelte.js';
import type { LayoutLoad } from './$types';

// Every page in the (app) group needs a login (RN03); the user is shared with all of them.
export const load: LayoutLoad = async () => {
	const user = await getSession();
	if (!user) redirect(307, '/login');
	return { user };
};
