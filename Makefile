.PHONY: up down format build api web sample docs

install:
	cd api && uv sync
	cd sdk && uv sync
	bun install --cwd web
	bun install --cwd docs


format: install
	cd api && uv run isort .
	cd sdk && uv run isort .
	bun run --cwd web format
	cd web && bunx prettier --write $$(git -C .. ls-files '*.md' '*.yml' '*.yaml' | sed 's#^#../#')


build: install
	bun run --cwd web build:api --logLevel warn
	bun run --cwd web build:sdk --logLevel warn 


up:
	docker compose -f dev/compose.yml up -d
	k3d cluster create compute --registry-create compute-registry:0.0.0.0:5000 || true


down:
	docker compose -f dev/compose.yml down
	k3d cluster delete compute


api: install
	cd api && DEV=True uv run uvicorn main:app --host 0.0.0.0 --port 8000


web: install
	bun run --cwd web dev --host 0.0.0.0 --port 5173


sample: install
	cd sdk/sample && uv run longlink dev


docs: install
	bun run --cwd docs dev
