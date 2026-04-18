.PHONY: up down install format build api web sample docs

SHELL := /bin/bash
VENV_BIN := $(CURDIR)/.venv/bin
SYSTEM_PYTHON ?= $(shell command -v python3 2>/dev/null || command -v python 2>/dev/null)
PYTHON ?= $(if $(wildcard $(VENV_BIN)/python),$(VENV_BIN)/python,$(SYSTEM_PYTHON))
UV ?= $(shell command -v uv 2>/dev/null)
LONGLINK ?= $(if $(wildcard $(VENV_BIN)/longlink),$(VENV_BIN)/longlink,longlink)

$(VENV_BIN)/python:
	@if [ -z "$(UV)" ]; then \
		echo "uv is required to create .venv"; \
		exit 1; \
	fi
	uv venv .venv


install: $(VENV_BIN)/python
	uv pip install --python $(PYTHON) -e './api[dev]'
	uv pip install --python $(PYTHON) -e './sdk'
	cd web && bun install
	cd docs && bun install


format: $(VENV_BIN)/python
	uv pip install --python $(PYTHON) -e './api[dev]'
	uv pip install --python $(PYTHON) -e './sdk'
	cd web && bun install
	cd api && $(PYTHON) -m isort .
	cd sdk && $(PYTHON) -m isort .
	cd web && bun run format
	cd web && bunx prettier --write $$(git -C .. ls-files '*.md' '*.yml' '*.yaml' | sed 's#^#../#')


build:
	cd web && bun install
	cd web && bun run build:api
	cd web && bun run build:sdk


up:
	docker compose -f dev/compose.yml up -d
	k3d cluster create compute --registry-create compute-registry:0.0.0.0:5000 || true


down:
	docker compose -f dev/compose.yml down
	k3d cluster delete compute


api: $(VENV_BIN)/python
	cd api && DEV=True $(PYTHON) -m uvicorn main:app --host 0.0.0.0 --port 8000


web:
	cd web && bun run dev --host 0.0.0.0 --port 5173


sample: $(VENV_BIN)/python
	cd sdk/sample && $(LONGLINK) dev


docs:
	cd docs && bun run dev
