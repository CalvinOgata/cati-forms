import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const backendUrl = env.BACKEND_URL || 'http://localhost:3000';

	return {
		plugins: [
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				// Built as a SPA: every route falls back to index.html and talks to the NestJS API.
				adapter: adapter({ fallback: 'index.html' })
			})
		],
		server: {
			port: Number(env.FRONTEND_PORT) || 5173,
			// Requests to /api are forwarded to the backend (also applies to `vite preview`).
			proxy: {
				'/api': { target: backendUrl, changeOrigin: true }
			}
		}
	};
});
