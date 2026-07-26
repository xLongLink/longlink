<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

# Platform

</div>

TODO: Introduction

<br />

## Resources

Managed resources can be connected to the platform.

- Compute as `KaaS` (Kubernetes as a Service)
- Database as `DBaaS` (Database as a Service)
- Storage as `STaaS` (Storage as a Service)

<br />

## Organizations

Each organization gets:
- A `namespace` in the compute
- A `table` in the database
- A `bucket` in the storage

<br />

## Applications

Each application is deployed using the organization resources
- A `pod` in the organization namespace
- A `schema` in the organization table
- A `folder` in the organization folder
  
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
