.PHONY: install check format build test package-compute up image down api web sdk sample seed

# Install all development dependencies.
install: api/.env
	cd api && uv sync --locked --extra dev
	cd sdk && uv sync --locked --group dev
	cd web && vp install --frozen-lockfile


# Initialize local configuration once; existing settings remain operator-owned.
api/.env:
	@umask 077; cp -n api/.env.sample api/.env


# Run lint, type, and contract checks.
check:
	cd api && uv run --locked ruff check .
	cd api && uv run --locked --extra dev ty check
	cd sdk && uv run --locked ruff check .
	cd sdk && uv run --locked --group dev ty check
	cd web && vp run check
	cd web && vp run check:platform-api
	cd web && vp run typecheck


# Format Python imports, web code, repository documentation, and plain YAML.
format:
	cd api && uv run --locked ruff check --select I --fix .
	cd sdk && uv run --locked ruff check --select I --fix .
	cd web && vp check --fix --no-fmt
	cd web && vp fmt --write . $$(git -C .. ls-files '*.md' '*.yml' '*.yaml' ':!k8s/chart/templates/**' ':!k8s/chart/charts/**/templates/**' | sed "s#^#$$(cd .. && pwd)/#")
	cd web && bunx prettier --plugin=@prettier/plugin-xml --xml-whitespace-sensitivity ignore --tab-width 4 --write 'src/platform/views/**/*.xml'


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


# Package the Compute chart into a deterministic archive named by ARCHIVE.
package-compute:
	test -n "$(ARCHIVE)"
	test -n "$(COMPUTE_VERSION)"
	@archive="$(ARCHIVE)"; version="$(COMPUTE_VERSION)"; \
	case "$$version" in n*) date="$${version#n}"; date="$${date%-*}"; date="$$(printf '%s' "$$date" | tr -d .)"; chart_version="0.0.0-nightly-$${date}-$${version##*-}" ;; *) chart_version="$${version#v}" ;; esac; \
	helm package k8s/chart --version "$$chart_version" --app-version "$$version" --destination "$$(dirname "$$archive")"; \
	packaged="$$(dirname "$$archive")/longlink-compute-$$chart_version.tgz"; \
	if [ "$$packaged" != "$$archive" ]; then mv "$$packaged" "$$archive"; fi
	sha256sum "$(ARCHIVE)" > "$(ARCHIVE).sha256"


# Initialize configuration before starting local infrastructure or the API.
up api: api/.env


# Create or reapply local resources in dependency order.
up:
	@set -eu; addresses="$$(getent ahosts storage.localhost)"; test -n "$$addresses"; \
		printf '%s\n' "$$addresses" | while read -r address rest; do \
			case "$$address" in 127.*|::1) ;; *) printf "storage.localhost must resolve to loopback.\n" >&2; exit 1 ;; esac; \
		done
	docker compose -f dev/compose.yml up --detach --wait mail
	@k3d cluster list compute >/dev/null 2>&1 || k3d cluster create --config dev/cluster.yaml
	@umask 077; k3d kubeconfig get compute > dev/kubeconfig.yaml
	KUBECONFIG="$(abspath dev/kubeconfig.yaml)" kubectl create namespace rustfs --dry-run=client --output yaml | KUBECONFIG="$(abspath dev/kubeconfig.yaml)" kubectl apply --filename -
	KUBECONFIG="$(abspath dev/kubeconfig.yaml)" helm upgrade --install longlink-compute k8s/chart --namespace longlink-system --create-namespace --values k8s/chart/values-development.yaml --wait --timeout 15m
	KUBECONFIG="$(abspath dev/kubeconfig.yaml)" kubectl delete --namespace rustfs job/longlink-bootstrap --ignore-not-found --wait=true
	KUBECONFIG="$(abspath dev/kubeconfig.yaml)" kubectl apply --filename dev/compute.yaml
	KUBECONFIG="$(abspath dev/kubeconfig.yaml)" kubectl wait --namespace rustfs --for=condition=complete --timeout=5m job/longlink-bootstrap
	install -d -m 700 dev/certificates
	kubectl --kubeconfig dev/kubeconfig.yaml --namespace knative-serving get secret longlink-gateway-tls --output jsonpath='{.data.tls\.crt}' | base64 --decode > dev/certificates/gateway.crt
	kubectl --kubeconfig dev/kubeconfig.yaml --namespace rustfs get secret longlink-storage-tls --output jsonpath='{.data.tls\.crt}' | base64 --decode > dev/certificates/storage.crt

	# Verify host TLS connectivity through the k3d port mappings.
	curl --fail --silent --show-error --retry 30 --retry-all-errors --retry-delay 2 --max-time 5 --cacert dev/certificates/gateway.crt --header 'Host: internalkourier' https://127.0.0.1:8443/ready
	curl --fail --silent --show-error --retry 30 --retry-all-errors --retry-delay 2 --max-time 5 --cacert dev/certificates/storage.crt --output /dev/null https://storage.localhost:9443/health/ready


# Build and push the local sample, preserving an existing development project.
image: sample
	cd sdk/dev && uv run longlink build --registry localhost:15000 --push --tag dev


# Stop local services and remove generated cluster and API state.
down:
	@if k3d cluster list compute >/dev/null 2>&1; then k3d cluster delete compute; fi
	@k3d registry delete longlink-registry >/dev/null 2>&1 || :
	docker compose -f dev/compose.yml down --remove-orphans
	rm -f api/dev.db dev/kubeconfig.yaml
	rm -rf dev/certificates


# Prepare and run the local LongLink Platform API server.
api:
	cd api && uv run --locked alembic upgrade head
	cd api && uv run --locked python -m src.release
	cd api && uv run --locked uvicorn main:app --host 127.0.0.1 --port 8000 --reload


# Run the Vite web app.
web:
	cd web && vp run dev --host 127.0.0.1 --port 5173


# Prepare the local sample for both host development and image builds.
sample:
	cd web && vp run build:sdk:bundle --logLevel warn
	@if [ ! -d sdk/dev ]; then \
		cd sdk && uv run --locked longlink init --folder dev --name sample && \
		printf '\n\n[tool.uv.sources]\nlonglink = { path = "..", editable = true }\n' >> dev/pyproject.toml; \
	fi


# Run the local sample Solution.
sdk: sample
	cd sdk/dev && uv run longlink dev


# Seed the local example Organization and Solution after the Platform API starts.
seed: api/.env
	cd api && uv run --locked python ../dev/scripts/seed.py
