.PHONY: install check format build test up _up compute _compute certificates _certificates connect configure image down api web sdk seed

DEV_K3S_IMAGE := rancher/k3s:v1.34.3-k3s1@sha256:c63773f3549c09ac5f79f57ae3b057118e7de394b3ae84cd9faf68a1be872ae5

# Install all development dependencies.
install:
	cd api && uv sync --locked --extra dev
	cd sdk && uv sync --locked --group dev
	cd web && vp install --frozen-lockfile
	$(MAKE) configure


# Initialize local configuration once; existing settings remain operator-owned.
configure:
	@umask 077; test -e api/.env || cp -n api/.env.sample api/.env


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
up: configure
	flock --exclusive --nonblock dev/compute.lock $(MAKE) _up COMPUTE_LOCKED=1


# Hold the deployment lock through backing storage, certificates, operators, and endpoint setup.
_up:
	@test "$(COMPUTE_LOCKED)" = 1 || { printf "Run make up to acquire the deployment lock.\n"; exit 1; }
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
		LONGLINK_DEV_GATEWAY="$$gateway" docker compose -f dev/compose.yml up --detach --wait registry mail
	@if ! k3d cluster list compute >/dev/null 2>&1; then \
		k3d cluster create compute --image "$(DEV_K3S_IMAGE)" --network longlink-dev --api-port 127.0.0.1:8001 --volume "/dev:/dev@server:0" --volume "/run/udev:/run/udev:ro@server:0" --registry-config dev/registries.yml --k3s-arg "--disable=traefik@server:0"; \
	fi
	@umask 077; k3d kubeconfig get compute > api/kubeconfig.yaml
	$(MAKE) _compute COMPUTE_LOCKED=1
	@curl --fail --silent --show-error --output /dev/null --retry 59 --retry-delay 1 --retry-connrefused http://localhost:15000/v2/
	$(MAKE) image


# Issue local certificates without racing Platform workers.
certificates:
	flock --exclusive --nonblock dev/compute.lock $(MAKE) _certificates COMPUTE_LOCKED=1


# Preserve the CA and reusable certificates; generate keys only inside ignored private storage.
_certificates:
	@test "$(COMPUTE_LOCKED)" = 1 || { printf "Run make certificates to acquire the deployment lock.\n"; exit 1; }
	kubectl --kubeconfig api/kubeconfig.yaml apply --server-side --field-manager=longlink-development -f dev/compute/namespaces.yaml
	@set -eu; umask 077; mkdir -p dev/certificates; \
		temporary="$$(mktemp -d dev/certificates/.generate.XXXXXX)"; \
		trap 'rm -rf "$$temporary"' EXIT; \
		if [ ! -e dev/certificates/ca.crt ] && [ ! -e dev/certificates/ca.key ]; then \
			openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
				-keyout dev/certificates/ca.key -out dev/certificates/ca.crt \
				-subj "/CN=LongLink Development CA" \
				-addext "basicConstraints=critical,CA:TRUE" \
				-addext "keyUsage=critical,keyCertSign,cRLSign"; \
		fi; \
		test -s dev/certificates/ca.key; \
		openssl verify -CAfile dev/certificates/ca.crt dev/certificates/ca.crt; \
		for name in gateway storage; do \
			case "$$name" in gateway) hostname=localhost; namespace=knative-serving ;; storage) hostname=storage.localhost; namespace=rook-ceph ;; esac; \
			key="dev/certificates/$$name.key"; certificate="dev/certificates/$$name.crt"; \
			if [ ! -s "$$key" ] || [ ! -s "$$certificate" ] \
				|| ! openssl x509 -in "$$certificate" -checkend 86400 -noout >/dev/null 2>&1 \
				|| ! openssl verify -CAfile dev/certificates/ca.crt -verify_hostname "$$hostname" "$$certificate" >/dev/null 2>&1 \
				|| [ "$$(openssl pkey -in "$$key" -pubout)" != "$$(openssl x509 -in "$$certificate" -pubkey -noout)" ]; then \
				openssl req -new -newkey rsa:2048 -nodes -keyout "$$temporary/$$name.key" -out "$$temporary/$$name.csr" -subj "/CN=$$hostname"; \
				openssl x509 -req -days 365 -in "$$temporary/$$name.csr" \
					-CA dev/certificates/ca.crt -CAkey dev/certificates/ca.key -set_serial "0x$$(openssl rand -hex 16)" \
					-extfile dev/tls.cnf -extensions "$$name" -out "$$temporary/$$name.crt"; \
				cat dev/certificates/ca.crt >> "$$temporary/$$name.crt"; \
				mv "$$temporary/$$name.key" "$$key"; mv "$$temporary/$$name.crt" "$$certificate"; \
			fi; \
			kubectl --kubeconfig api/kubeconfig.yaml --namespace "$$namespace" create secret tls "longlink-$$name-tls" \
				--cert="$$certificate" --key="$$key" --dry-run=client --output=yaml > "$$temporary/secret.yaml"; \
			kubectl --kubeconfig api/kubeconfig.yaml apply --filename="$$temporary/secret.yaml"; \
		done


