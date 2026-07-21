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

## Docker Labels

The build command writes these labels into image metadata when values are available:

| Label                       | Value                          | Description                                          |
| --------------------------- | ------------------------------ | ---------------------------------------------------- |
| `longlink.name`             | `<app-name>`                   | Application name.                                    |
| `longlink.sdk`              | `<installed-longlink-version>` | Installed LongLink SDK version.                      |
| `longlink.version`          | `<app-pyproject-version>`      | Application version from `pyproject.toml`.           |
| `longlink.description`      | `<app-description>`            | Optional application description.                    |
| `longlink.environments`     | `<json-environment-list>`      | App environment variables when `src/envs.py` exists. |
| `longlink.title`            | `<app-title>`                  | Optional application title.                          |
| `longlink.summary`          | `<app-summary>`                | Optional short summary.                              |
| `longlink.terms_of_service` | `<terms-url>`                  | Optional terms-of-service URL.                       |
| `longlink.contact`          | `<contact-metadata>`           | Optional contact metadata.                           |
| `longlink.license_info`     | `<license-metadata>`           | Optional license metadata.                           |

## XML

- Is not html, but similar.
- Check with longlink docs <component>
- Keep `src/i18n/<lang>.json` as a flat Astryx catalog. Each dotted key maps to `{ "defaultMessage": "..." }` with an optional string `description`.
- Use ICU messages: `{name}` interpolates a value and `{count, plural, =0 {No items} one {# item} other {# items}}` handles plurals.
- Nested catalogs, bare string entries, `{{name}}` placeholders, and plural-map entries are not supported.
- Use `longlink translations generate` from an app root to refresh sorted keys in `src/i18n/en.json`. It preserves valid entries by exact key and creates missing entries with an empty `defaultMessage`.
- The SDK application serves translations at `/i18n/<lang>.json`.
