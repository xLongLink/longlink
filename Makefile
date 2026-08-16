.PHONY: up local\:resources local\:image down build api\:build sdk\:build seed clean format python\:format api\:format sdk\:format web\:format api web sdk install api\:install sdk\:install web\:install ty api\:ty sdk\:ty

DEV_DOCKER_NETWORK := longlink-dev
DEV_CLUSTER := compute
PYTHON_IMPORT_FORMAT := uv run --locked ruff check --select I --fix .

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
format: python\:format web\:format


# Format API and SDK imports.
python\:format: api\:format sdk\:format


# Format API imports.
api\:format: api\:install
	cd api && $(PYTHON_IMPORT_FORMAT)


# Format SDK imports.
sdk\:format: sdk\:install
	cd sdk && $(PYTHON_IMPORT_FORMAT)


# Format web code and repository docs.
web\:format: web\:install
	cd web && vp run format
	cd web && vp fmt --write $$(git -C .. ls-files '*.md' '*.yml' '*.yaml' | sed "s#^#$$(cd .. && pwd)/#")
	cd web && vp check --fix


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


# Remove tracked remote development resources.
clean:
	@printf "Removing tracked remote development resources...\n"
	cd api && DEVELOPMENT=true uv run --locked python -m scripts.cleanup


# Start isolated local services and the cluster, then wait for the local registry.
local\:resources:
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


# Initialize local infrastructure and build the local sample Application image.
up: local\:resources
	$(MAKE) local:image


# Stop local services and remove local development state.
down:
	@if k3d cluster list "$(DEV_CLUSTER)" >/dev/null 2>&1; then k3d cluster delete "$(DEV_CLUSTER)"; fi
	@gateway="$$(docker network inspect "$(DEV_DOCKER_NETWORK)" --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || true)"; \
		if [ -z "$$gateway" ]; then gateway="127.0.0.2"; fi; \
		LONGLINK_DEV_GATEWAY="$$gateway" docker compose -f dev/compose.yml down --volumes --remove-orphans
	@if docker network inspect "$(DEV_DOCKER_NETWORK)" >/dev/null 2>&1; then docker network rm "$(DEV_DOCKER_NETWORK)"; fi
	rm -rf sdk/dev
	rm -f api/dev.db api/kubeconfig.yaml


# Run the local LongLink Platform API server before `make seed`.
api: api\:install
	cd api && DEVELOPMENT=true uv run --locked alembic upgrade head
	cd api && DEVELOPMENT=true uv run --locked python -m src.release
	cd api && DEVELOPMENT=true uv run --locked uvicorn main:app --host 127.0.0.1 --port 8000 --reload


# Build and push the local sample Application image into the development registry.
local\:image: sdk\:build
	rm -rf sdk/dev
	cd sdk && uv run --locked longlink init --folder dev
	cd sdk && if ! grep -q "^\[tool\.uv\.sources\]$$" dev/pyproject.toml; then printf '\n\n[tool.uv.sources]\nlonglink = { path = "..", editable = true }\n' >> dev/pyproject.toml; fi
	cd sdk/dev && uv run longlink build --registry localhost:15000 --push --tag dev


# Seed the configured Kubernetes compute without preparing local infrastructure.
seed:
	cd api && uv sync --locked --extra dev
	cd api && DEVELOPMENT=true uv run --locked alembic upgrade head
	cd api && DEVELOPMENT=true uv run --locked python -m src.release
	cd api && DEVELOPMENT=true uv run --locked python -m scripts.seed


# Run the Vite web app.
web: web\:install
	cd web && vp run dev --host 127.0.0.1 --port 5173


# Build the SDK web bundle, then recreate and run the generated SDK development app.
sdk: sdk\:build
	rm -rf sdk/dev
	cd sdk && uv run --locked longlink init --folder dev
	cd sdk && if ! grep -q "^\[tool\.uv\.sources\]$$" dev/pyproject.toml; then printf '\n\n[tool.uv.sources]\nlonglink = { path = "..", editable = true }\n' >> dev/pyproject.toml; fi
	cd sdk/dev && uv run longlink dev
