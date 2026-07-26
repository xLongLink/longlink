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

Any job that is too long to run in a endpoint, is schedjused as `operation`:
- Each API replica runs a `lifespan` that claim and run 1 operation at the time.
- Designed to be stable across re-deployments, so that operations are not left uncompleted.

<br />

## Release 

- Release is trigged with `vX.Y.Z` and a container is created
- Alembic migrations run, then `setup.py` schedules release migration Operations:
  - One compute synchronization for every outdated compute.
  - One shared-schema synchronization for every Organization.
  - One shared-folder synchronization for every Organization bucket.
- Each API replica starts (`main.py`).
  - `FastAPI` manage user request.
  - `lifespan` claim and execute the operations.

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
