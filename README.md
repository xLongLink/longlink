# LongLink

**An Operational Infrastructure for Business Applications**

LongLink is a multi-tenant operational runtime that enables organizations to build, deploy, and operate business applications within a unified, governed environment. It provides a centralized control plane that standardizes identity, permissions, storage, execution, and observability across all applications.

Instead of fragmented SaaS tools or custom-built systems, LongLink offers a structured platform where applications run in isolation but share consistent infrastructure and governance.

## Core Concepts

### Control Plane

The control plane is the authoritative layer responsible for:

- Authentication and identity federation
- Role-Based Access Control (RBAC)
- Audit logging and compliance
- Application lifecycle management
- Workflow orchestration
- Storage and execution policies

All applications operate through this layer. No application bypasses it.

### Application Runtime

Each application:

- Runs in an isolated container
- Has its own database (PostgreSQL or compatible)
- Has its own storage namespace (S3-compatible)
- Inherits identity, permissions, and configuration from the control plane

Applications do **not** implement authentication, permissions, or infrastructure logic.

### SDK (Python)

Applications are built using the LongLink Python SDK, which provides:

- Data modeling (SQLAlchemy-based)
- Migrations (via CLI)
- Storage abstraction (fsspec-based)
- API definition through Python functions
- Server-driven UI components

### Actions (Core Abstraction)

Actions are the primary unit of logic:

- Defined as Python functions
- Automatically exposed as:
    - UI components
    - API endpoints
    - SDK methods

This ensures:

- No duplication
- Consistent interfaces
- Immediate programmability

### Server-Driven UI

- UI is defined server-side
- Backend returns structured JSON
- Frontend renders deterministically
- No client-side business logic

## Architecture Overview

```
User → Identity Provider → LongLink Control Plane → Application
```

### Components

- **Control Plane (`/api`)**
    - Governance, authentication, permissions
    - Workflow engine
    - Application lifecycle

- **SDK (`/sdk`)**
    - Application development framework
    - Data models, actions, UI definitions

- **Web (`/web`)**
    - Frontend renderer for server-driven UI
    - Organization interface

## Project Structure

```
longlink/
│
├── api/        # Control plane (FastAPI)
├── sdk/        # Python SDK for app development
├── web/        # Frontend (server-driven UI renderer)
│
├── README.md
├── CONTRIBUTING.md
├── AGENTS.md
```

## Getting Started

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e './api[dev]'
pip install -e sdk
```

Run control plane:

```bash
cd api
python main.py
```

Run sample app:

```bash
python sdk/sample/main.py
```

---

### Frontend

```bash
bun --cwd=web install
bun --cwd=web dev
```

## Philosophy

LongLink enforces a strict separation:

| Concern        | Owned By Platform | Owned By App |
| -------------- | ----------------- | ------------ |
| Authentication | ✅                | ❌           |
| Permissions    | ✅                | ❌           |
| Storage        | ✅                | ❌           |
| Compute        | ✅                | ❌           |
| Business Logic | ❌                | ✅           |

Applications focus purely on domain logic.

## Why LongLink?

- Eliminates SaaS fragmentation
- Removes duplicated infrastructure logic
- Enables composable internal tools
- Provides built-in governance and compliance
- Makes applications inherently programmable and AI-compatible

## Status

Early-stage architecture. Core components under active development.

## License

[TODO]
