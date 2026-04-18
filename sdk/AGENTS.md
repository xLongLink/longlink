# AGENTS.md

This folder contains the LongLink Python SDK.

## Architecture

```
sdk/
├── longlink/           # Core SDK (the package itself)
│   ├── app.py          # FastAPI app factory
│   ├── cli/            # CLI commands (init, build, migrate)
│   ├── context.py      # Application context
│   ├── database/       # DB connection, session, models
│   ├── pages/          # Page definitions
│   ├── routes/         # API routes
│   ├── static/         # Static file serving
│   ├── storage/        # S3-compatible storage abstraction
│   ├── types/          # Shared types
│   └── utils/          # Utilities
├── sample/             # Sample app demonstrating SDK usage
│   └── app/            # App implementation (models, routes, pages)
└── tests/              # Unit tests
    ├── cli/            # CLI tests
    └── utils/          # Utils tests
```

## How LongLink is Structured

LongLink is a unified platform with two main components:

1. **Control Plane** (`api/`) - Centralized governance layer handling:
   - User authentication and permissions
   - Application lifecycle management (provisioning, scaling, suspension)
   - External infrastructure orchestration (Kubernetes, S3, PostgreSQL/MySQL)
   - Secure proxy between frontend and backend services
   - Audit logging

2. **Applications SDK** (`sdk/`) - Enables building apps on the platform:
   - Python SDK with FastAPI, SQLModel, Alembic, Pydantic
   - XML-based declarative UI (renders to React components)
   - Standardized stack so developers focus on business logic

## SDK Direction

The SDK must stay close to the FastAPI ecosystem.
Treat SDK as thin wrapper that simplifies integration, not custom framework that replaces ecosystem defaults.

Core stack expectations:

- FastAPI for API behavior and routing
- SQLModel (SQLAlchemy-based) for DB models
- Alembic for DB migrations
- Pydantic and Pydantic Settings for data validation and app configuration
- S3-compatible storage with normalized behavior aligned to S3 specification

When implementing SDK features:

- prefer native FastAPI, SQLModel, Alembic, and Pydantic patterns
- add wrappers only to remove repetitive boilerplate or enforce platform conventions
- keep abstractions explicit and easy to map back to underlying ecosystem tools
- keep storage interfaces provider-agnostic by normalizing to S3-compatible semantics

## Local Development

Install SDK in development mode:

```bash
pip install -e './sdk'
```

## Tests

Run unit tests:

```bash
pytest tests
```

## Pre-Commit

Fix imports:

```bash
python -m isort .
```
