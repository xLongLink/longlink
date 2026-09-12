<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

Development tools
</div>

<br />

## k3d local cluster

Solution runtimes and migration Jobs require Linux AMD64 nodes. An ARM-only k3d cluster cannot schedule them, even when Docker can build AMD64 images through emulation.

`make up` creates the private `longlink-dev` Docker network, starts the OCI registry, creates the k3d cluster,
and builds the local sample Solution image. The Platform API defaults to SQLite in `api/dev.db`.
Organization and Solution data live in Kubernetes-managed CloudNativePG databases. k3d reaches the registry
through the private bridge gateway; its host-facing port binds only to loopback.

```bash
make up
```

If a `compute` cluster predates the isolated network, run `make down` before `make up` so k3d can recreate it safely.

The equivalent manual setup is:

```bash
docker network inspect longlink-dev >/dev/null 2>&1 || docker network create longlink-dev
gateway=$(docker network inspect longlink-dev --format '{{(index .IPAM.Config 0).Gateway}}')
LONGLINK_DEV_GATEWAY="$gateway" docker compose -f dev/compose.yml up --detach --wait
k3d cluster create compute \
  --image rancher/k3s:v1.34.3-k3s1@sha256:c63773f3549c09ac5f79f57ae3b057118e7de394b3ae84cd9faf68a1be872ae5 \
  --network longlink-dev \
  --api-port 127.0.0.1:8001 \
  -p "127.0.0.1:8443:443@loadbalancer" \
  --registry-config dev/registries.yml \
  --k3s-arg "--disable=traefik@server:0"
```

The local setup generates a development CA and a certificate for `localhost`, creates the Kourier TLS Secret and a development-only policy that permits ingress to the gateway's TCP port `8444`, and registers `https://localhost:8443`. The broad local ingress exception is required because ServiceLB/NAT does not preserve stable source identity. Generated private material stays under the ignored `dev/certificates` directory and is removed by `make down`. LongLink does not generate gateway identities or certificates outside this local development workflow.
Use `localhost:15000/<image>:<tag>` for images pushed to the local registry.

Export the kubeconfig afterward:

```bash
umask 077
k3d kubeconfig get compute > api/kubeconfig.yaml
```

## Seed setup

Create the ignored seed configuration from the tracked sample:

```bash
cp api/.env.seed.sample api/.env.seed
```

Configure the Kubernetes object-storage backend in `api/.env.seed`:

```bash
STORAGE_CLASS=longlink-development
STORAGE_ENDPOINT=https://rook-ceph-rgw-longlink.rook-ceph.svc:443
STORAGE_SIZE_GIB=20
STORAGE_INSTANCES=1
```

Local development defaults to `https://localhost:8443`, the k3d `local-path`
StorageClass, a 10 GiB volume, and one PostgreSQL instance. Override them in the
same ignored file when your cluster differs:

```bash
GATEWAY_URL=https://localhost:8443
DATABASE_STORAGE_CLASS=local-path
DATABASE_SIZE_GIB=10
DATABASE_INSTANCES=1
```

These storage settings are development defaults; no `STORAGE_CLASS` entry is
required for local seeding. `make up` and `make seed` prepare the pinned CSI
hostpath driver, the `longlink-development` StorageClass, and storage TLS using
the local CA. The class supports filesystem monitor PVCs and loop-backed Block
OSD PVCs. k3d nodes mount `/dev` and `/run/udev` for those development devices.
An older cluster without these mounts needs a one-time `make down` / `make up`,
which resets local Platform/sample data. Production still requires an explicitly
chosen durable backing class; the development CSI driver is never installed by
production reconciliation.

For a non-default private gateway CA, set `GATEWAY_CERTIFICATE` to its PEM trust bundle, quoted with multiline dotenv syntax.
Do not supply a private key. Omit it for system-trusted certificates. `make seed` automatically supplies the generated
local CA. The gateway origin must be reachable from the API. A local cluster needs a working `local-path`
StorageClass; production clusters should use durable provisioned storage. Seed accepts no external tenant database URL.

`make seed` selects its compute from `KUBECONFIG`. Without it, seed uses `api/kubeconfig.yaml` created by `make up`.
To test against a remote Kubernetes cluster, set the path in `api/.env.seed`:

```bash
KUBECONFIG=../kubeconfig.yml
```

Start the Platform API first so its lifespan creates the configured administrator. In a separate terminal, run migrations
and seed local or remote compute data:

```bash
make api
```

```bash
make seed
```

The host-run API uses authenticated Kubernetes port-forwarding for PostgreSQL,
Kourier, and S3. Tunnels bind to loopback on automatically assigned ports and
close with their operation or streamed response. TLS still verifies the original
hostname and CA; Kourier retains the Knative routing Host header, and S3 retains
its signed endpoint authority. No permissive development gateway NetworkPolicy,
public database/storage port, host DNS changes, or VPN is required.
The transport overrides live under `api/src/development/` and are selected only
when `DEVELOPMENT=true`. Solutions and migration Jobs connect directly to their
in-cluster services.

`make seed` queues provisioning; watch Operations until compute creation, organization
creation, and sample deployment finish. Storage is provisioned in the registered
compute; no external object-storage account or provider API keys are required.
After correcting a setup failure, restart `make api` to reconcile infrastructure and run
`make seed` again to retry a failed sample with a new revision. Successful samples are preserved.

## Cleanup

Clean the compute, database, and storage resources configured in `api/.env.seed`:

```bash
DEVELOPMENT=true uv --directory api run --locked python -m scripts.cleanup
```

LongLink resolves the pulled tag through the registry and deploys its immutable digest.
LongLink creates organization bucket claims and scoped Ceph Solution identities. Stop API workers and run the cleanup command to remove those
resources before local Platform state is deleted. Cleanup deletes Organization namespaces, including CNPG clusters,
Secrets and PVCs, and verifies namespace termination before clearing Platform records. Shared Knative, Kourier and
CNPG controllers remain installed. StorageClasses with a `Retain` reclaim policy can leave persistent volumes behind;
review those volumes separately before removing the cluster.

`make down` then removes the local cluster, certificates, kubeconfig, and Platform database. It preserves Compose volumes,
the Buildx cache, and `sdk/dev` so subsequent development starts faster and local sample edits are not discarded.

<br/>
<br/>

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
