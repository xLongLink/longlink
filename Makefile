.PHONY: up down build api\:build sdk\:build seed clean api\:clean sdk\:clean web\:clean format api\:format sdk\:format web\:format api web sdk install api\:install sdk\:install web\:install tests tests\:all coverage api\:coverage sdk\:coverage api\:tests sdk\:tests sdk\:scaffold\:tests web\:tests ty api\:ty sdk\:ty

LOCAL_APPLICATION_IMAGE ?= ghcr.io/xlonglink/longlink-app:v0.0.2
DEV_DOCKER_NETWORK := longlink-dev
DEV_CLUSTER := compute
API_PYTEST_MARK ?=
SDK_PYTEST_MARK ?=


# Install all API, SDK, and web dependencies.
install: api\:install sdk\:install web\:install


# Install API Python development dependencies.
api\:install:
	cd api && uv sync --locked --extra dev


# Install SDK Python development dependencies.
sdk\:install:
	cd sdk && uv sync --locked --group dev


# Install web JavaScript dependencies.
web\:install:
	cd web && vp install --frozen-lockfile


# Format API, SDK, and web/docs code.
format: api\:format sdk\:format web\:format


# Format API imports.
api\:format: api\:install
	cd api && uv run --locked isort .


# Format SDK imports.
sdk\:format: sdk\:install
	cd sdk && uv run --locked isort .


# Format web code and repository docs.
web\:format: web\:install
	cd web && vp fmt --write . $$(git -C .. ls-files '*.md' '*.yml' '*.yaml' | sed "s#^#$$(cd .. && pwd)/#")


# Run fast API, SDK, and web checks without infrastructure or scaffold smoke tests.
tests:
	$(MAKE) api:tests API_PYTEST_MARK='-m "not integration"'
	$(MAKE) sdk:tests SDK_PYTEST_MARK='-m "not integration"'
	$(MAKE) web:tests


# Run all checks, including container-backed integration and generated scaffold tests.
tests\:all: api\:tests sdk\:tests sdk\:scaffold\:tests web\:tests


# Run API tests, including container-backed integration tests.
api\:tests: api\:install api\:build
	cd api && ENVIRONMENT=testing uv run --locked pytest $(API_PYTEST_MARK) tests


# Build the embedded web bundle, then run SDK tests.
sdk\:tests: sdk\:install sdk\:build
	cd sdk && uv run --locked pytest $(SDK_PYTEST_MARK) tests


# Generate an isolated application and run its shipped tests.
sdk\:scaffold\:tests: sdk\:install sdk\:build
	cd sdk && sh tests/scaffold-smoke.sh


# Report coverage from the fast API and SDK suites.
coverage: api\:coverage sdk\:coverage


# Report API coverage without container-backed integration tests.
api\:coverage: api\:install api\:build
	cd api && ENVIRONMENT=testing uv run --locked pytest -m "not integration" --cov=src --cov-report=term-missing tests


# Report SDK coverage without container-backed integration tests.
sdk\:coverage: sdk\:install sdk\:build
	cd sdk && uv run --locked pytest -m "not integration" --cov=longlink --cov-report=term-missing tests


# Run web static checks, tests, typechecks, and bundle builds.
web\:tests: web\:install
	cd web && vp run check
	cd web && vp run test
	cd web && vp run build:prepared


# Run API and SDK ty checks.
ty: api\:ty sdk\:ty


# Run API ty checks.
api\:ty:
	cd api && uv run --locked --extra dev ty check


# Run SDK ty checks.
sdk\:ty:
	cd sdk && uv run --locked --group dev ty check


# Typecheck and build both web bundle modes.
build: web\:install
	cd web && vp run build


# Build the API web bundle.
api\:build: web\:install
	cd web && vp run build:api:bundle --logLevel warn


# Build the embedded SDK web bundle.
sdk\:build: web\:install
	cd web && vp run build:sdk:bundle --logLevel warn


# Remove generated build and test artifacts for every workspace.
clean: api\:clean sdk\:clean web\:clean
	rm -rf .coverage .coverage.* coverage.xml htmlcov .pytest_cache .ruff_cache


