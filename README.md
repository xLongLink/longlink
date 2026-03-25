# LongLink

LongLink is a multi-tenant operational runtime that enables organizations to build, deploy, and operate business applications within a unified, governed environment. It provides a centralized control plane that standardizes identity, permissions, storage, execution, and observability across all applications.

Instead of fragmented SaaS tools or custom-built systems, LongLink offers a structured platform where applications run in isolation but share consistent infrastructure and governance.

## Project Structure

```
longlink/
│
├── api/        # Control plane (FastAPI)
├── sdk/        # Python SDK for app development
├── web/        # Frontend (server-driven UI renderer)
```

## Getting Started

Install [uv](https://astral.sh/uv/) and [vp](https://viteplus.dev/):

### Backend

```bash
uv venv
source .venv/bin/activate
uv pip install -e './api[dev]'
uv pip install -e './sdk'
```

Run control plane:

```bash
uv run --project api python main.py
```

Run sample app:

```bash
uv run --project sdk python sample/main.py
```

---

### Frontend

```bash
bun --cwd=web install
bun --cwd=web dev
```

## Setup in codex

Container Caching: `On`, Setup script `Manual`:

```
curl -LsSf https://astral.sh/uv/install.sh | sh
curl -fsSL https://vite.plus | bash
```

## Status

Early-stage architecture. Core components under active development.

## License

[TODO]
