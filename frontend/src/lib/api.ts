const API_BASE = '/api';

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
	}
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		...init,
		headers: { 'Content-Type': 'application/json', ...init?.headers }
	});
	if (!res.ok) {
		throw new ApiError(res.status, await errorMessage(res));
	}
	if (res.status === 204) {
		return undefined as T;
	}
	return res.json() as Promise<T>;
}

/** NestJS errors carry `message` as a string or, for validation, a list of strings. */
async function errorMessage(res: Response): Promise<string> {
	try {
		const { message } = await res.json();
		if (Array.isArray(message)) return message.join(' ');
		if (typeof message === 'string') return message;
	} catch {
		// Not JSON (e.g. the API is down and the proxy answered); use the status below.
	}
	return `${res.status} ${res.statusText}`;
}
