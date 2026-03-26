# LongLink

> [!WARNING]
> Early-stage architecture. Core components under active development.

LongLink is a multi-tenant operational runtime that enables organizations to build, deploy, and operate business applications within a unified, governed environment. It provides a centralized control plane that standardizes identity, permissions, storage, execution, and observability across all applications.

Instead of fragmented SaaS tools or custom-built systems, LongLink offers a structured platform where applications run in isolation but share consistent infrastructure and governance.

## Development

Install [uv](https://astral.sh/uv/) and create a virtual environment `uv venv`:

```bash
uv pip install -e './api[dev]' -e './sdk'
```

Run control plane:

```bash
uv run --project api python main.py
```

Run sample app:

```bash
uv run --project sdk python sample/main.py
```

### Frontend

```bash
bun --cwd=web install
bun --cwd=web dev
```

## Status
