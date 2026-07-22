COMPOSE_LOCAL := docker compose -f docker-compose.local.yml
KTZH_URL := https://daten.statistik.zh.ch/ogd/daten/ressourcen/KTZH_00000254_00001282.csv
URL ?= $(KTZH_URL)
TABLE ?= ktzh_population
PORT ?= 8080

.PHONY: help dev build local-up local-down local-clean local-logs local-import local-psql deploy logs

help: ## Show this help
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

dev: ## Vite dev server with HMR (no Docker, http://localhost:5173)
	pnpm install && pnpm dev

build: ## Typecheck + production build to dist/
	pnpm build

local-up: ## Build + start the self-contained local stack (web on :$(PORT))
	DEMOS_LOCAL_PORT=$(PORT) $(COMPOSE_LOCAL) up -d --build
	@echo "→ http://localhost:$(PORT)  (API at /api/, e.g. /api/datasets)"
	@echo "→ 'make local-import' to load the KTZH population dataset"

local-down: ## Stop the local stack (data volume kept)
	$(COMPOSE_LOCAL) down

local-clean: ## Stop the local stack and DELETE its database volume
	$(COMPOSE_LOCAL) down -v

local-logs: ## Tail local stack logs
	$(COMPOSE_LOCAL) logs -f

local-import: ## Import an OGD CSV: make local-import [URL=...] [TABLE=...]
	$(COMPOSE_LOCAL) run --rm api node scripts/import-ogd.mjs "$(URL)" "$(TABLE)"

local-psql: ## psql shell into the local database
	$(COMPOSE_LOCAL) exec postgres psql -U demos

deploy: ## Devbox only: what the CD pipeline runs on push to main
	bash deploy.sh

logs: ## Devbox only: tail the deployed stack's logs
	docker compose logs -f
