<script lang="ts">
	import { goto } from '$app/navigation';
	import { logout } from '#lib/auth.svelte.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	async function handleLogout() {
		await logout();
		await goto('/login');
	}
</script>

<header>
	<a class="brand" href="/">Cati Forms</a>
	<nav>
		<a href="/account" title="Sua conta">{data.user.username}</a>
		<button type="button" class="ghost" onclick={handleLogout}>Sair</button>
	</nav>
</header>

<div class="page">
	{@render children()}
</div>

<style>
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 1rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}
	.brand {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--text);
		text-decoration: none;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}
	nav a {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
