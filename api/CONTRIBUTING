# Contributing in `api/`

Thanks for helping improve the control plane.

## What this folder owns

The API is the control plane. It is responsible for authentication, permissions, governance, and orchestration.

## Keep changes aligned

- Keep validation in Pydantic schemas.
- Use shared enums for constrained values.
- Let FastAPI typing handle request/query validation.
- Keep route handlers focused on orchestration.
- Normalize external input at boundaries.
- Translate meaningful exceptions into proper HTTP responses.

## Practical rules

- Reuse schemas/enums across layers when possible.
- Avoid embedding validation logic directly in route handlers.
- Remove outdated paths when introducing the new model.

## Formatting

Before opening a PR:

```bash
python -m isort .
```
