# cati-forms

Um projeto desenvolvido durante o Banco de Talentos de Software da Cati Jr. para servir como sistema de formulários internos da Cati.

Os requisitos do sistema estão em um documento fornecido pela equipe.

## Stack

| Camada   | Tecnologia                                                        | Pasta       |
| -------- | ----------------------------------------------------------------- | ----------- |
| Frontend | [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5, SPA) + Vite   | `frontend/` |
| Backend  | [NestJS](https://docs.nestjs.com) (REST API)                      | `backend/`  |
| Linguagem | TypeScript nas duas pontas                                        |             |
| Testes   | [Vitest](https://vitest.dev) 5                                    | `backend/`  |

O frontend é compilado como SPA estática (`@sveltejs/adapter-static`) e conversa com
o backend somente via `/api`. Em desenvolvimento, o Vite faz proxy de `/api` para o
NestJS, então não é preciso configurar CORS.

### TypeScript 7

O projeto usa o TypeScript 7 (compilador nativo), instalado como
`@typescript/native` (alias de `typescript@7`). Como o TS 7 ainda não tem a API
JavaScript que várias ferramentas usam, o ferramental foi escolhido para não
depender dela:

- **Backend — só TS 7.** O `tsc` compila (`npm run build`) e checa tipos
  (`npm run typecheck`). Não há Nest CLI: o modo dev (`scripts/dev.mjs`) roda
  `tsc --watch` junto com `node --watch dist/main.js`. Também não há `nest generate`,
  então módulos, controllers e services são criados à mão.
- **Frontend — TS 7 + TS 6 só para o svelte-check.** O `svelte-check --tsgo` checa
  tipos com o TS 7, mas exige o TS 6 instalado. Por isso `typescript` aponta para
  `@typescript/typescript6`; o `svelte-kit sync` também o usa para validar o
  `tsconfig.json`. Quando o svelte-check suportar só o TS 7, esse pacote sai.
- **Lint:** [oxlint](https://oxc.rs) nas duas pontas, no lugar do ESLint +
  typescript-eslint (que depende da API do TS 6). Nos `.svelte`, o oxlint analisa
  apenas o bloco `<script>`.

Prettier, Vite e Vitest não usam o pacote `typescript`: o Prettier tem seu próprio
parser e o Vite/Vitest removem os tipos com o oxc.

## Pré-requisitos

- Node.js **26** (LTS) — fixado em `.nvmrc` e `mise.toml`. Com [mise](https://mise.jdx.dev),
  rode `mise install` na raiz; com nvm, `nvm install && nvm use`.
- npm (vem com o Node)
- GNU Make

O `make` verifica a versão do Node antes de qualquer comando e a instalação falha
(`engine-strict`) em versões anteriores à 26.

## Como rodar

```sh
make dev
```

Na primeira execução isso instala as dependências e cria os arquivos `.env` a partir
dos `.env.example`. Depois, sobe as duas aplicações em modo watch:

- Frontend: <http://localhost:5173>
- API: <http://localhost:3000/api> (ex.: `GET /api/health`)

Para ver todos os comandos disponíveis, rode `make`:

| Comando          | O que faz                                                   |
| ---------------- | ----------------------------------------------------------- |
| `make dev`       | Sobe backend + frontend em modo desenvolvimento             |
| `make dev-backend` / `make dev-frontend` | Sobe só uma das partes              |
| `make build`     | Gera os builds de produção (`backend/dist`, `frontend/build`) |
| `make start`     | Builda e serve os bundles de produção                       |
| `make check`     | Checagem de tipos com TS 7 (tsc + svelte-check --tsgo)      |
| `make lint`      | Lint (oxlint nas duas pontas + Prettier no frontend)        |
| `make format`    | Formata o código com Prettier                               |
| `make test`      | Testes unitários do backend (Vitest)                        |
| `make test-e2e`  | Testes end-to-end do backend                                |
| `make node-version` | Confere se o Node instalado atende ao `.nvmrc`           |
| `make clean`     | Remove artefatos de build                                   |
| `make distclean` | Remove artefatos de build e `node_modules`                  |

## Estrutura

```
cati-forms/
├── Makefile              # ponto de entrada para todos os comandos
├── backend/              # API NestJS
│   ├── src/
│   │   ├── main.ts       # bootstrap (prefixo global /api, config, CORS)
│   │   ├── app.module.ts # módulo raiz
│   │   └── health/       # módulo de exemplo: GET /api/health
│   ├── test/             # testes e2e
│   ├── scripts/dev.mjs   # modo dev: tsc --watch + node --watch
│   └── .env.example
└── frontend/             # SPA SvelteKit
    ├── src/
    │   ├── lib/          # código compartilhado (importado via #lib/...)
    │   │   └── api.ts    # cliente HTTP para a API
    │   └── routes/       # páginas (roteamento por arquivos)
    └── .env.example
```

Cada pasta é um pacote npm independente, com seu próprio `package.json` e lockfile.

## Variáveis de ambiente

**`backend/.env`**

| Variável      | Padrão | Descrição                                              |
| ------------- | ------ | ------------------------------------------------------ |
| `PORT`        | `3000` | Porta da API                                           |
| `CORS_ORIGIN` | vazio  | Origens permitidas (separadas por vírgula), se houver  |

**`frontend/.env`**

| Variável        | Padrão                  | Descrição                                |
| --------------- | ----------------------- | ---------------------------------------- |
| `FRONTEND_PORT` | `5173`                  | Porta do servidor de desenvolvimento     |
| `BACKEND_URL`   | `http://localhost:3000` | Para onde o proxy `/api` encaminha       |
