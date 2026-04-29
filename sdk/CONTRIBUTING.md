## Architecture

```text
sdk/
├── longlink/           # Core SDK package
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

## What this folder owns

SDK defines how applications are built on LongLink.

## Keep changes aligned

- Keep SDK close to FastAPI ecosystem.
- Treat SDK as thin wrapper: remove boilerplate, enforce conventions; do not replace ecosystem defaults.
- Prefer native FastAPI, SQLModel/SQLAlchemy, Alembic, and Pydantic patterns.
- Keep abstractions explicit and easy to map to underlying tools.
- Keep storage interfaces provider-agnostic and normalized to S3-compatible semantics.
- Prefer simple, explicit APIs.
- Remove obsolete code when replacing behavior.
- Do not add tests right now (current project phase).

## Useful commands

Install SDK in editable mode:

```bash
pip install -e './sdk'
```

Format imports before PR:

```bash
python -m isort .
```
