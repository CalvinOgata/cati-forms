<script lang="ts">
	import { page } from '$app/state';
	import { formatDateTime, plural } from '#lib/format.js';
	import { QUESTION_TYPES } from '#lib/forms.js';
	import Icon from '#lib/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const form = $derived(data.form);
	/** The public answer page (RF08). */
	const link = $derived(`${page.url.origin}/f/${form.id}`);
	/** Newest first, numbered in the order they arrived. */
	const responses = $derived(
		form.responses.map((response, i) => ({ ...response, number: i + 1 })).toReversed()
	);

	let tab = $state<'questions' | 'responses'>('questions');
	let copied = $state(false);
	let linkInput: HTMLInputElement;

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// No clipboard access (e.g. plain http): select it so the user can copy.
			linkInput.select();
		}
	}

	function answerFor(response: (typeof responses)[number], questionId: string) {
		return response.answers.find((a) => a.questionId === questionId);
	}
</script>

<svelte:head>
	<title>{form.title} · Cati Forms</title>
</svelte:head>

{#if page.url.searchParams.has('created')}
	<p class="notice" role="status">
		Formulário criado! Envie o link abaixo para quem deve responder.
	</p>
{/if}

<section class="panel form-head">
	<h1>{form.title}</h1>
	{#if form.description}
		<p class="prewrap">{form.description}</p>
	{/if}
	<p class="muted">
		Criado por <strong>{form.createdBy}</strong> em {formatDateTime(form.createdAt)} ·
		{form.collectEmail ? 'Pede e-mail de contato' : 'Não pede e-mail'}
	</p>
</section>

<section class="panel share">
	<h2>Link para responder</h2>
	<div class="share-row">
		<input
			bind:this={linkInput}
			value={link}
			readonly
			aria-label="Link para responder"
			onfocus={(e) => e.currentTarget.select()}
		/>
		<button type="button" onclick={copyLink}>
			<Icon name="copy" />
			{copied ? 'Copiado!' : 'Copiar'}
		</button>
		<a class="button secondary" href="/f/{form.id}" target="_blank" rel="noopener">
			<Icon name="external" /> Abrir
		</a>
	</div>
	<p class="muted">Qualquer pessoa com o link pode responder, sem precisar de conta.</p>
</section>

<div class="tabs" role="tablist">
	<button
		type="button"
		role="tab"
		aria-selected={tab === 'questions'}
		onclick={() => (tab = 'questions')}
	>
		Perguntas ({form.questions.length})
	</button>
	<button
		type="button"
		role="tab"
		aria-selected={tab === 'responses'}
		onclick={() => (tab = 'responses')}
	>
		Respostas ({form.responses.length})
	</button>
</div>

{#if tab === 'questions'}
	<ol class="list">
		{#each form.questions as question (question.id)}
			<li class="panel">
				<h3>{question.title}</h3>
				<p class="muted">{QUESTION_TYPES[question.type]}</p>
				{#if question.options.length}
					<ul class="options">
						{#each question.options as option (option)}
							<li class:round={question.type === 'single_choice_justified'}>{option}</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ol>
{:else if responses.length === 0}
	<p class="panel empty">Nenhuma resposta ainda. Compartilhe o link para começar a receber.</p>
{:else}
	<ol class="list">
		{#each responses as response (response.id)}
			<li class="panel">
				<div class="response-head">
					<h3>Resposta {response.number}</h3>
					<span class="muted">{formatDateTime(response.submittedAt)}</span>
				</div>
				{#if response.email}
					<p><a href="mailto:{response.email}">{response.email}</a></p>
				{/if}
				<dl>
					{#each form.questions as question (question.id)}
						{@const answer = answerFor(response, question.id)}
						<dt>{question.title}</dt>
						<dd>
							{#if question.type === 'text'}
								<span class="prewrap">{answer?.text}</span>
							{:else if question.type === 'multiple_choice'}
								{answer?.choices.join(', ')}
							{:else}
								{answer?.choices[0]}
								<span class="justification prewrap">{answer?.text}</span>
							{/if}
						</dd>
					{/each}
				</dl>
			</li>
		{/each}
	</ol>
{/if}

<style>
	.panel {
		display: grid;
		gap: 0.5rem;
	}
	p,
	h2,
	h3 {
		margin: 0;
	}
	h2 {
		font-size: 1.1rem;
	}
	h3 {
		font-size: 1rem;
		overflow-wrap: anywhere;
	}
	.share-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.share-row input {
		flex: 1 1 14rem;
		min-width: 0;
	}
	.tabs {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid var(--border);
	}
	.tabs button {
		color: var(--muted);
		background: transparent;
		border-radius: 8px 8px 0 0;
		border-bottom: 3px solid transparent;
	}
	.tabs button[aria-selected='true'] {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}
	.list {
		display: grid;
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.options {
		display: grid;
		gap: 0.3rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* Same empty checkbox / radio markers as the builder. */
	.options li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		overflow-wrap: anywhere;
	}
	.options li::before {
		content: '';
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		border: 2px solid var(--border);
		border-radius: 3px;
	}
	.options li.round::before {
		border-radius: 50%;
	}
	.empty {
		text-align: center;
	}
	.response-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
	}
	dl {
		display: grid;
		gap: 0.25rem;
		margin: 0;
	}
	dt {
		margin-top: 0.5rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.justification {
		display: block;
		margin-top: 0.25rem;
		padding-left: 0.75rem;
		color: var(--muted);
		border-left: 3px solid var(--border);
	}
</style>
