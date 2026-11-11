# cati-forms

Um projeto desenvolvido durante o Banco de Talentos de Software da Cati Jr. para servir como sistema de formulários internos da Cati.

Os requisitos do sistema estão em um documento fornecido pela equipe.

## Stack

| Camada   | Tecnologia                                                        | Pasta       |
| -------- | ----------------------------------------------------------------- | ----------- |
| Frontend | [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5, SPA) + Vite   | `frontend/` |
| Backend  | [NestJS](https://docs.nestjs.com) (REST API)                      | `backend/`  |
| Linguagem | TypeScript nas duas pontas                                        |             |
| Banco    | [PostgreSQL](https://www.postgresql.org) 18 + [Prisma](https://www.prisma.io) 7 | `backend/prisma/` |
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
- Docker com Compose (para o PostgreSQL)

O `make` verifica a versão do Node antes de qualquer comando e a instalação falha
(`engine-strict`) em versões anteriores à 26.

## Como rodar

```sh
make dev
```

Na primeira execução isso instala as dependências e cria os arquivos `.env` a partir
dos `.env.example`. Depois, sobe o PostgreSQL no Docker, aplica as migrations pendentes
e sobe as duas aplicações em modo watch:

- Frontend: <http://localhost:5173>
- API: <http://localhost:3000/api> (ex.: `GET /api/health`)

Para entrar, use o usuário de exemplo **`admin`** / **`admin123`** ou crie uma conta
em `/signup`. Contas, formulários e respostas ficam no PostgreSQL (veja
[Banco de dados](#banco-de-dados)) e sobrevivem a reinícios. Na inicialização, o `admin`
é criado se ainda não existir, e um formulário de exemplo com uma resposta é criado se
ainda não houver nenhum formulário.

Para ver todos os comandos disponíveis, rode `make`:

| Comando          | O que faz                                                   |
| ---------------- | ----------------------------------------------------------- |
| `make dev`       | Sobe banco + backend + frontend em modo desenvolvimento     |
| `make dev-backend` / `make dev-frontend` | Sobe só uma das partes              |
| `make build`     | Gera os builds de produção (`backend/dist`, `frontend/build`) |
| `make start`     | Builda e serve os bundles de produção                       |
| `make check`     | Checagem de tipos com TS 7 (tsc + svelte-check --tsgo)      |
| `make lint`      | Lint (oxlint nas duas pontas + Prettier no frontend)        |
| `make format`    | Formata o código com Prettier                               |
| `make test`      | Testes unitários do backend (Vitest, no banco de teste)     |
| `make test-e2e`  | Testes end-to-end do backend (no banco de teste)            |
| `make db-up` / `make db-down` | Sobe / para o PostgreSQL no Docker (os dados ficam) |
| `make db-migrate` | Aplica as migrations; após mudar o schema, cria uma (`name=...`) |
| `make db-deploy` | Só aplica migrations pendentes (produção, CI)              |
| `make db-check`  | Falha se o `schema.prisma` tiver mudanças sem migration     |
| `make db-reset`  | Apaga todos os dados e reaplica as migrations               |
| `make db-studio` | Abre o Prisma Studio para ver os dados                      |
| `make node-version` | Confere se o Node instalado atende ao `.nvmrc`           |
| `make clean`     | Remove artefatos de build                                   |
| `make distclean` | Remove artefatos de build e `node_modules`                  |

## Estrutura

```
cati-forms/
├── Makefile              # ponto de entrada para todos os comandos
├── compose.yaml          # PostgreSQL local (make db-up)
├── .github/workflows/    # CI (GitHub Actions)
├── backend/              # API NestJS
│   ├── prisma/
│   │   ├── schema.prisma # tabelas do banco
│   │   └── migrations/   # SQL gerado a partir do schema (versionado)
│   ├── prisma.config.ts  # onde estão o schema e as migrations, e o DATABASE_URL
│   ├── src/
│   │   ├── main.ts       # bootstrap (config, CORS, porta)
│   │   ├── app.setup.ts  # prefixo /api, cookies e validação (também usado nos testes)
│   │   ├── app.module.ts # módulo raiz
│   │   ├── auth/         # cadastro, login, logout e sessão (AuthGuard)
│   │   ├── users/        # usuários (no banco) e hash de senha (scrypt)
│   │   ├── prisma/       # PrismaService (conexão com o banco) e geração de ids
│   │   ├── forms/        # formulários, perguntas, respostas, suas regras, organização e exportação
│   │   ├── health/       # GET /api/health
│   │   └── generated/    # Prisma Client, gerado do schema (fora do git)
│   ├── test/             # testes e2e
│   ├── assets/fonts/     # fonte DejaVu Sans, usada no PDF (licença em LICENSE)
│   ├── scripts/dev.mjs   # modo dev: tsc --watch + node --watch
│   └── .env.example
└── frontend/             # SPA SvelteKit
    ├── src/
    │   ├── app.css       # estilos globais
    │   ├── lib/          # código compartilhado (importado via #lib/...)
    │   │   ├── api.ts    # cliente HTTP para a API
    │   │   ├── auth.svelte.ts  # login, cadastro, logout e sessão
    │   │   └── forms.ts  # formulários e respostas (tipos, validação, chamadas)
    │   └── routes/       # páginas (roteamento por arquivos)
    │       ├── (app)/            # páginas que exigem login, com a barra do topo
    │       │   ├── +page.svelte  # / lista de formulários
    │       │   ├── forms/new/    # /forms/new criação de formulário
    │       │   ├── forms/[id]/   # /forms/:id link, perguntas e respostas
    │       │   └── account/      # /account dados da conta
    │       ├── f/[id]/           # /f/:id página pública de resposta
    │       ├── login/            # /login
    │       └── signup/           # /signup
    └── .env.example
```

Cada pasta é um pacote npm independente, com seu próprio `package.json` e lockfile.

## Autenticação

Há um único tipo de usuário, com acesso total (RN02). A sessão fica em um cookie
`httpOnly` chamado `session`, e as senhas são guardadas apenas como hash scrypt com
salt aleatório (RNF05). As contas ficam na tabela `users`; as sessões ficam na memória
do backend, então reiniciá-lo desloga todo mundo (controles de segurança avançados não
são prioridade nesta versão, RNF06). Quem estava com o app aberto é levado ao login na
próxima página que abrir.

| Rota | O que faz | Erros |
| ---- | --------- | ----- |
| `POST /api/auth/signup` | Cria a conta e já faz login (RF01) | `400` dados inválidos, `409` nome em uso (RN01) |
| `POST /api/auth/login` | Faz login (RF02) | `400` campos vazios, `401` usuário ou senha incorretos |
| `POST /api/auth/logout` | Encerra a sessão (RF02) | — |
| `GET /api/auth/me` | Retorna o usuário logado | `401` sem sessão |

As rotas recebem e devolvem JSON (`{ "username": "...", "password": "..." }` na
entrada; `{ "username", "createdAt" }` na saída, nunca a senha). Regras do cadastro:
usuário com 3 a 32 caracteres (letras, números, `.`, `_`, `-`), único sem diferenciar
maiúsculas de minúsculas, e senha com 6 a 128 caracteres.

Para proteger uma rota nova, use `@UseGuards(AuthGuard)` (exportado pelo `AuthModule`);
o usuário logado fica em `req.user`.

## Formulários

| Página | O que faz |
| ------ | --------- |
| `/` | Lista todos os formulários, de qualquer usuário (RN10) |
| `/forms/new` | Cria um formulário com título, descrição, pedido de e-mail opcional (RF07) e perguntas discursivas, de múltipla escolha, de escolha única e de escolha única com justificativa (RF03–RF06) |
| `/forms/:id` | Mostra o link de resposta (RF08), as perguntas e as respostas recebidas, que podem ser buscadas, filtradas, ordenadas (RN11) e exportadas em CSV e PDF (RF15, RF16) |
| `/f/:id` | Página pública de resposta, sem login (RF09, RN09) |

Todas as perguntas são obrigatórias (RN04), a justificativa também (RN05) e a múltipla
escolha aceita qualquer quantidade de opções marcadas (RN06). A escolha única sem
justificativa é um quarto tipo, além dos três do documento de requisitos: pede uma
opção e nada mais. Um formulário não pode ser
editado nem excluído depois de criado (RN07), então a criação pede confirmação.
A página de resposta confere tudo antes de enviar, com as mesmas regras do backend; o
e-mail usa o mesmo validador (`isEmail` do pacote `validator`) nos dois lados.

| Rota | Login | O que faz | Erros |
| ---- | ----- | --------- | ----- |
| `GET /api/forms` | sim | Lista os formulários, do mais novo ao mais antigo, com o total de perguntas e respostas | `401` |
| `POST /api/forms` | sim | Cria um formulário (`201`) | `400` dados inválidos, `401` |
| `GET /api/forms/:id` | sim | O formulário com todas as respostas (RN10) | `401`, `404` |
| `GET /api/forms/:id/export.csv` | sim | As respostas em CSV, para baixar (RF15); aceita `?order=`, `q=`, `question=` e `option=` (RN11) | `400` filtro inválido, `401`, `404` |
| `GET /api/forms/:id/export.pdf` | sim | As respostas em PDF, para baixar (RF16); mesmos parâmetros | `400` filtro inválido, `401`, `404` |
| `GET /api/public/forms/:id` | não | O formulário para responder, sem as respostas | `404` |
| `POST /api/public/forms/:id/responses` | não | Envia uma resposta (`201`) | `400` pergunta sem resposta, `404` |

Não há rotas de edição nem de exclusão (RN07). Os erros `400` trazem uma lista de
mensagens que dizem qual pergunta está errada (ex.: `Pergunta 2: Marque pelo menos uma
opção.`). O frontend (`frontend/src/lib/forms.ts`) confere as mesmas regras antes de
enviar, para apontar o campo na página.

Formulários, perguntas, respostas e as respostas de cada pergunta são guardados em
tabelas separadas, ligadas por chaves estrangeiras (RF12, RF13, RNF08). As consultas
ficam em `backend/src/forms/forms.repository.ts`; um formulário e suas perguntas, assim
como uma resposta e as respostas de cada pergunta, são gravados juntos ou nada é gravado.

### Organização e exportação

Na aba **Respostas** de um formulário, as respostas podem ser organizadas (RN11):

- **Buscar:** mostra só as respostas com o texto em alguma resposta, opção marcada ou
  no e-mail, sem diferenciar maiúsculas nem acentos (`acao` encontra `Ação`).
- **Opção escolhida:** mostra só quem marcou uma opção de uma pergunta de escolha.
- **Ordem:** mais recentes primeiro (o padrão) ou mais antigas primeiro.

Cada resposta mantém o número da ordem em que chegou (`Resposta 3`), seja qual for a
ordem ou o filtro. A página organiza no navegador; as rotas de exportação aplicam as
mesmas regras (`backend/src/forms/forms.organize.ts`) a partir dos parâmetros
`order` (`newest` ou `oldest`, padrão `oldest`), `q` (busca) e `question` + `option`
(id da pergunta e texto da opção). Sem parâmetros, saem todas as respostas, da mais
antiga à mais nova.

Os botões **Exportar CSV** e **Exportar PDF** baixam as respostas como a página as
mostra, filtradas e na mesma ordem (RF15, RF16, RN11). Os arquivos são gerados no
backend (`backend/src/forms/forms.csv.ts` e `forms.pdf.ts`) e se chamam
`respostas-<título-do-formulário>.csv` ou `.pdf`. Datas e horas saem no horário de
Brasília (`America/Sao_Paulo`), seja qual for o fuso do servidor.

- **CSV:** uma linha por resposta e uma coluna por pergunta, depois das colunas `Nº`,
  `Enviada em` (`2026-11-03 15:08:37`) e `E-mail` (só se o formulário pede). A escolha
  única com justificativa ocupa duas colunas, a opção e a justificativa; na múltipla
  escolha, as opções marcadas vêm separadas por `; `. Segue o RFC 4180 (vírgulas, CRLF,
  todas as células entre aspas), em UTF-8 com BOM para o Excel mostrar os acentos.
  Respostas que começam com `=`, `+`, `-` ou `@` ganham um `'` na frente, para a
  planilha não executá-las como fórmula.
- **PDF:** A4, gerado com o [pdfkit](https://pdfkit.org): título, descrição e autor do
  formulário, quantas respostas foram exportadas (`2 de 3 respostas`, se filtradas) e
  como estão organizadas, depois cada resposta com todas as perguntas, e o número da
  página no rodapé. Usa a fonte DejaVu Sans (`backend/assets/fonts/`), que cobre latim, grego,
  cirílico, setas, símbolos e alguns emojis; um caractere que ela não tem (chinês, por
  exemplo) aparece como `�`, e o CSV mantém o texto original.

## Banco de dados

O banco é PostgreSQL, acessado pelo [Prisma](https://www.prisma.io) 7. Em
desenvolvimento ele roda no Docker (`compose.yaml`), escutando só em `localhost:5432`
com usuário e senha `cati`. Para criar as tabelas:

```sh
make db-migrate
```

Isso sobe o container, aplica as migrations de `backend/prisma/migrations/` e gera o
Prisma Client em `backend/src/generated/prisma/`. O client é gerado (e fica fora do
git); o `make install` o refaz sempre que o `schema.prisma` muda.

| Tabela | Conteúdo |
| ------ | -------- |
| `users` | Quem cria e consulta formulários (RF01). `username_key` é o nome em minúsculas, único (RN01); a senha fica só como hash (RNF05) |
| `forms` | Título, descrição, se pede e-mail (RF07) e o autor (RF03) |
| `questions` | As perguntas de cada formulário, na ordem (`position`), com tipo e opções (RF12) |
| `responses` | Cada envio pelo link, anônimo, com o e-mail quando o formulário pede (RF09, RF13, RN08) |
| `answers` | A resposta de cada pergunta em um envio: opções marcadas e texto (ou justificativa) |

As tabelas se ligam por chaves estrangeiras (RNF08) que impedem exclusões, já que nada
é apagado (RN07), e cada envio tem no máximo uma resposta por pergunta. As regras que
dependem do tipo da pergunta (RN04–RN06, RN08) ficam no `FormsService`, que valida tudo
antes de gravar.

**Mudando o schema:** edite `backend/prisma/schema.prisma` e rode
`make db-migrate name=descricao-da-mudanca`. A nova pasta em `prisma/migrations/` deve
ir no mesmo commit que a mudança do schema; o `make db-check` (que roda na CI) falha se
alguma mudança do schema ficou sem migration.

**Testes:** `make test` e `make test-e2e` usam um banco separado, `cati_forms_test`
(o nome do `DATABASE_URL` com `_test` no fim, ou o `TEST_DATABASE_URL`, se definido).
Ele é criado e migrado automaticamente antes dos testes e esvaziado antes de cada um,
então os dados de desenvolvimento nunca são tocados. Os arquivos de teste rodam um de
cada vez, já que compartilham esse banco. Há testes que reiniciam a aplicação sem
esvaziar o banco, para conferir que contas, formulários e respostas continuam lá (e que
as sessões, que ficam em memória, não).

O `prisma` e o `@prisma/client` estão fixados na mesma versão (7.10.1). Não atualize só
um deles: no npm, a tag `latest` do `prisma` aponta para um release candidate da v8.

## CI

A cada push na `main` e a cada pull request, o GitHub Actions
(`.github/workflows/ci.yml`) roda os mesmos comandos do `make` que se usa localmente,
com o PostgreSQL subido pelo `compose.yaml`:

1. `make ci`: instala as dependências a partir dos lockfiles e gera o Prisma Client;
2. `make db-check`: aplica as migrations num banco novo e confere se nenhuma falta;
3. `make check`, `make lint`, `make test`, `make test-e2e` e `make build`.

O `DATABASE_URL` vem do próprio workflow, então a CI não precisa de segredos.

## Variáveis de ambiente

**`backend/.env`**

| Variável      | Padrão | Descrição                                              |
| ------------- | ------ | ------------------------------------------------------ |
| `PORT`        | `3000` | Porta da API                                           |
| `CORS_ORIGIN` | vazio  | Origens permitidas (separadas por vírgula), se houver  |
| `DATABASE_URL` | `postgresql://cati:cati@localhost:5432/cati_forms` | Conexão com o PostgreSQL |
| `TEST_DATABASE_URL` | vazio | Banco dos testes; vazio usa o `DATABASE_URL` com `_test` no nome |

O `make env` nunca sobrescreve um `.env` existente: se o seu foi criado antes do banco,
copie o `DATABASE_URL` do `.env.example`.

**`frontend/.env`**

| Variável        | Padrão                  | Descrição                                |
| --------------- | ----------------------- | ---------------------------------------- |
| `FRONTEND_PORT` | `5173`                  | Porta do servidor de desenvolvimento     |
| `BACKEND_URL`   | `http://localhost:3000` | Para onde o proxy `/api` encaminha       |
