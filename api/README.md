<div align="center">

<img src="https://www.longlink.dev/logo.svg" alt="LongLink logo" />

The LongLink Platform API manages authentication, organizations, infrastructure, and Solution deployments.
</div>

## Requirements

- PostgreSQL, MySQL, or SQLite for Platform metadata. Organization and Solution data requires PostgreSQL.
- A Kubernetes Compute with Linux AMD64 nodes for Solution runtimes and migration Jobs.
- Publicly accessible `linux/amd64` Solution images on GHCR.

See the [Compute package guide](../k8s/README.md) for Compute installation.

## Development

Prepare local infrastructure from the repository root:

```bash
make up
```

Run the API from `api/`:

```bash
uv sync --extra dev
uv run alembic upgrade head
uv run python -m src.release
uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

See [`dev/README.md`](../dev/README.md) for local infrastructure and sample provisioning.

The API reads configuration from `.env` and process environment variables. SMTP is required; local setup supplies Mailpit.

## Links

[License](../LICENSE) · [Code of Conduct](../CODE_OF_CONDUCT.md) · [Contact](mailto:info@longlink.dev)
