# Contributing in `api/`

The Platform API owns authentication, permissions, governance, and orchestration.

Start local infrastructure from the repository root, then run from `api/`:

```bash
uv sync --extra dev
uv run alembic upgrade head
uv run python -m src.release
uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload
uv run ruff check .
uv run pytest --cov=main --cov=src --cov-report=term-missing
```

Before an API rollout, run `alembic upgrade head` and `python -m src.release` once
before starting replicas.

## API rules

- Validate external input with Pydantic schemas.
- Use Enums for constrained values and roles.
- Keep routes focused on orchestration.
- Declare FastAPI `response_model` values.
- Return safe, specific HTTP errors.
- Test observable behavior, authentication, and authorization separately.

Kubernetes package tests need kubectl, Helm, Helmfile, Kustomize, chart repository
access, and GitHub access; they do not need a cluster.
