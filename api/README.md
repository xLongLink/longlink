<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

The Platform manages authentication, permissions, organizations, infrastructure resources, deployments, routing, and operational state while Solutions run independently as Python services built with the LongLink SDK.
</div>

<br />

## Resources

Managed resources are connected to the platform:

- Compute: `KaaS` (Kubernetes as a Service) using `kubeconfig.yaml`. LongLink installs Envoy Gateway v1.8 from its checksummed upstream manifest when it registers the Compute.
- Database: `DBaaS` (Database as a Service) using `admin credentials`.
- Storage: `STaaS` (Storage as a Service) using `provider API key`.

Compute and Database works independently of the provider, the storage need a adapter layer since the IAM is unique for each datacenter

The Compute kubeconfig must allow LongLink to create namespaces, custom resource definitions, and cluster-scoped resources. LongLink then installs Envoy Gateway and owns the shared `Gateway`, API-key policy, and Solution `HTTPRoute` resources.

<br />

## Organizations

Each organization is created with:

- A `namespace` in the compute.
- A `table` in the database, with a `shared` schema.
- A `bucket` in the storage, with a `shared` folder.

Resource limits are managed at the `namespace`, `table` and `bucket` level.

<br />

## Solutions

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
- `solution.create` and `solution.delete` own one Solution's provider resources, Kubernetes workload, Service, and `HTTPRoute` lifecycle.
- Each API replica claims and executes one Operation at a time. Expiring worker locks and bounded retries recover work across Platform redeployments.
- Lifecycle retries reuse persisted state and reapply the desired state after a Solution or Organization reaches `running`.

<br />

## Deployment Reconciliation

- Every deployment runs Alembic migrations, then `python -m src.release` once before API replicas start. It schedules desired-state reconciliation Operations:
    - One `compute.create` for every Compute.
    - One create or delete operation for every Organization according to its tombstone.
    - One create or delete operation for every Solution in an active Organization according to its tombstone.
- Repeated scheduling coalesces unleased work and creates one successor for active work, so deployment reconciliation safely converges resources after code or infrastructure changes.
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

<br />
<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
