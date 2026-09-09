<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

The Platform manages authentication, permissions, organizations, infrastructure resources, deployments, routing, and operational state while Solutions run independently as Python services built with the LongLink SDK.
</div>

<br />

## Resources

The Platform API supports PostgreSQL, MySQL, and SQLite as its production metadata database. Organization and Solution databases require PostgreSQL.

Published Platform and SDK-built Solution images target `linux/amd64`. Compute clusters must provide Linux AMD64 nodes for Solution runtimes and migration Jobs. Hosted Solution images currently must be publicly accessible on GHCR; private registry support is tracked separately.

Registry inspection uses anonymous GHCR tokens over HTTPS. Only config blobs may redirect once to the exact HTTPS host `pkg-containers.githubusercontent.com`, without credentials. No arbitrary registry hosts, authentication realms, or redirect destinations are accepted. In `DEVELOPMENT` only, `localhost:15000` is additionally allowed over HTTP without authentication. Metadata responses are limited to 1 MiB, requests to 5 seconds, and the whole inspection to 20 seconds. OCI indexes and Docker manifest lists select the `linux/amd64` child and pin that child's digest.

Managed resources are connected to the platform:

- Compute: `KaaS` (Kubernetes as a Service) using `kubeconfig.yaml`. LongLink installs and upgrades Envoy Gateway from the pinned release bundled with the Platform API.
- Database: `DBaaS` (Database as a Service) using `admin credentials`.
- Storage: `STaaS` (Storage as a Service) using `provider API key`.

Compute and Database works independently of the provider, the storage need a adapter layer since the IAM is unique for each datacenter

The Compute kubeconfig must allow LongLink to create namespaces, custom resource definitions, and cluster-scoped resources. LongLink owns the Envoy Gateway installation, shared `Gateway`, mTLS policy, and Solution `HTTPRoute` resources. Platform releases reconcile every registered Compute to their tested Envoy Gateway version; LongLink never follows an unpinned latest version.

<br />

## Organizations

Each organization is created with:

- A `namespace` in the compute.
- A `table` in the database, with a `shared` schema.
- A `bucket` in the storage, with a `shared` folder.

Resource limits are managed at the `namespace`, `table` and `bucket` level.

<br />

## Solutions

Maintainers can click the Solution's **Check for updates** button in Organization Settings, then **Update** to review and deploy updates from the tracked source. Manual deployment from a new image source is available only through the API.

- Each immutable Revision stores the submitted tag or digest as `source`, the resolved runtime digest as `image`, image metadata, and an encrypted environment snapshot. A digest source has no moving channel; checking it normally reports no update.
- `POST /api/v1/organizations/{id}/solutions` takes a complete `envs` dictionary. `PUT /api/v1/solutions/{id}` deploys a new submitted `image` source and accepts an environment patch.
- `GET /api/v1/solutions/{id}/update` inspects the desired revision's source and returns candidate metadata, its resolved image, availability relative to the desired image, the revision ID, and configured environment names only.
- `POST /api/v1/solutions/{id}/update` accepts `{"envs": {"KEY": "replacement", "OLD_KEY": null}}`. It resolves the desired source again, creates a revision only when the digest changed, and returns 409 without changes when already up to date. The candidate shown during review is not a deployment guarantee: a tag can move before submission. For an exact release, submit a digest through the manual deployment API.
- Update patches preserve omitted keys from the desired revision, replace supplied strings (including empty strings), and remove explicit nulls. The merged snapshot must satisfy size limits, reserved `LONGLINK_` ownership, and the newly resolved image's required variables. Values are never returned, including in request validation errors.
- Registry inspection runs outside command locks. Commands revalidate maintenance access and the desired revision under serialization before merging; concurrent source changes return 409 for a fresh review. Update bodies also accept `expected_revision_id` to reject changes since a previous review; the Web dialog always sends it. Configured names and release history require maintenance access too.
- Organization Solution summaries expose `deployment_pending`, including the queued period before a worker starts, so the UI continues polling until deployment completes or fails.

LongLink deploys each Solution using the organization resources:

- A `pod` in the organization namespace
- A `schema` in the organization database
- A `folder` in the organization bucket

The runtime receives:

- Read permission from the `shared` schema
- Read and write permission from the Solution schema
- Read permission from the `shared` folder
- Read and write permission from the Solution folder

<br />

## Operations

Work that is too long for an API request is queued as a durable, typed Operation:

- `compute.create` creates or recreates one authenticated Envoy Gateway. It never deploys, routes, deletes, or repairs Organization or Solution resources.
- `organization.create` and `organization.delete` own one Organization's provider resources, shared audit records, and Kubernetes Namespace lifecycle.
- `solution.deploy` targets an immutable revision; `solution.delete` targets a Solution. They own provider resources, Kubernetes workloads, Services, and `HTTPRoute` lifecycle. The explicit rollback API queues `solution.deploy` for a previously successful revision.
- Deployment runs migrations only for revisions that have never deployed successfully. A failed new revision is marked failed and durably queues the last successful revision; failure restoring a proven revision does not mark it failed or recursively queue recovery.
- Outdated queued deployments do nothing. Desired state selects the target, falling back to the last deployed revision when desired has failed. An already active rollout may publish its actual result, but never changes desired state.
- Each API replica claims and executes one Operation at a time. Expiring worker locks and bounded retries recover work across Platform redeployments.
- Lifecycle retries reuse persisted state and reapply the desired state after a Solution or Organization reaches `running`.

<br />

## Deployment Reconciliation

- Stop existing API replicas before deployment, run Alembic migrations, then `python -m src.release` once before new API replicas start. The release command rejects live leases; interrupted leases must be released or expire first. This prevents old workers from consuming reconciliation intended for new provider templates or SDK migrations. It schedules desired-state reconciliation Operations:
    - One `compute.create` for every Compute.
    - One create or delete operation for every Organization according to its tombstone.
    - One deploy or delete operation for every Solution in an active Organization according to its tombstone and effective desired revision.
- Repeated scheduling coalesces visible unfinished work, including leased attempts. Concurrent requests may queue duplicates, so lifecycle handlers must tolerate repeated reconciliation. Completion rechecks Solution desired state so requests coalesced with an active attempt are not lost.
- Each API replica starts (`main.py`).
    - `FastAPI` manage user request.
    - `lifespan` claims and executes Operations.

<br />

## Development

<br />

```
make api    # In one terminal
make seed   # In another terminal after the API starts
```

Run from `api/`:

```bash
uv sync --extra dev
uv run alembic upgrade head
uv run python -m src.release             # Schedule deployment reconciliation once
DEVELOPMENT=true uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload
# In another terminal:
DEVELOPMENT=true uv run python -m scripts.seed  # Local infrastructure and example data
```

The local seed inspects `localhost:15000/sample:dev` through the same metadata resolver as the API. If your sample image declares required variables, set `SAMPLE_ENVS` to a JSON string dictionary in `.env.seed`; missing requirements fail rather than silently bypassing release validation.

<br />
<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
