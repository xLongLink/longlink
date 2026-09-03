# Contributing Guidelines

The SDK provides the conventions and tooling used to build LongLink Solutions.

## Architecture

The combined repository architecture is maintained in `../AGENTS.md`.

## Keep changes aligned

- Keep SDK close to FastAPI ecosystem.
- Treat SDK as thin wrapper: remove boilerplate, enforce conventions; do not replace ecosystem defaults.
- Prefer native FastAPI, SQLModel/SQLAlchemy, Alembic, and Pydantic patterns.
- Keep abstractions explicit and easy to map to underlying tools.
- Keep storage interfaces provider-agnostic and normalized to S3-compatible semantics.
- Prefer simple, explicit APIs.
- Remove obsolete code when replacing behavior.

## Development

Before working locally:

```bash
uv sync --group dev    # Create the development environment
uv run ruff check --select I --fix .  # Format imports
uv run pytest --cov --cov-report=term-missing  # Run tests with branch coverage
```

## Docker Labels

The build command writes an OCI description label when available. It also writes this LongLink-specific label:

| Label                   | Value                     | Description                                      |
| ----------------------- | ------------------------- | ------------------------------------------------ |
| `longlink.environments` | `<json-environment-list>` | Environment variables declared by `src/envs.py`. |

## XML

- Is not html, but similar.
