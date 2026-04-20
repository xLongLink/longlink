.PHONY: up down format build api web sample docs install


install:
	bun i --cwd web
	bun i --cwd docs
	cd api && uv sync --extra dev
	cd sdk && uv sync --extra dev

format:
	cd api && uv sync --extra dev
	cd sdk && uv sync --extra dev
	cd api && uv run isort .
	cd sdk && uv run isort .
	cd web && bunx prettier --log-level warn --write . $$(git -C .. ls-files '*.md' '*.yml' '*.yaml' | sed 's#^#../#')


build: 
	bun run --cwd web build:api --logLevel warn
	bun run --cwd web build:sdk --logLevel warn 


up:
	docker compose -f dev/compose.yml up -d
	k3d cluster create compute --api-port 0.0.0.0:8001 --registry-create compute-registry:0.0.0.0:5000 || true


down:
	docker compose -f dev/compose.yml down
	k3d cluster delete compute


api: 
	cd api && uv sync --extra dev
	cd api && DEV=True uv run uvicorn main:app --host 0.0.0.0 --port 8000


web: 
	bun i --cwd web --extra dev
	bun run --cwd web dev --host 0.0.0.0 --port 5173


sample:
	cd sdk && uv sync
	cd sdk/sample && uv run longlink dev


docs:
	bun i --cwd docs
	bun run --cwd docs dev
