<script lang="ts">
	import Icon from '#lib/Icon.svelte';
	import { formatDateTime, plural } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Formulários · Cati Forms</title>
</svelte:head>

<div class="heading">
	<div>
		<h1>Formulários</h1>
		<p class="muted">Todos os formulários da equipe, de qualquer membro.</p>
	</div>
	<a class="button" href="/forms/new"><Icon name="plus" /> Novo formulário</a>
</div>

{#if data.forms.length === 0}
	<p class="panel empty">
		Nenhum formulário ainda. <a href="/forms/new">Crie o primeiro</a>.
	</p>
{:else}
	<ul>
		{#each data.forms as form (form.id)}
			<li>
				<a class="panel" href="/forms/{form.id}">
					<h2>{form.title}</h2>
					{#if form.description}
						<p class="description">{form.description}</p>
					{/if}
					<p class="muted">
						{plural(form.questionCount, 'pergunta', 'perguntas')} ·
						<strong>{plural(form.responseCount, 'resposta', 'respostas')}</strong>
					</p>
					<p class="muted">Por {form.createdBy} em {formatDateTime(form.createdAt)}</p>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.heading {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	h1 {
		margin: 0;
		font-size: 1.75rem;
	}
	.heading p {
		margin: 0;
	}
	.empty {
		margin: 0;
		text-align: center;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li a {
		display: grid;
		gap: 0.25rem;
		height: 100%;
		align-content: start;
		color: inherit;
		text-decoration: none;
		border-top: 6px solid var(--accent);
	}
	li a:hover {
		border-color: var(--accent);
	}
	h2 {
		margin: 0 0 0.25rem;
		font-size: 1.1rem;
		overflow-wrap: anywhere;
	}
	p {
		margin: 0;
	}
	.description {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
