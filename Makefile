.PHONY: up local\:resources image down clear check build api\:build sdk\:build api\:manifests seed clean format python\:format api\:format sdk\:format web\:format api web sdk install api\:install sdk\:install web\:install test api\:test sdk\:test web\:test ty api\:ty sdk\:ty

DEV_DOCKER_NETWORK := longlink-dev
DEV_CLUSTER := compute
DEV_BUILDER := longlink-dev
DEV_K3S_IMAGE := rancher/k3s:v1.34.3-k3s1@sha256:c63773f3549c09ac5f79f57ae3b057118e7de394b3ae84cd9faf68a1be872ae5
DEV_CERTIFICATES := dev/certificates
PYTHON_IMPORT_FORMAT := uv run --locked ruff check --select I --fix .

# Install all API, SDK, and web dependencies.
install: api\:install sdk\:install web\:install


# Install API Python development dependencies.
api\:install:
	cd api && uv sync --locked --extra dev


# Download checksum-locked Kubernetes manifests used as API package data.
api\:manifests:
	cd api && uv run --locked python scripts/manifests.py


# Install SDK Python development dependencies.
sdk\:install:
	cd sdk && uv sync --locked --group dev


# Install web JavaScript dependencies.
web\:install:
	cd web && vp install --frozen-lockfile


# Run the same source checks and test suites required by CI.
check: test ty
	cd api && uv run --locked ruff check .
	cd sdk && uv run --locked ruff check .
	cd web && vp run check
	cd web && vp run check:platform-api
	cd web && vp run typecheck


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
	cd web && vp check --fix --no-fmt
	cd web && vp fmt --write . $$(git -C .. ls-files '*.md' '*.yml' '*.yaml' | sed "s#^#$$(cd .. && pwd)/#")


# Run API and SDK ty checks.
ty: api\:ty sdk\:ty


# Run API, SDK, and web tests.
test: api\:test sdk\:test web\:test


# Run API tests with coverage.
api\:test: api\:install api\:manifests api\:build
	cd api && uv run --locked --extra dev pytest --cov=main --cov=src --cov-report=term-missing


# Run SDK tests with coverage.
sdk\:test: sdk\:install sdk\:build
	cd sdk && uv run --locked --group dev pytest --cov --cov-report=term-missing


# Run web tests.
web\:test: web\:install
	cd web && vp run test


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
		image="$$(docker inspect "k3d-$(DEV_CLUSTER)-server-0" --format '{{.Config.Image}}')"; \
		if [ "$$image" != "$(DEV_K3S_IMAGE)" ]; then \
			printf "Existing k3d cluster uses %s instead of $(DEV_K3S_IMAGE). Run make down before make up.\n" "$$image"; \
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
		k3d cluster create "$(DEV_CLUSTER)" --image "$(DEV_K3S_IMAGE)" --network "$(DEV_DOCKER_NETWORK)" --api-port 127.0.0.1:8001 -p "127.0.0.1:8443:443@loadbalancer" --registry-config dev/registries.yml --k3s-arg "--disable=traefik@server:0"; \
	fi
	@umask 077; k3d kubeconfig get "$(DEV_CLUSTER)" > api/kubeconfig.yaml
	@mkdir -p "$(DEV_CERTIFICATES)"
	@if [ ! -f "$(DEV_CERTIFICATES)/ca.crt" ] || [ ! -f "$(DEV_CERTIFICATES)/gateway.crt" ] || [ ! -f "$(DEV_CERTIFICATES)/gateway.key" ]; then \
		printf "Creating local Kourier certificate.\n"; \
		openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
			-keyout "$(DEV_CERTIFICATES)/ca.key" -out "$(DEV_CERTIFICATES)/ca.crt" \
			-subj "/CN=LongLink Development CA" \
			-addext "basicConstraints=critical,CA:TRUE" \
			-addext "keyUsage=critical,keyCertSign,cRLSign" >/dev/null 2>&1; \
		openssl req -newkey rsa:2048 -nodes \
			-keyout "$(DEV_CERTIFICATES)/gateway.key" -out "$(DEV_CERTIFICATES)/gateway.csr" \
			-subj "/CN=localhost" \
			-addext "subjectAltName=DNS:localhost,IP:127.0.0.1" >/dev/null 2>&1; \
		printf "subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth\n" > "$(DEV_CERTIFICATES)/gateway.ext"; \
		openssl x509 -req -days 3650 \
			-in "$(DEV_CERTIFICATES)/gateway.csr" \
			-CA "$(DEV_CERTIFICATES)/ca.crt" -CAkey "$(DEV_CERTIFICATES)/ca.key" -CAcreateserial \
			-out "$(DEV_CERTIFICATES)/gateway.crt" -extfile "$(DEV_CERTIFICATES)/gateway.ext" >/dev/null 2>&1; \
		rm -f "$(DEV_CERTIFICATES)/gateway.csr" "$(DEV_CERTIFICATES)/gateway.ext" "$(DEV_CERTIFICATES)/ca.srl"; \
	fi
	@kubectl --kubeconfig api/kubeconfig.yaml create namespace knative-serving --dry-run=client --output=yaml | kubectl --kubeconfig api/kubeconfig.yaml apply --filename=- >/dev/null
	@kubectl --kubeconfig api/kubeconfig.yaml create namespace kourier-system --dry-run=client --output=yaml | kubectl --kubeconfig api/kubeconfig.yaml apply --filename=- >/dev/null
	@kubectl --kubeconfig api/kubeconfig.yaml --namespace knative-serving create secret tls longlink-gateway-tls \
		--cert="$(DEV_CERTIFICATES)/gateway.crt" --key="$(DEV_CERTIFICATES)/gateway.key" \
		--dry-run=client --output=yaml | kubectl --kubeconfig api/kubeconfig.yaml apply --filename=- >/dev/null
	@printf 'apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: longlink-local-api\n  namespace: kourier-system\nspec:\n  podSelector:\n    matchLabels:\n      app: 3scale-kourier-gateway\n  policyTypes: [Ingress]\n  ingress:\n    - ports:\n        - {protocol: TCP, port: 8444}\n' | \
		kubectl --kubeconfig api/kubeconfig.yaml apply --filename=- >/dev/null
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


