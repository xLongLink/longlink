# Local development

The Platform API runs directly on the host with reload, using the same code and
network clients as hosted deployments. `dev/` owns the local infrastructure and
connectivity; the API never imports development tooling.

```text
Workstation
├── Host processes
│   ├── make api → normal API runtime + local reload
│   └── make web → Vite frontend
├── dev/compose.yml
│   ├── Registry → localhost:15000
│   └── Mailpit → SMTP localhost:1025, inbox localhost:8025
└── k3d Compute cluster
    ├── Loopback port mappings → localhost:8443 → Kourier, storage.localhost:9443 → RGW
    ├── dev/compute/bootstrap → shared boundaries and backing provisioner
    ├── dev/compute/connectivity → NodePort Services, gateway allowlist, and split DNS
    ├── k8s/setup.yaml.gotmpl → Helm releases for Knative, CNPG, Rook, and Ceph
    └── Organizations and Solutions → provisioned by the Platform
```

## Start

Requirements: Linux AMD64, Docker, k3d, kubectl, Helm **4.3.0**, Helmfile **1.8.0**,
standalone Kustomize **5.8.1**, OpenSSL, curl, uv, and the repository's Vite+
tooling. Helmfile uses the standalone `kustomize` binary to package the retained
manifests; chart repositories and pinned GitHub release assets must be reachable.
No Helm plugins are required. The host must resolve `storage.localhost` to
loopback. systemd-resolved supplies this on the supported workstation; if your
resolver does not, configure `127.0.0.1 storage.localhost` in your host resolver.
The setup checks resolution and never edits system DNS configuration.

```bash
make install
make up
```

Make copies `api/.env.sample` to the ignored `api/.env` only when that
file is absent, with owner-only permissions. Existing files are preserved exactly;
add newly required settings explicitly. Configuration initialization runs as part
of installation and API startup. The API itself always reads ordinary environment
variables and `.env`; no development mode is required.

`make up` creates the private Docker network, registry, mail capture service,
cluster, backing storage, TLS certificates, and shared Compute infrastructure.
It then checks gateway and storage HTTPS connectivity. Run it again to reapply
resources or retry an interrupted setup. `make down` removes those resources.
Cluster settings are declared in `dev/cluster.yaml`.
Generated private material, including the local kubeconfig, lives under ignored `dev/` paths.

`k8s/setup.yaml.gotmpl` owns the Kubernetes release order, chart versions, and
operator settings. Helm installs the upstream CNPG and Rook charts and packages
the retained Knative/Kourier Kustomizations. It waits for controller rollouts;
three explicit hooks check webhook certificates and Ceph readiness before the
release marker is published. The `development` environment selects the local
storage overlay and permits loop-backed OSDs.

`make image` and `make sdk` share `make sample`, which builds the SDK web bundle
and initializes `sdk/dev` only when absent. Existing sample edits are preserved.

Backing storage is declared in `dev/compute/backing/kustomization.yaml`. It uses
pinned upstream CSI manifests and local patches to select the attacher/provisioner
components and set their namespaces and RBAC subjects. Render it with
`kubectl kustomize dev/compute/backing`.

Setup uses OpenSSL and `dev/tls.cnf` to generate gateway and storage
certificates and apply their TLS Secrets. It reuses the local CA and valid matching
certificates, renewing leaves that expire within a day. The CA is generated only
when both CA files are absent; partial or expired CA state requires explicit
repair. Stop API workers before running `make up` or `make down`.

Run in separate terminals:

```bash
make api
make web
```

To provision the sample after the API is ready:

```bash
make image
make seed
```

Open the configured `PUBLIC_URL`, normally **http://localhost:5173**. Authentication
trusts that exact origin; change the setting if you prefer `127.0.0.1`.
Open **http://localhost:8025** to inspect actual verification/reset emails captured
by Mailpit. Local delivery follows the same SMTP code as production.

## Connectivity

The registry publishes `localhost:15000` for host image builds and API inspection.
The k3d container runtime uses the mirror in `dev/cluster.yaml` to reach that same registry
directly at `registry:5000` on the private `longlink-dev` Docker network. No Docker
gateway address or extra host port binding is needed.
Compose owns this network and waits for the registry health check before cluster
setup. Teardown stops Compose services, deletes the cluster, then removes Compose
services and their networks.

