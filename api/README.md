<div align="center">

# LongLink Platform API

[Website](https://longlink.dev) &nbsp; - &nbsp; [Docs](https://longlink.dev/docs) &nbsp; - &nbsp; [Issues](https://github.com/xLongLink/longlink/issues)

</div>

## Introduction

The API folder contains the LongLink Platform API. It manages authentication, permissions, organizations, applications, infrastructure connections, operations, and application routing.

```
┌───────────────────────────────────┐
│        LONGLINK PLATFORM          │
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
│ • Shared data                     │
└───────────────────────────────────┘
                  ▼
┌───────────────────────────────────┐
│          APPLICATIONS             │
├───────────────────────────────────┤
│ • Logic                           │
│ • Storage                         │
└───────────────────────────────────┘
```

<br />

## Development

Run from `api/`:

```bash
uv sync --extra dev
uv run alembic upgrade head
uv run python seed.py
DEVELOPMENT=true uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for migration, seeding, testing, and contribution details.

<br />

## Roles

- Platform roles: apply across the LongLink Platform.
- Organization roles: scope permissions within an organization.
- Application roles: scope permissions within a single application.

<br />

## Organizations

Organizations are tenant boundaries for users, shared data, applications, and managed runtime resources. Organization creation owns database creation, executes SDK-owned shared-schema migrations with control-plane credentials, synchronizes shared users, and provisions shared storage.

<br />

## Applications

Applications are LongLink SDK services deployed into an organization. Application creation owns application schema creation, runtime role provisioning, application storage setup, and deployment rollout.

<br />

---

<div align="center">
LongLink 2026

[License](../LICENSE) &nbsp; - &nbsp; [Contributing](./CONTRIBUTING.md) &nbsp; - &nbsp; [Contact](mailto:info@longlink.dev)

</div>

---
