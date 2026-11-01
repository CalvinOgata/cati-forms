<script lang="ts">
	import { goto } from '$app/navigation';
	import { ApiError } from '#lib/api.js';
	import { signup } from '#lib/auth.svelte.js';

	let username = $state('');
	let password = $state('');
	let confirmation = $state('');
	let error = $state<string | null>(null);
	let pending = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (password !== confirmation) {
			error = 'As senhas não coincidem.';
			return;
		}
		error = null;
		pending = true;
		try {
			// The server checks the rules and whether the name is taken (409).
			await signup(username, password);
			await goto('/');
		} catch (e) {
			error = e instanceof ApiError ? e.message : 'Não foi possível conectar à API.';
		} finally {
			pending = false;
		}
	}
</script>

<svelte:head>
	<title>Cadastro · Cati Forms</title>
</svelte:head>

<main class="card">
	<h1>Criar conta</h1>

	<form onsubmit={handleSubmit}>
		<label>
			Usuário
			<input
				bind:value={username}
				name="username"
				autocomplete="username"
				minlength="3"
				maxlength="32"
				required
			/>
		</label>

		<label>
			Senha
			<input
				bind:value={password}
				name="password"
				type="password"
				autocomplete="new-password"
				minlength="6"
				maxlength="128"
				required
			/>
		</label>

		<label>
			Confirmar senha
			<input
				bind:value={confirmation}
				name="confirmation"
				type="password"
				autocomplete="new-password"
				required
			/>
		</label>

		{#if error}
			<p class="error" role="alert">{error}</p>
		{/if}

		<button disabled={pending}>{pending ? 'Criando…' : 'Criar conta'}</button>
	</form>

	<p class="muted">Já tem conta? <a href="/login">Entrar</a></p>
</main>
