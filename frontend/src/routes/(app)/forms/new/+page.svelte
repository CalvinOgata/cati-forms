<script lang="ts">
	import { flip } from 'svelte/animate';
	import { beforeNavigate, goto } from '$app/navigation';
	import { ApiError } from '#lib/api.js';
	import { focusById, showFirstInvalid } from '#lib/dom.js';
	import {
		createForm,
		QUESTION_TYPES,
		validateNewForm,
		type NewForm,
		type QuestionType
	} from '#lib/forms.js';
	import Icon from '#lib/Icon.svelte';

	// Draft items carry a local id so Svelte can keep each box (and its focus) when the list changes.
	type DraftOption = { id: number; label: string };
	type DraftQuestion = { id: number; type: QuestionType; title: string; options: DraftOption[] };

	let nextId = 0;
	const newOption = (label: string): DraftOption => ({ id: nextId++, label });
	const newQuestion = (type: QuestionType, title = '', labels = ['Opção 1']): DraftQuestion => ({
		id: nextId++,
		type,
		title,
		options: labels.map(newOption)
	});

	let title = $state('');
	let description = $state('');
	let collectEmail = $state(false);
	let questions = $state<DraftQuestion[]>([newQuestion('multiple_choice')]);

	/** Errors only show after the first attempt to create. */
	let attempted = $state(false);
	let pending = $state(false);
	let serverError = $state<string | null>(null);
	let confirmDialog: HTMLDialogElement;
	let touched = false;
	let saved = false;

	const input: NewForm = $derived({
		title,
		description,
		collectEmail,
		questions: questions.map((q) => ({
			type: q.type,
			title: q.title,
			options: q.type === 'text' ? [] : q.options.map((o) => o.label)
		}))
	});
	const errors = $derived(attempted ? validateNewForm(input) : {});

	beforeNavigate((navigation) => {
		if (!touched || saved) return;
		// Closing or reloading the tab: cancel() makes the browser ask.
		if (navigation.type === 'leave') navigation.cancel();
		else if (!confirm('Descartar este formulário? O que você escreveu será perdido.')) {
			navigation.cancel();
		}
	});

	function addQuestion() {
		// Like Google Forms, a new question starts with the type of the last one.
		const question = newQuestion(questions.at(-1)?.type ?? 'multiple_choice');
		questions.push(question);
		focusById(`q${question.id}-title`);
	}

	function duplicateQuestion(index: number) {
		const { type, title, options } = questions[index];
		questions.splice(
			index + 1,
			0,
			newQuestion(
				type,
				title,
				options.map((o) => o.label)
			)
		);
	}

	function moveQuestion(index: number, offset: -1 | 1) {
		const [question] = questions.splice(index, 1);
		questions.splice(index + offset, 0, question);
	}

	function addOption(question: DraftQuestion, at = question.options.length) {
		const option = newOption(`Opção ${question.options.length + 1}`);
		question.options.splice(at, 0, option);
		focusById(`o${option.id}`, { select: true });
	}

	function optionKeydown(event: KeyboardEvent, question: DraftQuestion, index: number) {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		addOption(question, index + 1);
	}

	function requestCreate() {
		attempted = true;
		serverError = null;
		if (Object.keys(validateNewForm(input)).length) {
			showFirstInvalid();
			return;
		}
		confirmDialog.showModal();
	}

	async function create() {
		pending = true;
		try {
			const form = await createForm(input);
			saved = true;
			await goto(`/forms/${form.id}?created`);
		} catch (e) {
			serverError = e instanceof ApiError ? e.message : 'Não foi possível criar o formulário.';
			confirmDialog.close();
		} finally {
			pending = false;
		}
	}
</script>

<svelte:head>
	<title>Novo formulário · Cati Forms</title>
</svelte:head>

<div class="toolbar">
	<h1>Novo formulário</h1>
	<div class="actions">
		<a class="button secondary" href="/">Cancelar</a>
		<button type="button" onclick={requestCreate}>Criar formulário</button>
	</div>
</div>

