---
name: api
description: LongLink control-plane API
---

- The FastAPI control-plane API is hosted on `localhost:8000` during development.
- In local development, the Vite frontend dev server (`localhost:5173`) proxies /api and /auth requests to the backend on `localhost:8000`.

## Structure

```bash
api/
├── src/
│   ├── __init__.py
│   ├── auth.py                  # Auth helpers
│   ├── constants.py             # Shared constants
│   ├── env.py                   # Environment config
│   ├── db/                      # Database session, models, services
│   │   └── session.py
│   ├── models/                  # Domain models
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── compute.py
│   │   ├── pages.py
│   │   └── users.py
│   ├── pages/                   # XML page definitions
│   │   └── example.xml
│   ├── routes/                  # API routes
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── auth.py
│   │   ├── compute.py
│   │   ├── example.py
│   │   ├── organizations.py
│   │   ├── pages.py
│   │   ├── proxies.py
│   │   └── users.py
│   ├── templates/               # Kubernetes and infra templates
│   │   ├── application.yml
│   │   ├── ingress.yml
│   │   └── router.yml
│   └── utils/                   # Shared helpers
│       ├── __init__.py
│       ├── compute.py
│       ├── database.py
│       ├── kubectl.py
│       ├── storage.py
│       └── utils.py
├── main.py                       # FastAPI entry
└── tests/                        # Tests
```

- User are are logged using an `OIDC` client (e.g. Keycloak)
- Support for multi organization (`/orgs/{org_id}/...` routes)
- Each organization has its own set of users and permissions
- Each organization has its own database
- Each organization has its own isolated storage
- Each organization has its own compute namespace

## Database

```bash
Database Server       # Managed by the control place
└── Database          # One per organization
    └── Schema        # Each app gets its own schema
        └── Tables    # Managed by each app (SQLModel + Alembic)
```

## Storage

```bash
Storage Cluster       # Managed by the control plane
└── Tenant            # One per organization
    └── Bucket        # Each app gets isolated storage
        └── Objects   # Managed by each app (ffspec)
```

## Compute

```bash
Compute Cluster       # Managed by the control plane
└── Namespace         # One per organization
    └── Containers    # Application packaged (fastapi)
```
