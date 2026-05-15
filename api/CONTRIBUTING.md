# Contributing in `api/`

Thanks for helping improve control plane.

## Architecture

```text
api/
├── src/
│   ├── __init__.py
│   ├── auth.py       # Auth helpers
│   ├── constants.py  # Shared constants
│   ├── env.py        # Environment config
│   ├── db/           # Database session, models, services
│   ├── models/       # Domain models
│   ├── pages/        # XML page definitions
│   ├── routes/       # API routes
│   ├── templates/    # Kubernetes and infra templates
│   └── utils/        # Shared helpers
├── main.py           # FastAPI entry
└── tests/            # Tests
```

## What this folder owns

API is control plane. Responsible for authentication, permissions, governance, orchestration.

## Keep changes aligned

- Define constrained values with shared Enums (for example `AppType`) instead of raw strings.
- Use Pydantic models (`BaseModel`) to validate external JSON (for example `metadata.json`).
- Use `model_validate()` (Pydantic v2) for parse + validation in one step.
- Let FastAPI typing handle request/query validation automatically (for example `AppType | None`).
- Centralize validation in schemas, not route handlers.
- Provide defaults at schema level (for example `type: AppType = AppType.tool`).
- Keep route handlers focused on orchestration.
- Normalize external input once at boundaries.
- Catch only meaningful exceptions and map to proper HTTP responses.
- Reuse schemas/enums across API, service, persistence layers.
- Remove outdated paths when introducing new model.

## Formatting

Before opening PR:

```bash
python -m isort .
```

## Development

```bash
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
