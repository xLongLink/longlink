# Contributing Guidelines

SDK defines how applications are built on LongLink.

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
- Do not add tests right now (current project phase).

## Development

Before working locally:

```bash
uv sync --extra dev    # Create the development environment
uv run isort .         # Format imports
uv run pytest tests    # Run tests
```

## XML

- Is not html, but similar.
- Check with longlink docs <component>
- Use `longlink translations generate` from an app root to refresh `src/i18n/en.json` from XML `i18n` keys.
- The SDK application serves translations at `/i18n/<lang>.json`.
