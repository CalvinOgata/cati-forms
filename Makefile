# Cati Forms — task runner for the frontend (SvelteKit) and backend (NestJS).
# Run `make` or `make help` to list the available targets.

SHELL := /bin/bash
.SHELLFLAGS := -eo pipefail -c
.DEFAULT_GOAL := help

FRONTEND := frontend
BACKEND  := backend
NPM      ?= npm

# Colored prefixes for interleaved output when both apps run side by side.
API_TAG := $(shell printf '\033[35m[api]\033[0m ')
WEB_TAG := $(shell printf '\033[36m[web]\033[0m ')

# npm refreshes node_modules/.package-lock.json on every install, so it works
# as a stamp: dependencies are reinstalled only when package*.json change.
FRONTEND_DEPS := $(FRONTEND)/node_modules/.package-lock.json
BACKEND_DEPS  := $(BACKEND)/node_modules/.package-lock.json

# Prisma Client is generated from the schema (and gitignored), so it's rebuilt
# whenever the schema or the dependencies change.
PRISMA_SCHEMA := $(BACKEND)/prisma/schema.prisma
PRISMA_CLIENT := $(BACKEND)/src/generated/prisma/client.ts

COMPOSE ?= docker compose

# Minimum Node.js major version; .nvmrc is the single source of truth.
NODE_MAJOR := $(shell cat .nvmrc)

.PHONY: help
help: ## Show this help
	@echo "Usage: make <target>"
	@echo
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

.PHONY: setup
setup: install env ## Install dependencies and create .env files

.PHONY: node-version
node-version: ## Verify the installed Node.js matches .nvmrc
	@command -v node >/dev/null || { echo "Node.js not found. Install Node $(NODE_MAJOR) (e.g. 'mise install' or 'nvm install')." >&2; exit 1; }
	@node -e 'if (+process.versions.node.split(".")[0] < +process.argv[1]) { console.error(`Node.js >= $(NODE_MAJOR) required, found $${process.version}. Run "mise install" or "nvm install".`); process.exit(1) }' $(NODE_MAJOR)

.PHONY: install
install: node-version $(FRONTEND_DEPS) $(BACKEND_DEPS) $(PRISMA_CLIENT) ## Install dependencies (only when package files changed)

$(FRONTEND_DEPS): $(FRONTEND)/package.json $(FRONTEND)/package-lock.json | node-version
	cd $(FRONTEND) && $(NPM) install
	@touch $@

$(BACKEND_DEPS): $(BACKEND)/package.json $(BACKEND)/package-lock.json | node-version
	cd $(BACKEND) && $(NPM) install
	@touch $@

$(PRISMA_CLIENT): $(PRISMA_SCHEMA) $(BACKEND_DEPS)
	cd $(BACKEND) && $(NPM) run db:generate
	@touch $@

.PHONY: ci
ci: node-version ## Clean install from lockfiles (for CI)
	cd $(FRONTEND) && $(NPM) ci
	cd $(BACKEND) && $(NPM) ci
	cd $(BACKEND) && $(NPM) run db:generate

.PHONY: env
env: $(FRONTEND)/.env $(BACKEND)/.env ## Create .env files from .env.example (never overwrites)

%/.env:
	cp $*/.env.example $@
	@echo "Created $@"

# ---------------------------------------------------------------------------
# Database (PostgreSQL in Docker, see compose.yaml)
# ---------------------------------------------------------------------------

.PHONY: db-up
db-up: ## Start PostgreSQL and wait until it accepts connections
	$(COMPOSE) up -d --wait db

.PHONY: db-down
db-down: ## Stop PostgreSQL (the data is kept)
	$(COMPOSE) down

.PHONY: db-migrate
db-migrate: install env db-up ## Apply migrations; after a schema change, creates one (name=<change>)
	cd $(BACKEND) && $(NPM) run db:migrate -- $(if $(name),--name $(name))
	cd $(BACKEND) && $(NPM) run db:generate

.PHONY: db-deploy
db-deploy: install ## Apply pending migrations only (production, CI)
	cd $(BACKEND) && $(NPM) run db:deploy

.PHONY: db-check
db-check: install env db-up db-deploy ## Fail if schema.prisma has changes that no migration covers
	cd $(BACKEND) && $(NPM) run db:check

.PHONY: db-reset
db-reset: install env db-up ## Erase all data and reapply every migration
	cd $(BACKEND) && $(NPM) run db:reset

.PHONY: db-studio
db-studio: install env db-up ## Browse the data in Prisma Studio
	cd $(BACKEND) && $(NPM) run db:studio

# ---------------------------------------------------------------------------
# Development
# ---------------------------------------------------------------------------

.PHONY: dev
dev: setup db-up db-deploy ## Run backend and frontend in watch mode (and the database)
	@$(MAKE) --no-print-directory -j2 _dev-backend _dev-frontend

.PHONY: dev-backend
dev-backend: setup db-up db-deploy ## Run only the backend in watch mode (and the database)
	cd $(BACKEND) && $(NPM) run start:dev

.PHONY: dev-frontend
dev-frontend: setup ## Run only the frontend dev server
	cd $(FRONTEND) && $(NPM) run dev

.PHONY: _dev-backend _dev-frontend
_dev-backend:
	@cd $(BACKEND) && $(NPM) run start:dev 2>&1 | sed -u 's/^/$(API_TAG)/'
_dev-frontend:
	@cd $(FRONTEND) && $(NPM) run dev 2>&1 | sed -u 's/^/$(WEB_TAG)/'

# ---------------------------------------------------------------------------
# Build & production
# ---------------------------------------------------------------------------

.PHONY: build
build: build-backend build-frontend ## Build both apps for production

.PHONY: build-backend
build-backend: install
	cd $(BACKEND) && $(NPM) run build

.PHONY: build-frontend
build-frontend: install
	cd $(FRONTEND) && $(NPM) run build

.PHONY: start
start: env build db-up db-deploy ## Build and serve the production bundles
	@$(MAKE) --no-print-directory -j2 _start-backend _start-frontend

.PHONY: _start-backend _start-frontend
_start-backend:
	@cd $(BACKEND) && $(NPM) run start:prod 2>&1 | sed -u 's/^/$(API_TAG)/'
_start-frontend:
	@cd $(FRONTEND) && $(NPM) run preview 2>&1 | sed -u 's/^/$(WEB_TAG)/'

# ---------------------------------------------------------------------------
# Quality
# ---------------------------------------------------------------------------

.PHONY: check
check: install ## Type-check both apps
	cd $(BACKEND) && $(NPM) run typecheck
	cd $(FRONTEND) && $(NPM) run check

.PHONY: lint
lint: install ## Lint both apps
	cd $(BACKEND) && $(NPM) run lint
	cd $(FRONTEND) && $(NPM) run lint

.PHONY: format
format: install ## Format both apps with Prettier
	cd $(BACKEND) && $(NPM) run format
	cd $(FRONTEND) && $(NPM) run format

.PHONY: test
test: install db-up ## Run backend unit tests (on the cati_forms_test database)
	cd $(BACKEND) && $(NPM) test

.PHONY: test-e2e
test-e2e: install db-up ## Run backend end-to-end tests (on the cati_forms_test database)
	cd $(BACKEND) && $(NPM) run test:e2e

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

.PHONY: clean
clean: ## Remove build output
	rm -rf $(BACKEND)/dist $(BACKEND)/coverage $(FRONTEND)/build $(FRONTEND)/.svelte-kit

.PHONY: distclean
distclean: clean ## Remove build output and node_modules
	rm -rf $(BACKEND)/node_modules $(FRONTEND)/node_modules