k3d publishes loopback ports through its load balancer to the local NodePort
Services: `8443` → gateway `30443`, and `9443` → storage `30943`. Kubernetes routes
to ready Pods as they are replaced. `make up` checks the gateway readiness route
and S3 HTTPS endpoint with the generated CA.

The gateway origin is `https://localhost:8443`. The API uses an ordinary HTTPS
client. The local gateway policy admits TLS traffic from the workstation-owned
`longlink-dev` Docker subnet, `172.30.0.0/24`, declared in `dev/compose.yml`.
`externalTrafficPolicy: Local` preserves Docker-side source addresses at the
Service boundary. Solution namespace
policies deny access to that private subnet and the gateway; their S3 access stays
explicitly scoped to RGW Pods. Changing the Docker subnet requires updating
`dev/compute/connectivity/gateway.yaml` with it.

The S3 origin is **`https://storage.localhost:9443`** for both the API and Solutions:

- On the host, the name resolves to loopback and reaches the k3d port mapping.
- In Kubernetes, CoreDNS rewrites the name to the local RGW Service, whose port
  9443 forwards to RGW's TLS port 443.
- The certificate covers `storage.localhost` and Rook's internal RGW service names.
- Normal clients preserve the same TLS identity and signed S3 authority in both
  locations. Solution traffic reaches RGW directly inside Kubernetes.

PostgreSQL retains its existing operation-scoped Kubernetes port-forwarding, which
is already identical in hosted and local deployments.

## Settings and registration

`api/.env` owns API runtime settings. Local defaults explicitly configure:

- Loopback `PUBLIC_URL`; cookie security follows its HTTP/HTTPS scheme.
- Mailpit SMTP host/port, STARTTLS disabled, and an explicit sender address.
- `IMAGE_REGISTRIES`, permitting public GHCR and the local registry. The production
  default permits only GHCR. Only administrator-configured origins can be queried.
- SQLite at `api/dev.db`; Organization data remains in CNPG PostgreSQL.

Existing SMTP settings are preserved. To select Mailpit, set `SMTP_HOST=127.0.0.1`,
`SMTP_PORT=1025`, `SMTP_USE_TLS=false`, and `SMTP_START_TLS=false`. Set optional
`SMTP_USERNAME` and `SMTP_PASSWORD` to `null` to clear previously configured
credentials. Hosted deployments use their own SMTP settings through the same code.

Optional `dev/.env.seed` settings customize sample configuration. The default
storage topology is one 1 GiB OSD and monitor on `longlink-development`; database defaults are
one 10 GiB instance on `local-path`. These must match `dev/compute` overlays.
`make seed` supplies both public CA bundles and the local S3 origin explicitly.

Seeding an existing named Compute preserves its registration. Changing environment
variables does not rewrite its stored connection. Replacing a cluster requires a
new registration or an explicit local reset.

## Change or recover infrastructure

Stop API workers, update the package or local overlays, and run:

```bash
make up
make api
make image
make seed
```

Stop independently launched workers too. Application
restart revalidates infrastructure and reconciles tenant state without installing
operators. The sample is retained unless a failed deployment needs a retry.

Existing kubectl-managed installations require an explicit migration to Helm
ownership; `make up` does not automatically adopt or replace them. For disposable
local data, stop workers and use `make down`, `make up`, `make api`, `make image`,
and `make seed`.
Hosted installations need a reviewed ownership migration; see `k8s/README.md`.

Settings in `dev/cluster.yaml`, including registry mirrors, are applied by k3d only
when creating the cluster. After changing them, stop workers and run `make down`,
`make up`, `make api`, `make image`, and `make seed` to recreate disposable local state.
`make down` deletes local tenant data; it is not an in-place migration procedure.

## Cleanup

With API workers stopped, delete registered tenant resources before discarding
Platform metadata:

```bash
uv --directory api run --locked python -m scripts.cleanup
```

Shared operators remain installed. `make down` removes the local cluster,
port mappings, certificates, kubeconfig, and Platform database. It preserves
`api/.env`, the Buildx cache, and `sdk/dev`, including local sample edits.