# Apply the local Compute package while Platform workers are stopped.
compute:
	flock --exclusive --nonblock dev/compute.lock $(MAKE) _compute COMPUTE_LOCKED=1


# Apply dependency-ordered Kustomize stages and publish the contract last.
_compute:
	@test "$(COMPUTE_LOCKED)" = 1 || { printf "Run make compute to acquire the deployment lock.\n"; exit 1; }
	@set -eu; addresses="$$(getent ahosts storage.localhost)"; test -n "$$addresses"; \
		printf '%s\n' "$$addresses" | while read -r address rest; do \
			case "$$address" in 127.*|::1) ;; *) printf "storage.localhost must resolve to loopback.\n" >&2; exit 1 ;; esac; \
		done
	kubectl --kubeconfig api/kubeconfig.yaml delete configmap compute-release --namespace longlink-system --ignore-not-found
	kubectl --kubeconfig api/kubeconfig.yaml apply --server-side --field-manager=longlink-development -k dev/compute/backing
	kubectl --kubeconfig api/kubeconfig.yaml rollout status statefulset/csi-hostpathplugin --namespace longlink-development --timeout=300s
	$(MAKE) _certificates COMPUTE_LOCKED=1
	kubectl --kubeconfig api/kubeconfig.yaml apply -k dev/compute/connectivity
	kubectl --kubeconfig api/kubeconfig.yaml rollout restart deployment/coredns --namespace kube-system
	kubectl --kubeconfig api/kubeconfig.yaml rollout status deployment/coredns --namespace kube-system --timeout=120s
	kubectl --kubeconfig api/kubeconfig.yaml apply --server-side --field-manager=longlink-compute -k k8s/boundaries
	kubectl --kubeconfig api/kubeconfig.yaml apply --server-side --field-manager=longlink-compute -k k8s/operators/serving-crds
	kubectl --kubeconfig api/kubeconfig.yaml wait --for=condition=Established --all customresourcedefinitions --timeout=120s
	kubectl --kubeconfig api/kubeconfig.yaml apply --server-side --field-manager=longlink-compute -k k8s/operators/serving
	kubectl --kubeconfig api/kubeconfig.yaml rollout status deployment --namespace knative-serving --timeout=900s
	kubectl --kubeconfig api/kubeconfig.yaml wait --for=jsonpath='{.webhooks[*].clientConfig.caBundle}' validatingwebhookconfiguration/config.webhook.serving.knative.dev mutatingwebhookconfiguration/webhook.serving.knative.dev validatingwebhookconfiguration/validation.webhook.serving.knative.dev --timeout=180s
	kubectl --kubeconfig api/kubeconfig.yaml apply --server-side --field-manager=longlink-compute -k k8s/operators/kourier
	kubectl --kubeconfig api/kubeconfig.yaml rollout status deployment --namespace knative-serving --timeout=900s
	kubectl --kubeconfig api/kubeconfig.yaml rollout status deployment --namespace kourier-system --timeout=900s
	kubectl --kubeconfig api/kubeconfig.yaml apply --server-side --field-manager=longlink-compute -k k8s/operators/cnpg
	kubectl --kubeconfig api/kubeconfig.yaml wait --for=condition=Established --all customresourcedefinitions --timeout=120s
	kubectl --kubeconfig api/kubeconfig.yaml rollout status deployment --namespace cnpg-system --timeout=900s
	@set -eu; for configuration in mutatingwebhookconfiguration/cnpg-mutating-webhook-configuration validatingwebhookconfiguration/cnpg-validating-webhook-configuration; do \
		hooks="$$(kubectl --kubeconfig api/kubeconfig.yaml get "$$configuration" -o jsonpath='{.webhooks[*].name}')"; \
		test -n "$$hooks"; \
		for hook in $$hooks; do \
			kubectl --kubeconfig api/kubeconfig.yaml wait --for="jsonpath={.webhooks[?(@.name=='$$hook')].clientConfig.caBundle}" "$$configuration" --timeout=180s; \
		done; \
	done
	kubectl --kubeconfig api/kubeconfig.yaml apply --server-side --field-manager=longlink-compute -k k8s/operators/rook-crds
	kubectl --kubeconfig api/kubeconfig.yaml wait --for=condition=Established --all customresourcedefinitions --timeout=120s
	kubectl --kubeconfig api/kubeconfig.yaml apply --server-side --field-manager=longlink-compute -k dev/compute/operators/rook
	kubectl --kubeconfig api/kubeconfig.yaml rollout status deployment --namespace rook-ceph --timeout=900s
	kubectl --kubeconfig api/kubeconfig.yaml apply --server-side --field-manager=longlink-compute -k dev/compute/infrastructure
	kubectl --kubeconfig api/kubeconfig.yaml wait --for=jsonpath='{.status.phase}'=Ready cephcluster/rook-ceph cephobjectstore/longlink cephobjectstoreuser/longlink-health --namespace rook-ceph --timeout=1800s
	kubectl --kubeconfig api/kubeconfig.yaml apply --server-side --field-manager=longlink-compute -k k8s/release
	$(MAKE) connect


