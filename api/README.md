<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

# Platform

</div>

The LongLink Platform manages authentication, permissions, organizations, infrastructure resources, deployments, routing, and operational state while Applications run independently as Python services built with the LongLink SDK.

<br />

## Resources

Managed resources are connected to the platform:

- Compute: `KaaS` (Kubernetes as a Service) using `kubeconfig.yaml`.
- Database: `DBaaS` (Database as a Service) using `admin credentials`.
- Storage: `STaaS` (Storage as a Service) using `provider API key`.

Compute and Database works independently of the provider, the storage need a adapter layer since the IAM is unique for each datacenter

<br />

## Organizations

Each organization is created with:

- A `namespace` in the compute.
- A `table` in the database, with a `shared` schema.
- A `bucket` in the storage, with a `shared` folder.

Resouce limits are manages at the `namespace`, `table` and `bucket` level.

<br />

## Applications

Each application is deployed using the organization resources:

- A `pod` in the organization namespace
- A `schema` in the organization database
- A `folder` in the organization bucket

Each application has:

- Read permission from the `shared` schema
- Read and write permission from the application schema
- Read permission from the `shared` folder
- Read and write permission from the application folder

<br />

## Operations

Work that is too long for an API request is queued as a durable, typed Operation:

- `compute` reconciles only cluster-bootstrap and gateway resources, including routes for running Applications. It never deploys, deletes, or repairs Organization or Application resources.
- `organization.create` and `organization.delete` own one Organization's provider resources and Kubernetes Namespace lifecycle.
- `application.create` and `application.delete` own one Application's provider resources and Kubernetes workload lifecycle.
- `organization.reconcile` and `storage` synchronize shared Organization state during releases and membership changes.
- Each API replica claims and executes one Operation at a time. Expiring worker locks and bounded retries recover work across Platform redeployments.
- Lifecycle retries reuse persisted state and skip deployment after an Application or Organization reaches `running`.

<br />

## Release 

- Release is trigged with `vX.Y.Z` and a container is created
- Alembic migrations run, then `setup.py` schedules release migration Operations:
  - One gateway and cluster-bootstrap synchronization for every outdated compute.
  - One shared-schema synchronization for every Organization.
  - One shared-folder synchronization for every Organization bucket.
- Each API replica starts (`main.py`).
  - `FastAPI` manage user request.
  - `lifespan` claims and executes Operations.

<br />


## Development

<br />

```
make seed
make api
```


Run from `api/`:

```bash
uv sync --extra dev
uv run alembic upgrade head
uv run python setup.py
uv run python seed.py
DEVELOPMENT=true uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```


<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
