<script lang="ts">
	import { typed } from '#lib/auth.svelte.js';
	import type { PageProps } from './$types';

	// `data.user` comes from the (app) layout.
	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Sua conta · Cati Forms</title>
</svelte:head>

<main class="panel">
	<h1>Sua conta</h1>

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
</main>

<style>
	h1 {
		margin-top: 0;
		font-size: 1.5rem;
	}
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
