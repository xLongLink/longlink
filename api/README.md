<div align="center">

# LongLink Control Panel

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

## Introduction

The API folder contains the LongLink control plane. It manages authentication, permissions, organizations, applications, infrastructure connections, operations, and application routing.

```
┌───────────────────────────────────┐
│           CONTROL PLANE           │
├───────────────────────────────────┤
│ • Authentication                  │
│ • Permissions                     │
│ • Roles                           │
│ • Routing                         │
│ • Logging                         │
└───────────────────────────────────┘
                  ▼
┌───────────────────────────────────┐
│           ORGANIZATIONS           │
├───────────────────────────────────┤
│ • Users                           │
│ •                                 │
└───────────────────────────────────┘
                  ▼
┌───────────────────────────────────┐
│               APPS                │
├───────────────────────────────────┤
│ • Logic                           │
│ • Storage                         │
└───────────────────────────────────┘
```

<br />

## Development

```bash
uv sync --extra dev
uv run alembic upgrade head
uv run python seed.py
DEVELOPMENT=true uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Run these commands from `api/`. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for migration, seeding, testing, and contribution details.

<br />

## Roles

- Platform roles: apply across the full control plane.
- Organization roles: scope permissions within an organization.
- Application roles: scope permissions within a single application.

<br />

## Organizations

<br />

## Apps

<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.ch)

</div>

---
