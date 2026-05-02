# Contributing Guidelines

SDK defines how applications are built on LongLink.

## Architecture

```bash
sdk/
├── longlink/           # Core SDK package
│   ├── .static/
│   │   └── web/       # Static file serving
│   ├── cli/            # CLI commands (init, build, migrate)
│   ├── context.py      # Application context
│   ├── database/       # DB connection, session, models
│   ├── pages/          # Page definitions
│   ├── routes/         # API routes
│   ├── storage/        # S3-compatible storage abstraction
│   ├── types/          # Shared types
│   ├── utils/          # Utilities
│   ├── app.py          # FastAPI app factory
│   ├── constants.py    # FastAPI app factory
│   └── context.py      # Request-scoped application context
│
└── tests/              # Unit tests
    ├── cli/            # CLI tests
    └── utils/          # Utils tests
```

## Keep changes aligned

- Keep SDK close to FastAPI ecosystem.
- Treat SDK as thin wrapper: remove boilerplate, enforce conventions; do not replace ecosystem defaults.
- Prefer native FastAPI, SQLModel/SQLAlchemy, Alembic, and Pydantic patterns.
- Keep abstractions explicit and easy to map to underlying tools.
- Keep storage interfaces provider-agnostic and normalized to S3-compatible semantics.
- Prefer simple, explicit APIs.
- Remove obsolete code when replacing behavior.
- Do not add tests right now (current project phase).

##

```
uv sync --extra dev
```
