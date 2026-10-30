<script lang="ts">
	import { api } from '#lib/api.js';

	type Health = { status: 'ok'; timestamp: string };

	const health = api<Health>('/health');
</script>

<main>
	<h1>Cati Forms</h1>
	<p>
		API:
		{#await health}
			verificando…
		{:then}
			<strong class="ok">online</strong>
		{:catch}
			<strong class="err">offline</strong>
		{/await}
	</p>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: system-ui, sans-serif;
	}
	.ok {
		color: #15803d;
	}
	.err {
		color: #b91c1c;
	}
</style>
