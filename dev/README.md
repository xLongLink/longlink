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
│   ├── Mailpit → SMTP localhost:1025, inbox localhost:8025
│   ├── Gateway connection → localhost:8443 → Kourier TLS
│   └── Storage connection → storage.localhost:9443 → RGW TLS
└── k3d Compute cluster
    ├── dev/setup.py → backing provisioner and storage certificate
    ├── dev/compute/connectivity → S3 Service and split DNS
    ├── k8s + dev overlays → Knative, CNPG, Rook, and Ceph
    └── Organizations and Solutions → provisioned by the Platform
```

## Start

Requirements: Linux AMD64, Docker, k3d, kubectl with Kustomize, OpenSSL, `flock`, uv,
and the repository's Vite+ tooling. The host must resolve `storage.localhost` to
loopback. systemd-resolved supplies this on the supported workstation; if your
resolver does not, configure `127.0.0.1 storage.localhost` in your host resolver.
The setup checks resolution and never edits system DNS configuration.

```bash
make install
make up
```

`make configure` fills missing settings in the ignored `api/.env` from
`api/.env.sample`, preserving existing values and credentials. It runs as part of
installation and API startup. The API itself always reads ordinary environment
variables and `.env`; no development mode is required.

`make up` creates the private Docker network, registry, mail capture service,
cluster, backing storage, TLS certificates, and shared Compute infrastructure.
It then starts endpoint connections and builds/pushes the local sample image.
Generated private material lives under ignored `dev/certificates/`.

Run in separate terminals:

```bash
make api
make web
```

After the API is ready:

```bash
make seed
```

Open the configured `PUBLIC_URL`, normally **http://localhost:5173**. Authentication
trusts that exact origin; change the setting if you prefer `127.0.0.1`.
Open **http://localhost:8025** to inspect actual verification/reset emails captured
by Mailpit. Local delivery follows the same SMTP code as production.

## Connectivity

Compose owns two long-lived `kubectl port-forward` processes. They bind only to
host loopback, use the generated kubeconfig read-only, restart when the selected
Pod disappears, and expose health checks. `make connect` starts or repairs them;
`make down` stops them before deleting the cluster.

The gateway origin is `https://localhost:8443`. The API uses an ordinary HTTPS
client; Kourier retains its restricted ingress policies. There is no permissive
development gateway NetworkPolicy or custom API transport.

The S3 origin is **`https://storage.localhost:9443`** for both the API and Solutions:

- On the host, the name resolves to loopback and reaches the dev-owned connection.
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

Optional `api/.env.seed` settings customize sample configuration. The default
storage topology is one 20 GiB OSD on `longlink-development`; database defaults are
one 10 GiB instance on `local-path`. These must match `dev/compute` overlays.
`make seed` supplies both public CA bundles and the local S3 origin explicitly.
For remote registration, use the normal cloud seed command with remote connection
configuration, rather than this local Make target.

Seeding an existing named Compute preserves its registration. Changing environment
variables does not rewrite its stored connection. Replacing a cluster requires a
new registration or an explicit local reset.

## Change or recover infrastructure

Stop API workers, update the package or local overlays, and run:

```bash
make compute
make api
make seed
```

`make compute` takes an exclusive `dev/compute.lock`; `make api` holds a shared lock
for its worker lifetime. Stop independently launched workers too. Application
restart revalidates infrastructure and reconciles tenant state without installing
operators. The sample is retained unless a failed deployment needs a retry.

An existing pre-change Compute registration still contains its old S3 endpoint.
It must be updated with workers stopped before using the new connection; seeding
does not overwrite it. For disposable local data, `make down`, `make up`, `make api`,
and `make seed` recreate the environment with the new defaults. `make down` deletes
local tenant data, so it is not an in-place migration procedure.

## Cleanup

With API workers stopped, delete registered tenant resources before discarding
Platform metadata:

```bash
uv --directory api run --locked python -m scripts.cleanup
```

Shared operators remain installed. `make down` removes the local cluster,
connections, certificates, kubeconfig, and Platform database. It preserves
`api/.env`, the Buildx cache, and `sdk/dev`, including local sample edits.
