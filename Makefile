.PHONY: install check format build test up image down api web sdk seed

DEV_K3S_IMAGE := rancher/k3s:v1.34.3-k3s1@sha256:c63773f3549c09ac5f79f57ae3b057118e7de394b3ae84cd9faf68a1be872ae5

# Install all development dependencies.
install:
	cd api && uv sync --locked --extra dev
	cd sdk && uv sync --locked --group dev
	cd web && vp install --frozen-lockfile


# Run lint, type, and contract checks.
check:
	cd api && uv run --locked ruff check .
	cd api && uv run --locked --extra dev ty check
	cd sdk && uv run --locked ruff check .
	cd sdk && uv run --locked --group dev ty check
	cd web && vp run check
	cd web && vp run check:platform-api
	cd web && vp run typecheck


# Format Python imports, web code, and repository documentation.
format:
	cd api && uv run --locked ruff check --select I --fix .
	cd sdk && uv run --locked ruff check --select I --fix .
	cd web && vp check --fix --no-fmt
	cd web && vp fmt --write . $$(git -C .. ls-files '*.md' '*.yml' '*.yaml' | sed "s#^#$$(cd .. && pwd)/#")


# Typecheck and build both web bundle modes.
build:
	cd web && vp run build


# Build required bundles and run all test suites.
test:
	cd web && vp run build:api:bundle --logLevel warn
	cd api && uv run --locked --extra dev pytest --cov=main --cov=src --cov-report=term-missing
	cd web && vp run build:sdk:bundle --logLevel warn
	cd sdk && uv run --locked --group dev pytest --cov --cov-report=term-missing
	cd web && vp run test


# Initialize local infrastructure and build the local sample Solution image.
up:
	@docker network inspect longlink-dev >/dev/null 2>&1 || docker network create longlink-dev
	@if k3d cluster list compute >/dev/null 2>&1; then \
		network_ip="$$(docker inspect k3d-compute-server-0 --format '{{with index .NetworkSettings.Networks "longlink-dev"}}{{.IPAddress}}{{end}}')"; \
		if [ -z "$$network_ip" ]; then \
			printf "Existing k3d cluster is not attached to longlink-dev. Run make down before make up.\n"; \
			exit 1; \
		fi; \
		image="$$(docker inspect k3d-compute-server-0 --format '{{.Config.Image}}')"; \
		if [ "$$image" != "$(DEV_K3S_IMAGE)" ]; then \
			printf "Existing k3d cluster uses %s instead of $(DEV_K3S_IMAGE). Run make down before make up.\n" "$$image"; \
			exit 1; \
		fi; \
		mounts="$$(docker inspect k3d-compute-server-0 --format '{{range .Mounts}}{{if or (eq .Destination "/dev") (eq .Destination "/run/udev")}}{{.Destination}} {{end}}{{end}}')"; \
		case "$$mounts" in *"/dev "*"/run/udev "*|*"/run/udev "*"/dev "*) ;; \
			*) printf "Existing k3d cluster lacks Ceph development device mounts. Run make down and make up to recreate local state.\n"; exit 1 ;; \
		esac; \
	fi
	@gateway="$$(docker network inspect longlink-dev --format '{{(index .IPAM.Config 0).Gateway}}')"; \
		if [ -z "$$gateway" ]; then printf "Development Docker network has no gateway.\n"; exit 1; fi; \
		LONGLINK_DEV_GATEWAY="$$gateway" docker compose -f dev/compose.yml up --detach --wait
	@if ! k3d cluster list compute >/dev/null 2>&1; then \
		k3d cluster create compute --image "$(DEV_K3S_IMAGE)" --network longlink-dev --api-port 127.0.0.1:8001 --volume "/dev:/dev@server:0" --volume "/run/udev:/run/udev:ro@server:0" --registry-config dev/registries.yml --k3s-arg "--disable=traefik@server:0"; \
	fi
	@umask 077; k3d kubeconfig get compute > api/kubeconfig.yaml
	@mkdir -p dev/certificates
	@if [ ! -f dev/certificates/ca.crt ] || [ ! -f dev/certificates/gateway.crt ] || [ ! -f dev/certificates/gateway.key ]; then \
		openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
			-keyout dev/certificates/ca.key -out dev/certificates/ca.crt \
			-subj "/CN=LongLink Development CA" \
			-addext "basicConstraints=critical,CA:TRUE" \
			-addext "keyUsage=critical,keyCertSign,cRLSign" >/dev/null 2>&1; \
		openssl req -newkey rsa:2048 -nodes \
			-keyout dev/certificates/gateway.key -out dev/certificates/gateway.csr \
			-subj "/CN=localhost" \
			-addext "subjectAltName=DNS:localhost,IP:127.0.0.1" >/dev/null 2>&1; \
		printf "subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth\n" > dev/certificates/gateway.ext; \
		openssl x509 -req -days 3650 \
			-in dev/certificates/gateway.csr \
			-CA dev/certificates/ca.crt -CAkey dev/certificates/ca.key -CAcreateserial \
			-out dev/certificates/gateway.crt -extfile dev/certificates/gateway.ext >/dev/null 2>&1; \
		rm -f dev/certificates/gateway.csr dev/certificates/gateway.ext dev/certificates/ca.srl; \
	fi
	@kubectl --kubeconfig api/kubeconfig.yaml create namespace knative-serving --dry-run=client --output=yaml | kubectl --kubeconfig api/kubeconfig.yaml apply --filename=- >/dev/null
	@kubectl --kubeconfig api/kubeconfig.yaml create namespace kourier-system --dry-run=client --output=yaml | kubectl --kubeconfig api/kubeconfig.yaml apply --filename=- >/dev/null
	@kubectl --kubeconfig api/kubeconfig.yaml --namespace knative-serving create secret tls longlink-gateway-tls \
		--cert=dev/certificates/gateway.crt --key=dev/certificates/gateway.key \
		--dry-run=client --output=yaml | kubectl --kubeconfig api/kubeconfig.yaml apply --filename=- >/dev/null
	cd api && DEVELOPMENT=true uv run --locked python -m src.development.setup
	@curl --fail --silent --show-error --output /dev/null --retry 59 --retry-delay 1 --retry-connrefused http://localhost:15000/v2/
	$(MAKE) image


