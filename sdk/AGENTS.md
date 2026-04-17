# AGENTS.md

This folder contains the LongLink Python SDK.

## Architecture

```
sdk/
├── longlink/         # Core SDK code
├── sample/           # Sample applications
└── tests/            # Unit tests
```

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
