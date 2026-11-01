<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>Erro · Cati Forms</title>
</svelte:head>

<main class="card">
	<h1>{page.status === 404 ? 'Não encontrado' : 'Algo deu errado'}</h1>
	<p>{page.error?.message}</p>
	<p><a href="/">Voltar ao início</a></p>
</main>
