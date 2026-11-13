# cati-forms

Bem-vindo! O cati-forms é o sistema de formulários internos da Cati Jr., desenvolvido
durante o Banco de Talentos de Software. Com ele, você cria formulários, compartilha um
link para que qualquer pessoa responda e depois consulta, filtra e exporta as respostas
em CSV ou PDF.

## Tecnologias

- **Frontend:** [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5), como SPA
- **Backend:** [NestJS](https://docs.nestjs.com), uma API REST
- **Banco de dados:** [PostgreSQL](https://www.postgresql.org) 18 com [Prisma](https://www.prisma.io) 7
- **Linguagem:** TypeScript, no frontend e no backend
- **Testes:** [Vitest](https://vitest.dev)

## Como rodar

Você vai precisar do **Node.js 26**, do **GNU Make** e do **Docker** (com Compose).

```sh
make dev
```

É só isso. Na primeira vez, o comando instala as dependências, cria os arquivos `.env`,
sobe o PostgreSQL no Docker e prepara o banco. Depois, abra:

- **App:** <http://localhost:5173>
- **API:** <http://localhost:3000/api>

Para entrar, use o usuário **`admin`** com a senha **`admin123`** ou crie sua própria conta.

Rode `make` para ver todos os comandos disponíveis.

## Estrutura

```
cati-forms/
├── Makefile           # todos os comandos do projeto
├── compose.yaml       # PostgreSQL local
├── .github/workflows/ # CI
├── backend/           # API NestJS
│   ├── prisma/        # schema e migrations do banco
│   ├── src/
│   │   ├── auth/      # cadastro, login e sessão
│   │   ├── users/     # usuários e senhas
│   │   ├── forms/     # formulários, respostas e exportação
│   │   ├── prisma/    # conexão com o banco
│   │   └── health/    # verificação de que a API está no ar
│   └── test/          # testes end-to-end
└── frontend/          # SPA SvelteKit
    └── src/
        ├── lib/       # código compartilhado (chamadas à API, validação)
        └── routes/    # páginas do app
```

## Testes e CI

Os testes ficam no backend: os unitários ficam junto de cada módulo, em `tests/`, e os
end-to-end ficam em `backend/test/`. Eles usam um banco separado (`cati_forms_test`),
então seus dados de desenvolvimento nunca são tocados.

```sh
make test      # testes unitários
make test-e2e  # testes end-to-end
```

A cada push na `main` e a cada pull request, o GitHub Actions checa os tipos, roda o
lint e os testes, confere as migrations e gera o build.
