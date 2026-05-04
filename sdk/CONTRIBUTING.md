# Contributing Guidelines

SDK defines how applications are built on LongLink.

## Architecture

```text
sdk/
├── longlink/           # Core SDK package
│   ├── __init__.py
│   ├── __main__.py     # Module entry point
│   ├── app.py          # FastAPI app factory
│   ├── constants.py    # Shared constants
│   ├── cli/            # CLI commands
│   ├── database/       # DB helpers and migrations
│   ├── routes/         # API routes
│   ├── storage/        # Storage abstraction
│   ├── types/          # Shared types
│   ├── utils/          # Helpers and settings
│   └── .static/        # Packaged assets and XML schema files
│       ├── web/        # Built frontend assets
│       └── xsd/        # XML schema definitions
└── tests/              # Unit tests
    ├── cli/            # CLI tests
    ├── utils/          # Utility tests
    └── xml/            # XML runtime and component tests
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

## Formatting

Before PR:

```bash
uv sync --extra dev
```
