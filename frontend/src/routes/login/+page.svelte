<script lang="ts">
	import { goto } from '$app/navigation';
	import { ApiError } from '#lib/api.js';
	import { login } from '#lib/auth.svelte.js';

	let username = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let pending = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		pending = true;
		try {
			await login(username, password);
			await goto('/');
		} catch (e) {
			error = e instanceof ApiError ? e.message : 'Não foi possível conectar à API.';
		} finally {
			pending = false;
		}
	}
</script>

<svelte:head>
	<title>Entrar · Cati Forms</title>
</svelte:head>

<main class="card">
	<h1>Entrar</h1>

	<form onsubmit={handleSubmit}>
		<label>
			Usuário
			<input bind:value={username} name="username" autocomplete="username" required />
		</label>

		<label>
			Senha
			<input
				bind:value={password}
				name="password"
				type="password"
				autocomplete="current-password"
				required
			/>
		</label>

		{#if error}
			<p class="error" role="alert">{error}</p>
		{/if}

		<button disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</button>
	</form>

	<p class="muted">Ainda não tem conta? <a href="/signup">Cadastre-se</a></p>
</main>
