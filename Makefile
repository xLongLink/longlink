.PHONY: up down format build api web install tests api-tests sdk-tests web-tests web-typecheck web-build-api web-build-sdk


install:
	bun i --cwd web
	cd api && uv sync --extra dev
	cd sdk && uv sync --extra dev


format:
	cd api && uv sync --extra dev
	cd sdk && uv sync --extra dev
	cd api && uv run isort .
	cd sdk && uv run isort .
	cd web && bunx prettier --log-level warn --write . $$(cd .. && find . -name '*.md' -o -name '*.yml' -o -name '*.yaml' | sed 's#^./#../#')


tests:
	cd api && uv sync --extra dev
	cd sdk && uv sync --extra dev
	bun i --cwd web
	$(MAKE) -j5 api-tests sdk-tests web-tests web-build-api web-build-sdk


api-tests:
	cd api && uv run pytest tests


sdk-tests:
	cd sdk && uv run pytest tests


web-tests:
	bun test tests --cwd web


web-typecheck:
	bun run --cwd web typecheck


web-build-api: web-typecheck
	bun run --cwd web build:api:bundle --logLevel warn


web-build-sdk: web-typecheck
	bun run --cwd web build:sdk:bundle --logLevel warn


build: 
	$(MAKE) -j2 web-build-api web-build-sdk


up:
	docker compose -f dev/compose.yml up -d
	k3d cluster create compute --api-port 0.0.0.0:8001 -p "8080:80@loadbalancer" -p "8443:443@loadbalancer"
	k3d kubeconfig get compute > api/kubeconfig.yaml


down:
	docker compose -f dev/compose.yml down
	k3d cluster delete compute


api: 
	cd api && uv sync --extra dev
	cd api && uv run python seed.py
	cd api && DEV=True uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload


web: 
	bun i --cwd web --extra dev
	bun run --cwd web dev --host 0.0.0.0 --port 5173
