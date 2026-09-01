<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

Development tools
</div>

<br />

## k3d local cluster

`make up` creates the private `longlink-dev` Docker network, starts PostgreSQL and the OCI registry, creates the k3d
cluster, and builds the local sample Application image. Host-facing ports bind to loopback, while k3d reaches PostgreSQL
and the registry through the private bridge gateway. They are not exposed to the local network.

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
  --network longlink-dev \
  --api-port 127.0.0.1:8001 \
  -p "127.0.0.1:8443:443@loadbalancer" \
  --registry-config dev/registries.yml \
  --k3s-arg "--disable=traefik@server:0"
```

LongLink owns the local gateway LoadBalancer. The `8443` host mapping is available for manual HTTPS checks, while reconciliation records the Kubernetes-published endpoint for API proxy traffic.
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

To test Organization and Application database provisioning against a remote PostgreSQL server instead of the local
service, set its administrator URL in the same ignored file:

```bash
APPLICATION_DATABASE_URL=postgresql://admin:secret@db.example.com:5432/postgres?sslmode=verify-full
```

The local Compose PostgreSQL service intentionally uses `sslmode=disable`. Production managed PostgreSQL databases
must use `sslmode=verify-full`.

The configured role must be able to connect to the `postgres` maintenance database and create databases and roles.
The URL's database path is not persisted; LongLink provisions a separate database for each Organization. Do not run
`make clean` against a PostgreSQL server containing production LongLink data; it removes tracked databases and roles.

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

## Cleanup

Clean the compute, database, and storage resources configured in `api/.env.seed`:

```bash
make clean
```

LongLink resolves the pulled tag through the registry and deploys its immutable digest.
LongLink creates short-lived Exoscale buckets and scoped Application IAM credentials. Run `make clean` to remove those
resources before local Platform state is deleted. PostgreSQL remains local by default because it matches the production
PostgreSQL contract without provisioning a remote database.

<br/>
<br/>

---

<div align="center">
LongLink 2026

[License](./LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
