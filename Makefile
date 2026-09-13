.PHONY: install check format build test up image down api web sdk sample seed

HELMFILE_IMAGE := ghcr.io/helmfile/helmfile:v1.8.0


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


# Initialize configuration before starting local infrastructure or the API.
up api: api/.env


# Create or reapply local resources in dependency order.
up:
	@set -eu; addresses="$$(getent ahosts storage.localhost)"; test -n "$$addresses"; \
		printf '%s\n' "$$addresses" | while read -r address rest; do \
			case "$$address" in 127.*|::1) ;; *) printf "storage.localhost must resolve to loopback.\n" >&2; exit 1 ;; esac; \
		done
	docker compose -f dev/compose.yml up --detach --wait mail
	@if ! k3d cluster list compute >/dev/null 2>&1; then \
		k3d cluster create --config dev/cluster.yaml; \
	fi
	@umask 077; k3d kubeconfig get compute > dev/kubeconfig.yaml
	kubectl --kubeconfig dev/kubeconfig.yaml apply --server-side --field-manager=longlink-development -k dev/compute/bootstrap
	kubectl --kubeconfig dev/kubeconfig.yaml rollout status statefulset/csi-hostpathplugin --namespace longlink-development --timeout=300s

	# Generate leaf certificates from a stable local CA; make down removes the certificate set.
	@set -eu; umask 077; mkdir -p dev/certificates; \
		if [ ! -s dev/certificates/ca.key ] || [ ! -s dev/certificates/ca.crt ]; then \
			openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
				-keyout dev/certificates/ca.key -out dev/certificates/ca.crt \
				-subj "/CN=LongLink Development CA" \
				-addext "basicConstraints=critical,CA:TRUE" \
				-addext "keyUsage=critical,keyCertSign,cRLSign"; \
		fi; \
		openssl req -new -newkey rsa:2048 -nodes -keyout dev/certificates/gateway.key -subj "/CN=localhost" | \
				openssl x509 -req -days 3650 \
					-CA dev/certificates/ca.crt -CAkey dev/certificates/ca.key -set_serial "0x$$(openssl rand -hex 16)" \
					-extfile dev/tls.cnf -extensions gateway -out dev/certificates/gateway.crt; \
		kubectl --kubeconfig dev/kubeconfig.yaml --namespace knative-serving create secret tls longlink-gateway-tls \
			--cert=dev/certificates/gateway.crt --key=dev/certificates/gateway.key --dry-run=client --output=yaml | \
			kubectl --kubeconfig dev/kubeconfig.yaml apply --filename=-; \
		openssl req -new -newkey rsa:2048 -nodes -keyout dev/certificates/storage.key -subj "/CN=storage.localhost" | \
				openssl x509 -req -days 3650 \
					-CA dev/certificates/ca.crt -CAkey dev/certificates/ca.key -set_serial "0x$$(openssl rand -hex 16)" \
					-extfile dev/tls.cnf -extensions storage -out dev/certificates/storage.crt; \
		kubectl --kubeconfig dev/kubeconfig.yaml --namespace rook-ceph create secret tls longlink-storage-tls \
			--cert=dev/certificates/storage.crt --key=dev/certificates/storage.key --dry-run=client --output=yaml | \
		kubectl --kubeconfig dev/kubeconfig.yaml apply --filename=-
	# Kourier's controller and Rook's gateway load TLS only at process startup.
	@if kubectl --kubeconfig dev/kubeconfig.yaml get deployment/net-kourier-controller --namespace knative-serving >/dev/null 2>&1; then \
		kubectl --kubeconfig dev/kubeconfig.yaml rollout restart deployment/net-kourier-controller --namespace knative-serving; \
	fi
	kubectl --kubeconfig dev/kubeconfig.yaml delete pod --namespace rook-ceph --selector=app=rook-ceph-rgw,rook_object_store=longlink --ignore-not-found

	# Install connectivity and shared controllers before publishing the release.
	kubectl --kubeconfig dev/kubeconfig.yaml apply -k dev/compute/connectivity
	kubectl --kubeconfig dev/kubeconfig.yaml rollout restart deployment/coredns --namespace kube-system
	kubectl --kubeconfig dev/kubeconfig.yaml rollout status deployment/coredns --namespace kube-system --timeout=120s
	@if command -v helmfile >/dev/null 2>&1; then \
		KUBECONFIG="$(abspath dev/kubeconfig.yaml)" helmfile --file k8s/setup.yaml.gotmpl --environment development sync; \
	else \
		docker run --rm --network host --volume "$(CURDIR):/workspace:ro" --volume "$(abspath dev/kubeconfig.yaml):/kubeconfig:ro" --workdir /workspace --env KUBECONFIG=/kubeconfig --entrypoint helmfile "$(HELMFILE_IMAGE)" --file k8s/setup.yaml.gotmpl --environment development sync; \
	fi
	kubectl --kubeconfig dev/kubeconfig.yaml rollout status deployment/net-kourier-controller --namespace knative-serving --timeout=120s
	kubectl --kubeconfig dev/kubeconfig.yaml rollout status deployment/3scale-kourier-gateway --namespace kourier-system --timeout=120s
	kubectl --kubeconfig dev/kubeconfig.yaml rollout status deployment/rook-ceph-rgw-longlink-a --namespace rook-ceph --timeout=120s
	# Verify host TLS connectivity through the k3d port mappings.
	curl --fail --silent --show-error --retry 30 --retry-all-errors --retry-delay 2 --max-time 5 --cacert dev/certificates/ca.crt --header 'Host: internalkourier' https://localhost:8443/ready
	curl --fail --silent --show-error --retry 30 --retry-all-errors --retry-delay 2 --max-time 5 --cacert dev/certificates/ca.crt --output /dev/null https://storage.localhost:9443


# Build and push the local sample, preserving an existing development project.
image: sample
	@docker buildx inspect longlink-dev >/dev/null 2>&1 || docker buildx create --name longlink-dev --driver docker-container
	cd sdk/dev && uv run longlink build --builder longlink-dev --registry localhost:15000 --push --tag dev


# Stop local services and remove generated cluster and API state.
down:
	@if k3d cluster list compute >/dev/null 2>&1; then k3d cluster delete compute; fi
	@k3d registry delete longlink-registry >/dev/null 2>&1 || :
	docker compose -f dev/compose.yml down --volumes --remove-orphans
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
