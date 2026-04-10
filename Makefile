.PHONY: up down api web sample

VENV_BIN := $(CURDIR)/.venv/bin
PYTHON ?= $(if $(wildcard $(VENV_BIN)/python),$(VENV_BIN)/python,python)
LONGLINK ?= $(if $(wildcard $(VENV_BIN)/longlink),$(VENV_BIN)/longlink,longlink)

up:
	docker compose -f dev/compose.yml up -d
	k3d cluster create compute --registry-create compute-registry:0.0.0.0:5000 || true

down:
	docker compose -f dev/compose.yml down
	k3d cluster delete compute

api:
	cd api && $(PYTHON) main.py

web:
	cd web && bun run api


sample:
	cd sdk/sample && $(LONGLINK) dev
