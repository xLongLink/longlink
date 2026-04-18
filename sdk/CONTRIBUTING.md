# Contributing in `sdk/`

Thanks for contributing to the Python SDK.

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

## What this folder owns

The SDK defines how applications are built on LongLink.

## Keep changes aligned

- Keep the SDK opinionated and consistent.
- Prefer simple, explicit APIs.
- Remove obsolete code when replacing behavior.
- Do not add tests right now (project rule in current phase).

## Useful commands

Install SDK in editable mode:

```bash
pip install -e './sdk'
```

Format imports before PR:

```bash
python -m isort .
```
