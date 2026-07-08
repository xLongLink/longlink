.PHONY: up down local-services build api\:build sdk\:build seed clean api\:clean sdk\:clean org\:clean sdk\:image\:clean web\:clean format api\:format sdk\:format org\:format web\:format api web sdk install api\:install sdk\:install org\:install web\:install tests tests\:all api\:tests sdk\:tests org\:tests web\:tests pyright api\:pyright sdk\:pyright org\:pyright

LOCAL_SDK_IMAGE := localhost:15000/longlink-app:dev
LOCAL_SDK_IMAGE_LABEL := longlink.name=longlink-app
API_PYTEST_MARK ?=


# Install all API, SDK, org, and web dependencies.
install: api\:install sdk\:install org\:install web\:install


# Install API Python development dependencies.
api\:install:
	cd api && uv sync --extra dev


# Install SDK Python development dependencies.
sdk\:install:
	cd sdk && uv sync --extra dev


# Install org Python development dependencies.
org\:install:
	cd org && uv sync --extra dev


# Install web JavaScript dependencies.
web\:install:
	bun i --cwd web


# Format API, SDK, org, and web/docs code.
format: api\:format sdk\:format org\:format web\:format


# Format API imports.
api\:format: api\:install
	cd api && uv run isort .


# Format SDK imports.
sdk\:format: sdk\:install
	cd sdk && uv run isort .


# Format org imports.
org\:format: org\:install
	cd org && uv run isort .


# Format web code and repository docs.
web\:format: web\:install
	cd web && bunx prettier --log-level warn --write . $$(cd .. && find . -name '*.md' -o -name '*.yml' -o -name '*.yaml' | sed 's#^./#../#')


# Run all API, SDK, org, and web tests/checks without container-backed integration tests.
tests:
	$(MAKE) api:tests API_PYTEST_MARK='-m "not integration"'
	$(MAKE) sdk:tests
	$(MAKE) org:tests
	$(MAKE) web:tests


# Run all API, SDK, org, and web tests/checks, including container-backed integration tests.
tests\:all: api\:tests sdk\:tests org\:tests web\:tests


# Run all API tests with coverage, including container-backed integration tests.
api\:tests: api\:install api\:build
	cd api && ENVIRONMENT=testing uv run pytest $(API_PYTEST_MARK) --cov=src --cov-report=term-missing tests


# Run SDK tests with coverage.
sdk\:tests: sdk\:install
	cd sdk && uv run pytest --cov=longlink --cov-report=term-missing tests


# Run org tests with coverage.
org\:tests: org\:install
	cd org && uv run pytest --cov=tenant --cov-report=term-missing tests


# Run web tests, typecheck, and bundle builds.
web\:tests: web\:install
	bun test tests --cwd web
	bun run --cwd web typecheck
	bun run --cwd web vite build --mode api --logLevel warn
	bun run --cwd web vite build --mode sdk --logLevel warn


# Run API, SDK, and org Pyright checks.
pyright: api\:pyright sdk\:pyright org\:pyright


# Run API Pyright checks.
api\:pyright:
	cd api && uv run --extra dev pyright


# Run SDK Pyright checks.
sdk\:pyright:
	cd sdk && uv run --group dev pyright


# Run org Pyright checks.
org\:pyright:
	cd org && uv run --extra dev pyright


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
clean: api\:clean sdk\:clean org\:clean sdk\:image\:clean web\:clean
	rm -rf .coverage .coverage.* coverage.xml htmlcov .pytest_cache .ruff_cache .mypy_cache


