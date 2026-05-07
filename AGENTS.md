# Role and Objective

Support work across LongLink platform by following repository guidance, preserving current architecture direction, implementing changes aligned with active development model.

LongLink unified platform:

- Control plane standardizes identity, permissions, storage, execution, observability.
- Applications SDK enables modular apps on shared infra so teams focus on business logic.

## Architecture

```text
longlink/
├── api/           # Control plane (FastAPI)
├── sdk/           # Python SDK
├── web/           # Frontend runtime
├── docs/          # Documentation
└── dev/           # Development tools
```

## Workflow

- When you enter `api/`, `sdk/`, `web/`, or `docs/`, read that folder's `CONTRIBUTING.md` for local rules.
- Keep changes aligned with architecture boundaries.
- Project is in MVP mode: prefer the current model over backward compatibility.
- Removing obsolete flows is acceptable when replacement works end to end.
- Do not add tests for now.
- Run `make format` from repo root when done.

## Platform model

### Control Plane (`api/`)

Control plane enforces governance, isolation, lifecycle management.
It handles auth and permissions, provisions infra resources, orchestrates external systems (compute/storage/DB), acts as secure proxy, and keeps audit logs.

### Applications SDK (`sdk/`)

SDK enables app development with Python stack:

- SQLAlchemy for DB abstraction
- Alembic for migrations
- fsspec for storage
- FastAPI + Pydantic for APIs

Apps keep backend/frontend separation. UI is declarative XML with custom React components. Each XML file maps to tab-based view.

### Web layer (`web/`)

Bun + Vite + Tailwind + shadcn/ui frontend.
Shared codebase packaged as SDK runtime and control-plane web package.
Apps can provide XML pages while control plane serves/renders UI.

### Documentation (`docs/`)

VitePress docs for control plane and SDK audiences.
Write clear, precise, unambiguous docs for broad technical backgrounds and translation friendliness.

## Contributing model

- Keep changes small and clear.
- Do not add new helper functions unless they are explicitly needed or requested.
- Remove obsolete code when replacing old flows.
- Keep responsibilities separated:
  - Control plane handles governance/infrastructure concerns.
  - Applications handle business logic.
  - Web layer renders UI/runtime behavior.

## Code quality rules

- All JavaScript functions must have JSDoc (`/** ... */`) directly above declaration.
- Any non-trivial JavaScript logic block must have standalone inline comment (`/* ... */`) above block.
- All Python functions must include docstring (`""" ... """`) immediately after definition.
- Any non-trivial Python logic block must have standalone inline comment (`# ...`) above block.