# Initialize local infrastructure and build the local sample Solution image.
up: local\:resources
	$(MAKE) image


# Stop local services and remove local development state except cached volumes.
down:
	@if k3d cluster list "$(DEV_CLUSTER)" >/dev/null 2>&1; then k3d cluster delete "$(DEV_CLUSTER)"; fi
	@gateway="$$(docker network inspect "$(DEV_DOCKER_NETWORK)" --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || true)"; \
		if [ -z "$$gateway" ]; then gateway="127.0.0.2"; fi; \
		LONGLINK_DEV_GATEWAY="$$gateway" docker compose -f dev/compose.yml down --remove-orphans
	@if docker network inspect "$(DEV_DOCKER_NETWORK)" >/dev/null 2>&1; then docker network rm "$(DEV_DOCKER_NETWORK)"; fi
	@docker image rm --force "localhost:15000/sample:dev" >/dev/null 2>&1 || true
	@docker buildx rm --force "$(DEV_BUILDER)" >/dev/null 2>&1 || true
	rm -rf sdk/dev
	rm -f api/dev.db api/kubeconfig.yaml
	rm -rf "$(DEV_CERTIFICATES)"


# Remove local Compose volumes and the generated SDK development project.
clear:
	@gateway="$$(docker network inspect "$(DEV_DOCKER_NETWORK)" --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || true)"; \
		if [ -z "$$gateway" ]; then gateway="127.0.0.2"; fi; \
		LONGLINK_DEV_GATEWAY="$$gateway" docker compose -f dev/compose.yml down --volumes --remove-orphans
	rm -rf sdk/dev


# Run the local LongLink Platform API server before `make seed`.
api: api\:install api\:manifests
	cd api && DEVELOPMENT=true uv run --locked alembic upgrade head
	cd api && DEVELOPMENT=true uv run --locked python -m src.release
	cd api && DEVELOPMENT=true uv run --locked uvicorn main:app --host 127.0.0.1 --port 8000 --reload


# Build and push the local sample, preserving edits to an existing development project.
image: sdk\:build
	@docker buildx inspect "$(DEV_BUILDER)" >/dev/null 2>&1 || docker buildx create --name "$(DEV_BUILDER)" --driver docker-container
	@if [ ! -d sdk/dev ]; then \
		cd sdk && uv run --locked longlink init --folder dev --name sample && \
		printf '\n\n[tool.uv.sources]\nlonglink = { path = "..", editable = true }\n' >> dev/pyproject.toml; \
	fi
	cd sdk/dev && uv run longlink build --builder "$(DEV_BUILDER)" --registry localhost:15000 --push --tag dev


# Seed local infrastructure and create the local example Organization and Solution.
seed: api\:install api\:manifests
	cd api && DEVELOPMENT=true uv run --locked alembic upgrade head
	cd api && DEVELOPMENT=true uv run --locked python -m src.release
	cd api && DEVELOPMENT=true GATEWAY_CERTIFICATE="$$(cat ../$(DEV_CERTIFICATES)/ca.crt)" uv run --locked python -m scripts.seed


# Run the Vite web app.
web: web\:install
	cd web && vp run dev --host 127.0.0.1 --port 5173


# Build the SDK web bundle, then recreate and run the generated SDK development app.
sdk: sdk\:build
	rm -rf sdk/dev
	cd sdk && uv run --locked longlink init --folder dev --name sample && \
		printf '\n\n[tool.uv.sources]\nlonglink = { path = "..", editable = true }\n' >> dev/pyproject.toml
	cd sdk/dev && uv run longlink dev
