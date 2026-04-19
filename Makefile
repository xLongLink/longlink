.PHONY: up down install format build api web sample docs

install:
	uv venv .venv
	uv pip install --python .venv/bin/python -e './api[dev]'
	uv pip install --python .venv/bin/python -e './sdk'
	bun install --cwd web
	bun install --cwd docs


format:
	uv venv .venv
	uv pip install --python .venv/bin/python -e './api[dev]'
	uv pip install --python .venv/bin/python -e './sdk'
	cd api && uv run --python ../.venv/bin/python isort .
	cd sdk && uv run --python ../.venv/bin/python isort .
	bun install --cwd web
	bun run --cwd web format
	cd web && bunx prettier --write $$(git -C .. ls-files '*.md' '*.yml' '*.yaml' | sed 's#^#../#')


build:
	bun install --cwd web
	bun run --cwd web build:api
	bun run --cwd web build:sdk


up:
	docker compose -f dev/compose.yml up -d
	k3d cluster create compute --registry-create compute-registry:0.0.0.0:5000 || true


down:
	docker compose -f dev/compose.yml down
	k3d cluster delete compute


api:
	cd api && DEV=True uv run uvicorn main:app --host 0.0.0.0 --port 8000


web:
	bun run --cwd web dev --host 0.0.0.0 --port 5173


sample:
	cd sdk/sample && uv run longlink dev


docs:
	bun run --cwd docs dev
