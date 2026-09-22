.PHONY: install apt check format build test up image down api web sdk seed main


# Install host requirements (make, docker, k3d, helm, kubectl, uv) on Ubuntu.
apt:
	sudo apt-get update
	sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
	sudo install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
	sudo chmod a+r /etc/apt/keyrings/docker.asc
	@CODENAME=$$(. /etc/os-release && echo "$${UBUNTU_CODENAME:-$$VERSION_CODENAME}"); \
	ARCH=$$(dpkg --print-architecture); \
	printf "Types: deb\nURIs: https://download.docker.com/linux/ubuntu\nSuites: %s\nComponents: stable\nArchitectures: %s\nSigned-By: /etc/apt/keyrings/docker.asc\n" "$$CODENAME" "$$ARCH" | sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null
	curl -fsSL https://packages.buildkite.com/helm-linux/helm-debian/gpgkey -o $${TMPDIR:-/tmp}/helm.gpg
	@if [ "$$(gpg --show-keys --with-colons $${TMPDIR:-/tmp}/helm.gpg | awk -F: '$$1 == "fpr" {print $$10}' | head -n 1)" != "DDF78C3E6EBB2D2CC223C95C62BA89D07698DBC6" ]; then echo "ERROR: Unexpected Helm APT key ID" >&2; exit 1; fi
	cat $${TMPDIR:-/tmp}/helm.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
	echo "deb [signed-by=/usr/share/keyrings/helm.gpg] https://packages.buildkite.com/helm-linux/helm-debian/any/ any main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list > /dev/null
	curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.37/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
	sudo chmod 644 /etc/apt/keyrings/kubernetes-apt-keyring.gpg
	echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.37/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list > /dev/null
	sudo chmod 644 /etc/apt/sources.list.d/kubernetes.list
	sudo apt-get update
	sudo apt-get install -y make docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin helm kubectl
	@if ! command -v k3d >/dev/null 2>&1; then curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash; fi
	@if ! command -v uv >/dev/null 2>&1; then curl -LsSf https://astral.sh/uv/install.sh | sh; fi

# Install all development dependencies.
install:
	@umask 077; cp --update=none api/.env.sample api/.env
	cd api && uv sync --locked --extra dev
	cd sdk && uv sync --locked --group dev
	cd web && vp install --frozen-lockfile


# Reset local main to origin and remove branches absent from origin.
main:
	git fetch origin --prune
	git switch main
	git reset --hard origin/main
	@for branch in $$(git for-each-ref --format='%(refname:short)' refs/heads); do \
		if [ "$$branch" != main ] && ! git show-ref --verify --quiet "refs/remotes/origin/$$branch"; then git branch -D -- "$$branch"; fi; \
	done


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


# Create or reapply local resources in dependency order.
up:
	# Fail fast when storage.localhost does not resolve to loopback for the k3d port mapping.
	@getent ahosts storage.localhost | awk '$$1 !~ /^(127\..*|::1)$$/ {print "storage.localhost must resolve to loopback." > "/dev/stderr"; exit 1} END {if (NR == 0) {print "storage.localhost does not resolve." > "/dev/stderr"; exit 1}}'

	# Start supporting services and install the shared compute infrastructure.
	docker compose -f dev/compose.yml up --detach --wait mail
	@k3d cluster list compute >/dev/null 2>&1 || k3d cluster create --config dev/cluster.yaml
	@umask 077; k3d kubeconfig get compute > dev/kubeconfig.yaml
	helm --kubeconfig dev/kubeconfig.yaml upgrade --install longlink-compute k8s/chart --namespace longlink-system --create-namespace --values dev/values.yaml --wait=legacy --timeout 15m
	
	# Wait for the storage backend to pass its readiness probe before checking through the proxies.
	kubectl --kubeconfig dev/kubeconfig.yaml wait --for=condition=Ready pod --selector=app.kubernetes.io/name=rustfs --namespace rustfs --timeout=10m
	kubectl --kubeconfig dev/kubeconfig.yaml rollout status deployment/longlink-storage --namespace rustfs --timeout=5m
	install -d -m 700 dev/certificates
	kubectl --kubeconfig dev/kubeconfig.yaml --namespace knative-serving get secret longlink-gateway-tls --output jsonpath='{.data.tls\.crt}' | base64 --decode > dev/certificates/gateway.crt
	kubectl --kubeconfig dev/kubeconfig.yaml --namespace rustfs get secret longlink-storage-tls --output jsonpath='{.data.tls\.crt}' | base64 --decode > dev/certificates/storage.crt

	# Verify host TLS connectivity through the k3d port mappings.
	curl --fail --silent --show-error --retry 30 --retry-all-errors --retry-delay 2 --max-time 5 --cacert dev/certificates/gateway.crt --header 'Host: internalkourier' https://127.0.0.1:8443/ready
	curl --fail --silent --show-error --retry 30 --retry-all-errors --retry-delay 2 --max-time 5 --cacert dev/certificates/storage.crt --output /dev/null https://storage.localhost:9443/health/ready


# Build and push the local sample, preserving an existing development project.
image:
	cd web && vp run build:sdk:bundle --logLevel warn
	@if [ ! -d sdk/dev ]; then \
		cd sdk && uv run --locked longlink init --folder dev --name sample && \
		printf '\n\n[tool.uv.sources]\nlonglink = { path = "..", editable = true }\n' >> dev/pyproject.toml; \
	fi
	cd sdk/dev && uv run longlink build --registry localhost:15000 --push --tag dev


# Stop local services and remove generated cluster and API state.
down:
	@if k3d cluster list compute >/dev/null 2>&1; then k3d cluster delete compute; fi
	@k3d registry delete longlink-registry >/dev/null 2>&1 || :
	docker compose -f dev/compose.yml down --remove-orphans
	rm -f api/dev.db dev/kubeconfig.yaml
	rm -rf dev/certificates
	# Reap volumes orphaned by removed containers and superseded image layers.
	@docker volume ls -qf dangling=true | xargs -r docker volume rm
	docker image prune -f


# Prepare and run the local LongLink Platform API server.
api:
	@umask 077; cp --update=none api/.env.sample api/.env
	cd api && uv run --locked alembic upgrade head
	cd api && uv run --locked uvicorn main:app --host 127.0.0.1 --port 8000 --reload


# Run the Vite web app.
web:
	cd web && vp install --frozen-lockfile
	cd web && vp run dev --port 5173


# Run the local sample Solution, preserving an existing development project.
sdk:
	cd web && vp run build:sdk:bundle --logLevel warn
	@if [ ! -d sdk/dev ]; then \
		cd sdk && uv run --locked longlink init --folder dev --name sample && \
		printf '\n\n[tool.uv.sources]\nlonglink = { path = "..", editable = true }\n' >> dev/pyproject.toml; \
	fi
	cd sdk/dev && uv run longlink dev


# Seed the local example Organization and Solution after the Platform API starts.
seed: image
	@umask 077; cp --update=none api/.env.sample api/.env
	cd api && uv run --locked python ../dev/scripts/seed.py
