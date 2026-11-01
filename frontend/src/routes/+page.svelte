<script lang="ts">
	import { goto } from '$app/navigation';
	import { logout, typed } from '#lib/auth.svelte.js';
	import type { PageProps } from './$types';

	// `data` is what +page.ts returned.
	let { data }: PageProps = $props();

	async function handleLogout() {
		await logout();
		await goto('/login');
	}
</script>

<main class="card">
	<h1>Olá, {data.user.username}!</h1>

	<dl>
		<dt>Usuário</dt>
		<dd>{data.user.username}</dd>

		<dt>Senha</dt>
		<dd>
			{#if typed.password}
				<code>{typed.password}</code>
			{:else}
				<span class="muted">indisponível após recarregar a página</span>
			{/if}
		</dd>
	</dl>

	<p class="muted">
		A senha aparece só para demonstração: ela vem do formulário que você acabou de enviar. O
		servidor guarda apenas o hash e nunca a devolve.
	</p>

	<button type="button" onclick={handleLogout}>Sair</button>
</main>

<style>
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem 1rem;
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
</style>