# Build and push the local sample, preserving an existing development project.
image:
	cd web && vp run build:sdk:bundle --logLevel warn
	@docker buildx inspect longlink-dev >/dev/null 2>&1 || docker buildx create --name longlink-dev --driver docker-container
	@if [ ! -d sdk/dev ]; then \
		cd sdk && uv run --locked longlink init --folder dev --name sample && \
		printf '\n\n[tool.uv.sources]\nlonglink = { path = "..", editable = true }\n' >> dev/pyproject.toml; \
	fi
	cd sdk/dev && uv run longlink build --builder longlink-dev --registry localhost:15000 --push --tag dev


# Stop local services and remove generated cluster and API state.
down:
	@if k3d cluster list compute >/dev/null 2>&1; then k3d cluster delete compute; fi
	@LONGLINK_DEV_GATEWAY=127.0.0.2 docker compose -f dev/compose.yml down --remove-orphans
	@if docker network inspect longlink-dev >/dev/null 2>&1; then docker network rm longlink-dev; fi
	rm -f api/dev.db api/kubeconfig.yaml
	rm -rf dev/certificates


# Prepare and run the local LongLink Platform API server.
api:
	cd api && DEVELOPMENT=true uv run --locked alembic upgrade head
	cd api && DEVELOPMENT=true uv run --locked python -m src.release
	cd api && DEVELOPMENT=true uv run --locked uvicorn main:app --host 127.0.0.1 --port 8000 --reload


# Run the Vite web app.
web:
	cd web && vp run dev --host 127.0.0.1 --port 5173


# Build the SDK bundle and run the local sample Solution.
sdk:
	cd web && vp run build:sdk:bundle --logLevel warn
	@if [ ! -d sdk/dev ]; then \
		cd sdk && uv run --locked longlink init --folder dev --name sample && \
		printf '\n\n[tool.uv.sources]\nlonglink = { path = "..", editable = true }\n' >> dev/pyproject.toml; \
	fi
	cd sdk/dev && uv run longlink dev


# Seed the example Organization and Solution after the Platform API starts.
seed:
	cd api && DEVELOPMENT=true GATEWAY_CERTIFICATE="$$(cat ../dev/certificates/ca.crt)" uv run --locked python -m scripts.seed
