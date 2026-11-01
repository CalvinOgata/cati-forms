<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { api } from '#lib/api.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const health = api<{ status: 'ok' }>('/health');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<footer class="muted">
	API:
	{#await health}
		verificando…
	{:then}
		<span class="ok">online</span>
	{:catch}
		<span class="offline">offline</span>
	{/await}
</footer>

<style>
	footer {
		text-align: center;
		padding-bottom: 1rem;
	}
	.ok {
		color: var(--ok);
	}
	.offline {
		color: var(--error-text);
	}
</style>
