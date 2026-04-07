<div align="center">

# LongLink

[![PyPI version](https://img.shields.io/pypi/v/longlink)](https://pypi.org/project/longlink/)
[![Python versions](https://img.shields.io/pypi/pyversions/longlink)](https://pypi.org/project/longlink/)

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://docs.longlink.dev) &nbsp; - &nbsp; [TODO]()

</div>

> [!WARNING]
> Early-stage architecture. Core components under active development.

LongLink is a multi-tenant operational runtime that enables organizations to build, deploy, and operate business applications within a unified, governed environment. It provides a centralized control plane that standardizes identity, permissions, storage, execution, and observability across all applications.

Instead of fragmented SaaS tools or custom-built systems, LongLink offers a structured platform where applications run in isolation but share consistent infrastructure and governance.

## Development

Create and activate a virtual environment with standard Python tooling:

```bash
python -m venv .venv
source .venv/bin/activate # or .venv\Scripts\activate on Windows
pip install -e './api[dev]' -e './sdk'
```

Run control plane:

```bash
cd api
python main.py
```

Run sample app:

```bash
cd sdk/sample
longlink dev
```

```bash
cd web
bun install
bun run sdk
bun run api
```

## Local Infrastructure Setup

Use the root `Makefile` (which runs `dev/compose.yml`) to start and stop local infrastructure services:

```bash
make up
```

This command:

- starts Docker Compose services in detached mode
- creates the `compute` k3d cluster with a local registry `compute-registry` exposed at `0.0.0.0:5000` (and ignores the error if it already exists)

To stop services and remove the cluster:

```bash
make down
```

## Git Hooks (Lefthook)

Install Lefthook and enable repository hooks:

```bash
pip install lefthook
LEFTHOOK_CONFIG=dev/lefthook.yml lefthook install
```

Once installed, every commit runs:

- Python import formatting in `api/` and `sdk/` with `python -m isort .`
- Frontend formatting in `web/` with `bun run format`
