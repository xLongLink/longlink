.PHONY: up down format build api web sdk install tests pyright


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
	cd api && ENVIRONMENT=testing uv run pytest --cov=src --cov-report=term-missing tests
	cd sdk && uv run pytest --cov=longlink --cov-report=term-missing tests
	bun test tests --cwd web
	bun run --cwd web typecheck
	bun run --cwd web build:api:bundle --logLevel warn
	bun run --cwd web build:sdk:bundle --logLevel warn


pyright:
	cd api && uv run --extra dev pyright
	cd sdk && uv run --group dev pyright


build: 
	bun run --cwd web typecheck
	bun run --cwd web build:api:bundle --logLevel warn
	bun run --cwd web build:sdk:bundle --logLevel warn


up:
	docker compose -f dev/compose.yml up -d
	k3d cluster create compute --api-port 0.0.0.0:8001 -p "8080:80@loadbalancer" -p "8443:443@loadbalancer"
	k3d kubeconfig get compute > api/kubeconfig.yaml


down:
	rm -f api/dev.db
	-docker compose -f dev/compose.yml down
	-k3d cluster delete compute
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	find . -type d -name .mypy_cache -prune -exec rm -rf {} +
	find . -type f -name '*.py[co]' -delete


api: 
	cd api && uv sync --extra dev
	cd api && ENVIRONMENT=development uv run alembic upgrade head
	cd api && ENVIRONMENT=development uv run python seed.py
	cd api && ENVIRONMENT=development uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload


web: 
	bun i --cwd web
	bun run --cwd web dev --host 0.0.0.0 --port 5173


sdk:
	rm -rf sdk/dev
	cd sdk && uv run longlink init --folder dev
	cd sdk && sh -c 'file=dev/pyproject.toml; if ! grep -q "^\[tool\.uv\.sources\]$$" "$$file"; then printf "\n\n[tool.uv.sources]\nlonglink = { path = \"..\", editable = true }\n" >> "$$file"; fi'
	cd sdk/dev && uv run longlink dev
