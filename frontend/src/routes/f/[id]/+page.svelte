<script lang="ts">
	import { ApiError } from '#lib/api.js';
	import { showFirstInvalid } from '#lib/dom.js';
	import { submitResponse, validateResponse, type Form, type NewResponse } from '#lib/forms.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const form = $derived(data.form);

	/** What the respondent has filled in, per question id. */
	type Draft = { text: string; choices: string[]; choice: string };
	const emptyDrafts = (form: Form): Record<string, Draft> =>
		Object.fromEntries(form.questions.map((q) => [q.id, { text: '', choices: [], choice: '' }]));

	let email = $state('');
	let drafts = $state<Record<string, Draft>>({});
	/** Errors only show after the first attempt to send. */
	let attempted = $state(false);
	let pending = $state(false);
	let serverError = $state<string | null>(null);
	let sent = $state(false);

	// Start blank, and again if the link changes to another form.
	$effect.pre(() => {
		drafts = emptyDrafts(form);
	});

	const response: NewResponse = $derived({
		email: form.collectEmail ? email.trim() : null,
		answers: form.questions.map((q) => {
			const draft = drafts[q.id];
			return {
				questionId: q.id,
				choices:
					q.type === 'multiple_choice'
						? (draft?.choices ?? [])
						: q.type === 'single_choice_justified' && draft?.choice
							? [draft.choice]
							: [],
				text: q.type === 'multiple_choice' ? '' : (draft?.text ?? '')
			};
		})
	});
	const errors = $derived(attempted ? validateResponse(form, response) : {});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		attempted = true;
		serverError = null;
		if (Object.keys(validateResponse(form, response)).length) {
			showFirstInvalid();
			return;
		}
		pending = true;
		try {
			await submitResponse(form.id, response);
			sent = true;
			window.scrollTo({ top: 0 });
		} catch (e) {
			serverError = e instanceof ApiError ? e.message : 'Não foi possível enviar a resposta.';
		} finally {
			pending = false;
		}
	}

	function answerAgain() {
		email = '';
		drafts = emptyDrafts(form);
		attempted = false;
		sent = false;
	}
</script>

<svelte:head>
	<title>{form.title}</title>
</svelte:head>

<main class="page">
	<section class="panel form-head">
		<h1>{form.title}</h1>
		{#if sent}
			<p>Sua resposta foi registrada. Obrigado!</p>
			<button type="button" class="secondary send-again" onclick={answerAgain}>
				Enviar outra resposta
			</button>
		{:else}
			{#if form.description}
				<p class="prewrap">{form.description}</p>
			{/if}
			<p class="muted">Todas as perguntas são obrigatórias.</p>
		{/if}
	</section>

	{#if !sent}
		<form onsubmit={handleSubmit} novalidate>
			{#if form.collectEmail}
				<section class="panel" class:invalid={errors.email}>
					<label>
						E-mail de contato
						<input
							bind:value={email}
							type="email"
							autocomplete="email"
							placeholder="seu@email.com"
						/>
					</label>
					{#if errors.email}
						<p class="field-error">{errors.email}</p>
					{/if}
				</section>
			{/if}

			{#each form.questions as question (question.id)}
				{@const draft = drafts[question.id]}
				{#if draft}
					<section
						class="panel"
						class:invalid={errors[question.id]}
						role="group"
						aria-labelledby="{question.id}-title"
					>
						<h2 id="{question.id}-title">{question.title}</h2>

						{#if question.type === 'text'}
							<textarea
								bind:value={draft.text}
								aria-labelledby="{question.id}-title"
								placeholder="Sua resposta"
								rows="3"></textarea>
						{:else}
							<div class="options">
								{#each question.options as option (option)}
									<label class="check">
										{#if question.type === 'multiple_choice'}
											<input type="checkbox" value={option} bind:group={draft.choices} />
										{:else}
											<input
												type="radio"
												name={question.id}
												value={option}
												bind:group={draft.choice}
											/>
										{/if}
										{option}
									</label>
								{/each}
							</div>
						{/if}

						{#if question.type === 'single_choice_justified'}
							<label>
								Justificativa
								<textarea bind:value={draft.text} placeholder="Explique sua escolha" rows="2"
								></textarea>
							</label>
						{/if}

						{#if errors[question.id]}
							<p class="field-error">{errors[question.id]}</p>
						{/if}
					</section>
				{/if}
			{/each}

			{#if serverError}
				<p class="error" role="alert">{serverError}</p>
			{/if}

			<div>
				<button disabled={pending}>{pending ? 'Enviando…' : 'Enviar'}</button>
			</div>
		</form>
	{/if}
</main>

<style>
	form {
		gap: 1rem;
	}
	.panel {
		display: grid;
		gap: 0.75rem;
	}
	p {
		margin: 0;
	}
	h2 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 500;
		overflow-wrap: anywhere;
	}
	.options {
		display: grid;
		gap: 0.25rem;
	}
	.options label {
		padding: 0.35rem 0;
		overflow-wrap: anywhere;
	}
	.send-again {
		justify-self: start;
	}
</style>
