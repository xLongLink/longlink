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

The local setup generates a development CA and a certificate for `localhost`, creates the Kourier TLS Secret and a local-only ingress policy for the host's Docker bridge address, and registers `https://localhost:8443`. Generated private material stays under the ignored `dev/certificates` directory and is removed by `make down`. LongLink does not generate gateway identities or certificates outside this local development workflow.
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

Configure the Exoscale provisioning identity and select the development SOS zone in `api/.env.seed`:

```bash
EXOSCALE_API_KEY=EXO...
EXOSCALE_API_SECRET=replace-with-the-api-secret
EXOSCALE_STORAGE_ENDPOINT_URL=https://sos-ch-gva-2.exo.io
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

The host-run API uses authenticated Kubernetes port-forwarding for organization database
connections in development mode. Tunnels bind to loopback on automatically assigned ports
and close with each operation's Kubernetes client. PostgreSQL still verifies the CNPG CA
and cluster DNS hostname; no host DNS changes, database port exposure, or VPN is needed.
Solutions and migration Jobs inside Kubernetes connect directly to the database Service.
The loopback connection override is isolated in `api/src/development/postgres.py`, loaded
only when `DEVELOPMENT=true`; the SQL provisioning utility in `api/src/utils/postgres.py`
has no transport-address override.

`make seed` queues provisioning; watch Operations until compute creation, organization
creation, and sample deployment finish. Exoscale credentials above are required even for
local development because object storage is provisioned remotely.
After correcting a setup failure, restart `make api` to reconcile infrastructure and run
`make seed` again to retry a failed sample with a new revision. Successful samples are preserved.

## Cleanup

Clean the compute, database, and storage resources configured in `api/.env.seed`:

```bash
make clean
```

LongLink resolves the pulled tag through the registry and deploys its immutable digest.
LongLink creates short-lived Exoscale buckets and scoped Solution IAM credentials. Run `make clean` to remove those
resources before local Platform state is deleted. Cleanup deletes Organization namespaces, including CNPG clusters,
Secrets and PVCs, and verifies namespace termination before clearing Platform records. Shared Knative, Kourier and
CNPG controllers remain installed. StorageClasses with a `Retain` reclaim policy can leave persistent volumes behind;
review those volumes separately before removing the cluster.

<br/>
<br/>

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
