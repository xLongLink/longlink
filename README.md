# LongLink

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
