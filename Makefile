.PHONY: up down build api\:build sdk\:build sdk\:image clean api\:clean sdk\:clean web\:clean format api\:format sdk\:format web\:format api web sdk install api\:install sdk\:install web\:install tests api\:tests sdk\:tests web\:tests pyright api\:pyright sdk\:pyright


# Install all API, SDK, and web dependencies.
install: api\:install sdk\:install web\:install


# Install API Python development dependencies.
api\:install:
	cd api && uv sync --extra dev


# Install SDK Python development dependencies.
sdk\:install:
	cd sdk && uv sync --extra dev


# Install web JavaScript dependencies.
web\:install:
	bun i --cwd web


# Format API, SDK, and web/docs code.
format: api\:format sdk\:format web\:format


# Format API imports.
api\:format:
	cd api && uv sync --extra dev
	cd api && uv run isort .


# Format SDK imports.
sdk\:format:
	cd sdk && uv sync --extra dev
	cd sdk && uv run isort .


# Format web code and repository docs.
web\:format:
	cd web && bunx prettier --log-level warn --write . $$(cd .. && find . -name '*.md' -o -name '*.yml' -o -name '*.yaml' | sed 's#^./#../#')


# Run all API, SDK, and web tests/checks.
tests: api\:tests sdk\:tests web\:tests


# Run API tests with coverage.
api\:tests:
	cd api && uv sync --extra dev
	cd api && ENVIRONMENT=testing uv run pytest --cov=src --cov-report=term-missing tests


# Run SDK tests with coverage.
sdk\:tests:
	cd sdk && uv sync --extra dev
	cd sdk && uv run pytest --cov=longlink --cov-report=term-missing tests


# Run web tests, typecheck, and bundle builds.
web\:tests:
	bun i --cwd web
	bun test tests --cwd web
	bun run --cwd web typecheck
	bun run --cwd web vite build --mode api --logLevel warn
	bun run --cwd web vite build --mode sdk --logLevel warn


# Run API and SDK Pyright checks.
pyright: api\:pyright sdk\:pyright


# Run API Pyright checks.
api\:pyright:
	cd api && uv run --extra dev pyright


# Run SDK Pyright checks.
sdk\:pyright:
	cd sdk && uv run --group dev pyright


# Typecheck and build both web bundle modes.
build: web\:install
	bun run --cwd web typecheck
	bun run --cwd web vite build --mode api --logLevel warn
	bun run --cwd web vite build --mode sdk --logLevel warn


# Build the API web bundle.
api\:build: web\:install
	bun run --cwd web vite build --mode api --logLevel warn


# Build the embedded SDK web bundle.
sdk\:build: web\:install
	bun run --cwd web vite build --mode sdk --logLevel warn


# Remove generated build and test artifacts for every workspace.
clean: api\:clean sdk\:clean web\:clean
	rm -rf .coverage .coverage.* coverage.xml htmlcov .pytest_cache .ruff_cache .mypy_cache


# Remove generated API build and test artifacts.
api\:clean:
	rm -rf api/.coverage api/.coverage.* api/coverage.xml api/htmlcov api/build api/dist api/*.egg-info api/openapi.yml api/src/.static/web
	find api -type d \( -name __pycache__ -o -name .pytest_cache -o -name .ruff_cache -o -name .mypy_cache \) -prune -exec rm -rf {} +
	find api -type f -name '*.py[co]' -delete


# Remove generated SDK build and test artifacts.
sdk\:clean:
	rm -rf sdk/.coverage sdk/.coverage.* sdk/coverage.xml sdk/htmlcov sdk/build sdk/dist sdk/*.egg-info sdk/longlink/.static/web
	find sdk -type d \( -name __pycache__ -o -name .pytest_cache -o -name .ruff_cache -o -name .mypy_cache \) -prune -exec rm -rf {} +
	find sdk -type f -name '*.py[co]' -delete


# Remove generated web build artifacts.
web\:clean:
	rm -rf web/dist web/dist-ssr web/node_modules/.tmp web/node_modules/.vite


# Start local services and cluster, then wait for Keycloak.
up:
	docker compose -f dev/compose.yml up -d
	k3d cluster create compute --api-port 0.0.0.0:8001 -p "8080:80@loadbalancer" -p "8443:443@loadbalancer" --registry-config dev/registries.yml
	k3d kubeconfig get compute > api/kubeconfig.yaml
	@printf "Waiting for Keycloak...\n"
	@attempt=1; \
	while ! curl --fail --silent --output /dev/null http://localhost:18080/realms/dev/.well-known/openid-configuration; do \
		if [ "$$attempt" -ge 60 ]; then \
			printf "Keycloak did not become ready after %s attempts.\n" "$$attempt"; \
			exit 1; \
		fi; \
		attempt=$$((attempt + 1)); \
		sleep 2; \
	done
	@printf "Keycloak is ready.\n"


# Stop local services, remove the cluster, and clean Python caches.
down:
	rm -f api/dev.db
	-docker compose -f dev/compose.yml down
	-k3d cluster delete compute
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	find . -type d -name .mypy_cache -prune -exec rm -rf {} +
	find . -type f -name '*.py[co]' -delete


# Run the local control plane API server.
api: sdk\:image
	cd api && uv sync --extra dev
	cd api && DEVELOPMENT=true uv run alembic upgrade head
	cd api && DEVELOPMENT=true uv run python seed.py
	cd api && DEVELOPMENT=true uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload


# Run the Vite web app.
web: 
	bun i --cwd web
	bun run --cwd web dev --host 0.0.0.0 --port 5173


# Build the SDK web bundle, then recreate and run the generated SDK development app.
sdk: sdk\:build
	rm -rf sdk/dev
	cd sdk && uv run longlink init --folder dev
	cd sdk && sh -c 'file=dev/pyproject.toml; if ! grep -q "^\[tool\.uv\.sources\]$$" "$$file"; then printf "\n\n[tool.uv.sources]\nlonglink = { path = \"..\", editable = true }\n" >> "$$file"; fi'
	cd sdk/dev && uv run longlink dev


# Build and push the generated SDK app image to the local registry.
sdk\:image:
	docker compose -f dev/compose.yml up -d registry
	if [ ! -d sdk/dev ]; then cd sdk && uv run longlink init --folder dev; fi
	cd sdk && sh -c 'file=dev/pyproject.toml; if ! grep -q "^\[tool\.uv\.sources\]$$" "$$file"; then printf "\n\n[tool.uv.sources]\nlonglink = { path = \"..\", editable = true }\n" >> "$$file"; fi'
	cd sdk/dev && uv run longlink build --registry localhost:15000 --push --tag dev