# Remove generated API build and test artifacts.
api\:clean:
	rm -rf api/.coverage api/.coverage.* api/coverage.xml api/htmlcov api/build api/dist api/*.egg-info api/kubeconfig.yaml api/openapi.yml api/src/.static/web
	find api -type d \( -name __pycache__ -o -name .pytest_cache -o -name .ruff_cache \) -prune -exec rm -rf {} +
	find api -type f -name '*.py[co]' -delete


# Remove generated SDK build and test artifacts.
sdk\:clean:
	rm -rf sdk/.coverage sdk/.coverage.* sdk/coverage.xml sdk/htmlcov sdk/build sdk/dev sdk/dist sdk/*.egg-info sdk/longlink/.static/web
	find sdk -type d \( -name __pycache__ -o -name .pytest_cache -o -name .ruff_cache \) -prune -exec rm -rf {} +
	find sdk -type f -name '*.py[co]' -delete


# Remove generated web build artifacts.
web\:clean:
	rm -rf web/build web/.react-router web/*.tsbuildinfo web/node_modules/.tmp web/node_modules/.vite web/src/lib/generated


# Start isolated local services and the cluster, then wait for the local registry.
up:
	@docker network inspect "$(DEV_DOCKER_NETWORK)" >/dev/null 2>&1 || docker network create "$(DEV_DOCKER_NETWORK)"
	@if k3d cluster list "$(DEV_CLUSTER)" >/dev/null 2>&1; then \
		network_ip="$$(docker inspect "k3d-$(DEV_CLUSTER)-server-0" --format '{{with index .NetworkSettings.Networks "$(DEV_DOCKER_NETWORK)"}}{{.IPAddress}}{{end}}')"; \
		if [ -z "$$network_ip" ]; then \
			printf "Existing k3d cluster is not attached to $(DEV_DOCKER_NETWORK). Run make down before make up.\n"; \
			exit 1; \
		fi; \
		printf "k3d cluster $(DEV_CLUSTER) already exists.\n"; \
	else \
		printf "Creating k3d cluster $(DEV_CLUSTER).\n"; \
	fi
	@gateway="$$(docker network inspect "$(DEV_DOCKER_NETWORK)" --format '{{(index .IPAM.Config 0).Gateway}}')"; \
		if [ -z "$$gateway" ]; then printf "Development Docker network has no gateway.\n"; exit 1; fi; \
		LONGLINK_DEV_GATEWAY="$$gateway" docker compose -f dev/compose.yml up --detach --wait
	@if ! k3d cluster list "$(DEV_CLUSTER)" >/dev/null 2>&1; then \
		k3d cluster create "$(DEV_CLUSTER)" --network "$(DEV_DOCKER_NETWORK)" --api-port 127.0.0.1:8001 -p "127.0.0.1:8443:443@loadbalancer" --registry-config dev/registries.yml --k3s-arg "--disable=traefik@server:0"; \
	fi
	@umask 077; k3d kubeconfig get "$(DEV_CLUSTER)" > api/kubeconfig.yaml
	@printf "Waiting for local registry...\n"
	@attempt=1; \
	while ! curl --fail --silent --output /dev/null http://localhost:15000/v2/; do \
		if [ "$$attempt" -ge 60 ]; then \
			printf "Local registry did not become ready after %s attempts.\n" "$$attempt"; \
			exit 1; \
		fi; \
		attempt=$$((attempt + 1)); \
		sleep 1; \
	done
	@printf "Local registry is ready.\n"


# Remove remote development resources, stop local services, and clean local state.
down:
	-cd api && DEVELOPMENT=true uv run --locked python seed.py --cleanup
	@if k3d cluster list "$(DEV_CLUSTER)" >/dev/null 2>&1; then k3d cluster delete "$(DEV_CLUSTER)"; fi
	@gateway="$$(docker network inspect "$(DEV_DOCKER_NETWORK)" --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || true)"; \
		if [ -z "$$gateway" ]; then gateway="127.0.0.2"; fi; \
		LONGLINK_DEV_GATEWAY="$$gateway" docker compose -f dev/compose.yml down --volumes --remove-orphans
	@if docker network inspect "$(DEV_DOCKER_NETWORK)" >/dev/null 2>&1; then docker network rm "$(DEV_DOCKER_NETWORK)"; fi
	rm -rf sdk/dev
	rm -f api/dev.db api/kubeconfig.yaml
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	find . -type f -name '*.py[co]' -delete


# Run the local LongLink Platform API server after `make seed`.
api:
	cd api && uv sync --locked --extra dev
	cd api && DEVELOPMENT=true uv run --locked alembic upgrade head
	cd api && DEVELOPMENT=true uv run --locked python -m src.release
	cd api && DEVELOPMENT=true uv run --locked uvicorn main:app --host 127.0.0.1 --port 8000 --reload


# Start local services, pull the seed Application image, then run migrations and seed data.
seed: up
	docker pull "$(LOCAL_APPLICATION_IMAGE)"
	cd api && uv sync --locked --extra dev
	cd api && DEVELOPMENT=true uv run --locked alembic upgrade head
	cd api && DEVELOPMENT=true uv run --locked python -m src.release
	cd api && DEVELOPMENT=true LOCAL_APPLICATION_IMAGE="$(LOCAL_APPLICATION_IMAGE)" uv run --locked python seed.py


# Run the Vite web app.
web: web\:install
	cd web && vp run dev --host 127.0.0.1 --port 5173


# Build the SDK web bundle, then recreate and run the generated SDK development app.
sdk: sdk\:build
	rm -rf sdk/dev
	cd sdk && uv run --locked longlink init --folder dev
	cd sdk && sh -c 'file=dev/pyproject.toml; if ! grep -q "^\[tool\.uv\.sources\]$$" "$$file"; then printf "\n\n[tool.uv.sources]\nlonglink = { path = \"..\", editable = true }\n" >> "$$file"; fi'
	cd sdk/dev && uv run longlink dev
