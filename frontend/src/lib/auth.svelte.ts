import { api, ApiError } from './api.js';

/** What the API returns about a user. */
export type User = { username: string; createdAt: string };

/**
 * The password typed in the last login or sign-up, kept only in this tab's
 * memory so the home page can display it (a demo requirement). The server only
 * stores a hash and never sends the password back, so it's gone after a reload.
 */
export const typed = $state<{ password: string | null }>({ password: null });

/** The logged-in user, or null when there's no valid session. */
export async function getSession(): Promise<User | null> {
	try {
		return await api<User>('/auth/me');
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) return null;
		throw error;
	}
}

export async function login(username: string, password: string): Promise<User> {
	const user = await api<User>('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ username, password })
	});
	typed.password = password;
	return user;
}

export async function signup(username: string, password: string): Promise<User> {
	const user = await api<User>('/auth/signup', {
		method: 'POST',
		body: JSON.stringify({ username, password })
	});
	typed.password = password;
	return user;
}

export async function logout(): Promise<void> {
	await api<void>('/auth/logout', { method: 'POST' });
	typed.password = null;
}
