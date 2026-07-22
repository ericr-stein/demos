COMPOSE_DEV := docker compose -f docker-compose.local.yml
COMPOSE_BOX := docker compose -f docker-compose.dev.yml
KTZH_URL := https://daten.statistik.zh.ch/ogd/daten/ressourcen/KTZH_00000254_00001282.csv
URL ?= $(KTZH_URL)
TABLE ?= ktzh_population
PORT ?= 5173

.PHONY: help dev dev-down dev-logs dev-clean import psql dev-box dev-box-down dev-box-logs deploy logs

help: ## Show this help
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

dev: ## Start dev: Vite HMR + api + own Postgres → http://localhost:5173
	DEMOS_LOCAL_PORT=$(PORT) $(COMPOSE_DEV) up -d --build
	@echo "→ http://localhost:$(PORT)  — edit src/, the browser updates instantly"
	@echo "→ 'make import' to load the KTZH population dataset"

dev-down: ## Stop dev (database volume kept)
	$(COMPOSE_DEV) down --remove-orphans

dev-logs: ## Tail dev logs
	$(COMPOSE_DEV) logs -f

dev-clean: ## Stop dev and DELETE its database volume
	$(COMPOSE_DEV) down -v --remove-orphans

import: ## Import an OGD CSV into the dev database: make import [URL=...] [TABLE=...]
	$(COMPOSE_DEV) run --rm api node scripts/import-ogd.mjs "$(URL)" "$(TABLE)"

psql: ## psql shell into the dev database
	$(COMPOSE_DEV) exec postgres psql -U demos

dev-box: ## Devbox only: HMR against the deployed API → https://demos-dev.nonsh.site
	$(COMPOSE_BOX) up -d
	@echo "→ https://demos-dev.nonsh.site (edit src/, browser updates instantly)"

dev-box-down: ## Devbox only: stop the devbox dev server
	$(COMPOSE_BOX) down --remove-orphans

dev-box-logs: ## Devbox only: tail devbox dev server logs
	$(COMPOSE_BOX) logs -f

deploy: ## Devbox only: what the CD pipeline runs on push to main
	bash deploy.sh

logs: ## Devbox only: tail the deployed stack's logs
	docker compose logs -f
