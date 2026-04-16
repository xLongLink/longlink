## AGENTS.md

You are working on the backend (`api`).
Is a FastAPI application that handles authentication, permissions, and routing to various modules.

## Architecture

```
api/
├── src/
│   ├── apps/         # Application models
│   ├── db/          # Database models and services
│   ├── middleware/  # Middleware
│   ├── models/      # Pydantic models
│   ├── routes/      # API routes
│   └── utils/       # Utilities
├── alembic/       # Database migrations
├── tests/        # Tests
├── main.py       # FastAPI entry
└── pages/      # Static pages for the control plane UI
```

- Define constrained values with a shared Enum (e.g., AppType) instead of raw strings.
- Use Pydantic models (BaseModel) to validate any external JSON (like metadata.json).
- Rely on model_validate() (Pydantic v2) for parsing and validation in one step.
- Let FastAPI handle request/query validation automatically via typing (e.g., AppType | None).
- Centralize validation logic in schemas, not inside route handlers.
- Provide defaults at schema level (type: AppType = AppType.tool).
- Keep route handlers focused on orchestration, not validation logic.
- Normalize inputs (e.g., URLs, IDs) once at the boundary of the system.
- Catch only meaningful exceptions and translate them into appropriate HTTP responses.
- Reuse schemas and enums across API, service, and persistence layers.

## Pre-Commit

Fix imports with `isort`:

```
python -m isort .
```