# Remove generated API build and test artifacts.
api\:clean:
	rm -rf api/.coverage api/.coverage.* api/coverage.xml api/htmlcov api/build api/dist api/*.egg-info api/kubeconfig.yaml api/openapi.yml api/src/.static/web
	find api -type d \( -name __pycache__ -o -name .pytest_cache -o -name .ruff_cache -o -name .mypy_cache \) -prune -exec rm -rf {} +
	find api -type f -name '*.py[co]' -delete


# Remove generated SDK build and test artifacts.
sdk\:clean:
	rm -rf sdk/.coverage sdk/.coverage.* sdk/coverage.xml sdk/htmlcov sdk/build sdk/dev sdk/dist sdk/*.egg-info sdk/longlink/.static/web
	find sdk -type d \( -name __pycache__ -o -name .pytest_cache -o -name .ruff_cache -o -name .mypy_cache \) -prune -exec rm -rf {} +
	find sdk -type f -name '*.py[co]' -delete


# Remove generated org build and test artifacts.
org\:clean:
	rm -rf org/.coverage org/.coverage.* org/coverage.xml org/htmlcov org/build org/dist org/*.egg-info
	find org -type d \( -name __pycache__ -o -name .pytest_cache -o -name .ruff_cache -o -name .mypy_cache \) -prune -exec rm -rf {} +
	find org -type f -name '*.py[co]' -delete


# Remove local Docker images produced by `make seed`.
sdk\:image\:clean:
	@if command -v docker >/dev/null 2>&1; then \
		docker image rm "$(LOCAL_SDK_IMAGE)" >/dev/null 2>&1 || true; \
		dangling_images="$$(docker image ls --quiet --filter "dangling=true" --filter "label=$(LOCAL_SDK_IMAGE_LABEL)" 2>/dev/null)"; \
		if [ -n "$$dangling_images" ]; then docker image rm $$dangling_images >/dev/null 2>&1 || true; fi; \
	fi


# Remove generated web build artifacts.
web\:clean:
	rm -rf web/dist web/dist-ssr web/*.tsbuildinfo web/node_modules/.tmp web/node_modules/.vite


# Start local services, registry, Keycloak, and cluster, then wait for service readiness.
up: local-services
	docker compose -f dev/compose.yml up -d
	@if k3d cluster list compute >/dev/null 2>&1; then \
		printf "k3d cluster compute already exists.\n"; \
	else \
		k3d cluster create compute --api-port 0.0.0.0:8001 -p "8080:80@loadbalancer" -p "8443:443@loadbalancer" --registry-config dev/registries.yml; \
	fi
	k3d kubeconfig get compute > api/kubeconfig.yaml
	@printf "Waiting for registry...\n"
	@attempt=1; \
	while ! curl --fail --silent --output /dev/null http://localhost:15000/v2/; do \
		if [ "$$attempt" -ge 60 ]; then \
			printf "Registry did not become ready after %s attempts.\n" "$$attempt"; \
			exit 1; \
		fi; \
		attempt=$$((attempt + 1)); \
		sleep 1; \
	done
	@printf "Registry is ready.\n"
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


# Start local services required by migrations and seeded app runtime resources.
local-services:
	docker compose -f dev/compose.yml up -d postgres minio
	@printf "Waiting for Postgres...\n"
	@attempt=1; \
	while ! docker compose -f dev/compose.yml exec -T postgres pg_isready -U admin >/dev/null 2>&1; do \
		if [ "$$attempt" -ge 60 ]; then \
			printf "Postgres did not become ready after %s attempts.\n" "$$attempt"; \
			exit 1; \
		fi; \
		attempt=$$((attempt + 1)); \
		sleep 1; \
	done
	@printf "Postgres is ready.\n"
	@printf "Waiting for MinIO...\n"
	@attempt=1; \
	while ! curl --fail --silent --output /dev/null http://localhost:19000/minio/health/ready; do \
		if [ "$$attempt" -ge 60 ]; then \
			printf "MinIO did not become ready after %s attempts.\n" "$$attempt"; \
			exit 1; \
		fi; \
		attempt=$$((attempt + 1)); \
		sleep 1; \
	done
	@printf "MinIO is ready.\n"


# Stop local services, remove the cluster, and clean Python caches.
down:
	rm -f api/dev.db api/kubeconfig.yaml
	-docker compose -f dev/compose.yml down --volumes --remove-orphans
	-k3d cluster delete compute
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	find . -type d -name .mypy_cache -prune -exec rm -rf {} +
	find . -type f -name '*.py[co]' -delete


# Run the local control plane API server after `make seed`.
api:
	cd api && uv sync --extra dev
	cd api && DEVELOPMENT=true uv run alembic upgrade head
	cd api && DEVELOPMENT=true uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload


# Start the local stack, build and push the SDK app image, then run migrations and seed data.
seed: up
	cd api && uv sync --extra dev
	if [ ! -d sdk/dev ]; then cd sdk && uv run longlink init --folder dev; fi
	cd sdk && sh -c 'file=dev/pyproject.toml; if ! grep -q "^\[tool\.uv\.sources\]$$" "$$file"; then printf "\n\n[tool.uv.sources]\nlonglink = { path = \"..\", editable = true }\n" >> "$$file"; fi'
	cd sdk/dev && uv run longlink build --registry localhost:15000 --push --tag dev
	cd api && DEVELOPMENT=true uv run alembic upgrade head
	cd api && DEVELOPMENT=true uv run python seed.py


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