# Keep endpoint connectivity outside the host-run API's process lifetime.
connect:
	@gateway="$$(docker network inspect longlink-dev --format '{{(index .IPAM.Config 0).Gateway}}')"; \
		LONGLINK_DEV_GATEWAY="$$gateway" docker compose -f dev/compose.yml up --detach --wait gateway storage


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
	@LONGLINK_DEV_GATEWAY=127.0.0.2 docker compose -f dev/compose.yml down --remove-orphans
	@if k3d cluster list compute >/dev/null 2>&1; then k3d cluster delete compute; fi
	@if docker network inspect longlink-dev >/dev/null 2>&1; then docker network rm longlink-dev; fi
	rm -f api/dev.db api/kubeconfig.yaml
	rm -rf dev/certificates


# Prepare and run the local LongLink Platform API server.
api: configure
	cd api && uv run --locked alembic upgrade head
	cd api && uv run --locked python -m src.release
	cd api && flock --shared --nonblock ../dev/compute.lock uv run --locked uvicorn main:app --host 127.0.0.1 --port 8000 --reload


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
seed: configure
	cd api && GATEWAY_CERTIFICATE="$$(cat ../dev/certificates/ca.crt)" STORAGE_CERTIFICATE="$$(cat ../dev/certificates/ca.crt)" STORAGE_ENDPOINT=https://storage.localhost:9443 uv run --locked python -m scripts.seed