{#if serverError}
	<p class="error" role="alert">{serverError}</p>
{/if}

<div class="builder" oninput={() => (touched = true)}>
	<section class="panel form-head" class:invalid={errors.title}>
		<input
			class="title"
			bind:value={title}
			placeholder="Formulário sem título"
			aria-label="Título do formulário"
			maxlength="200"
		/>
		{#if errors.title}
			<p class="field-error">{errors.title}</p>
		{/if}
		<textarea
			bind:value={description}
			placeholder="Descrição (opcional)"
			aria-label="Descrição do formulário"
			rows="2"></textarea>
		<label class="check">
			<input type="checkbox" bind:checked={collectEmail} />
			Pedir o e-mail de contato de quem responder
		</label>
	</section>

	<p class="muted hint">Todas as perguntas serão obrigatórias para quem responder.</p>

	{#each questions as question, index (question.id)}
		<section
			class="panel question"
			class:invalid={errors[index]}
			aria-label="Pergunta {index + 1}"
			animate:flip={{ duration: 200 }}
		>
			<div class="question-head">
				<input
					id="q{question.id}-title"
					bind:value={question.title}
					placeholder="Pergunta"
					aria-label="Texto da pergunta {index + 1}"
				/>
				<select bind:value={question.type} aria-label="Tipo da pergunta {index + 1}">
					{#each Object.entries(QUESTION_TYPES) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
			</div>

			{#if question.type === 'text'}
				<p class="sample">Resposta em texto</p>
			{:else}
				<ul class="options">
					{#each question.options as option, optionIndex (option.id)}
						<li>
							<span class="marker" class:round={question.type === 'single_choice_justified'}></span>
							<input
								id="o{option.id}"
								bind:value={option.label}
								aria-label="Opção {optionIndex + 1}"
								onfocus={(e) => e.currentTarget.select()}
								onkeydown={(e) => optionKeydown(e, question, optionIndex)}
							/>
							<button
								type="button"
								class="ghost icon"
								title="Remover opção"
								aria-label="Remover opção {optionIndex + 1}"
								disabled={question.options.length === 1}
								onclick={() => question.options.splice(optionIndex, 1)}
							>
								<Icon name="x" />
							</button>
						</li>
					{/each}
					<li>
						<span class="marker" class:round={question.type === 'single_choice_justified'}></span>
						<button type="button" class="ghost add-option" onclick={() => addOption(question)}>
							Adicionar opção
						</button>
					</li>
				</ul>
				{#if question.type === 'single_choice_justified'}
					<p class="sample">Justificativa da escolha (obrigatória)</p>
				{/if}
			{/if}

			{#if errors[index]}
				<p class="field-error">{errors[index]}</p>
			{/if}

			<div class="question-foot">
				<span class="muted">Obrigatória</span>
				<button
					type="button"
					class="ghost icon"
					title="Mover para cima"
					aria-label="Mover pergunta {index + 1} para cima"
					disabled={index === 0}
					onclick={() => moveQuestion(index, -1)}
				>
					<Icon name="up" />
				</button>
				<button
					type="button"
					class="ghost icon"
					title="Mover para baixo"
					aria-label="Mover pergunta {index + 1} para baixo"
					disabled={index === questions.length - 1}
					onclick={() => moveQuestion(index, 1)}
				>
					<Icon name="down" />
				</button>
				<button
					type="button"
					class="ghost icon"
					title="Duplicar"
					aria-label="Duplicar pergunta {index + 1}"
					onclick={() => duplicateQuestion(index)}
				>
					<Icon name="copy" />
				</button>
				<button
					type="button"
					class="ghost icon"
					title="Excluir"
					aria-label="Excluir pergunta {index + 1}"
					onclick={() => questions.splice(index, 1)}
				>
					<Icon name="trash" />
				</button>
			</div>
		</section>
	{/each}

	{#if errors.questions}
		<p class="field-error invalid">{errors.questions}</p>
	{/if}

	<button type="button" class="secondary add-question" onclick={addQuestion}>
		<Icon name="plus" /> Adicionar pergunta
	</button>
</div>

<dialog bind:this={confirmDialog} aria-labelledby="confirm-title">
	<h2 id="confirm-title">Criar o formulário?</h2>
	<p>
		Depois de criado, o formulário <strong>não pode ser editado nem excluído</strong>. Confira as
		perguntas antes de continuar.
	</p>
	<div class="actions">
		<button type="button" class="secondary" onclick={() => confirmDialog.close()}>Revisar</button>
		<button type="button" disabled={pending} onclick={create}>
			{pending ? 'Criando…' : 'Criar formulário'}
		</button>
	</div>
</dialog>

<style>
	.toolbar {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 0;
		background: var(--bg);
	}
	h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.builder {
		display: grid;
		gap: 1rem;
	}
	.panel {
		display: grid;
		gap: 0.75rem;
	}
	/* The question being edited gets a colored edge, like in Google Forms. */
	.question:focus-within {
		box-shadow: inset 6px 0 0 var(--accent);
	}
	.title {
		font-size: 1.6rem;
		font-weight: 600;
	}
	.hint {
		margin: 0;
	}
	.question-head {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.question-head input {
		flex: 1 1 16rem;
		font-weight: 500;
	}
	.question-head select {
		flex: 0 1 auto;
		max-width: 100%;
	}
	.sample {
		margin: 0;
		padding: 0.5rem 0;
		color: var(--muted);
		border-bottom: 1px dashed var(--border);
	}
	.options {
		display: grid;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.options li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.options input {
		flex: 1;
		min-width: 0;
	}
	/* Empty checkbox (or radio, when round) shown next to each option. */
	.marker {
		flex-shrink: 0;
		width: 1.1rem;
		height: 1.1rem;
		border: 2px solid var(--border);
		border-radius: 3px;
	}
	.marker.round {
		border-radius: 50%;
	}
	.add-option {
		padding: 0.4rem 0.5rem;
		font-weight: 500;
	}
	.question-foot {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.25rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border);
	}
	.question-foot span {
		margin-right: auto;
	}
	.add-question {
		justify-self: center;
	}
	dialog {
		width: min(100% - 2rem, 28rem);
		padding: 1.5rem;
		color: var(--text);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 0.4);
	}
	dialog h2 {
		margin-top: 0;
		font-size: 1.25rem;
	}
</style>
