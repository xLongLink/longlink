---
name: api
description: LongLink control-plane API
---

LongLink control-plane API skill.

- FastAPI: `localhost:8000`
- Vite proxy: `/api` and `/auth` -> `localhost:8000`
- Read `api/CONTRIBUTING.md` first

## Use For

- Auth and sessions
- API routes
- Adapters
- XML page metadata
- Env and startup wiring

## Structure

```text
api/
├── src/
│   ├── auth.py                  # Auth helpers
│   ├── constants.py             # Shared constants
│   ├── env.py                   # Environment config
│   ├── adapters/                # External service adapters
│   │   ├── compute/
│   │   │   ├── __root__.py
│   │   │   └── kubernetes.py
│   │   ├── database/
│   │   │   ├── __root__.py
│   │   │   └── postgre.py
│   │   └── storage/
│   │       ├── __root__.py
│   │       └── s3.py
│   ├── db/                      # Database session helpers
│   ├── models/                  # Domain models
│   ├── pages/                   # XML page definitions
│   ├── routes/                  # API routes
│   ├── templates/               # Kubernetes and infra templates
│   └── utils/                   # Shared helpers
├── main.py                      # FastAPI entry
└── tests/                       # Tests
```

## Rules

- Keep handlers thin
- Validate with Pydantic models
- Normalize input at the boundary
- Remove obsolete flows when replacing them
- Map meaningful errors to HTTP responses
- Control plane owns auth, permissions, orchestration, storage, and routing

## Local Dev

```bash
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

```bash
python -m isort .
```

- FastAPI docs are disabled
- Inspect route files directly

## Environment

`Env` loads from `.env` and `.env.sample`.

Required:

- `SESSION_KEY`
- `DATABASE_URL`
- `OIDC_REDIRECT_URI`
- `OIDC_SCOPES`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `STORAGE_ENDPOINT_URL`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`
- `COMPUTE_URL`
- `COMPUTE_KUBE_CONFIG_PATH`
- `URL`

Optional:

- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `OIDC_ISSUER`
- `DATABASE_SSLMODE`
- `STORAGE_PROTOCOL` (default `file`)

## Auth

- Session-based OIDC auth

- `GET /auth/login/oidc` start login
- `GET /auth/oidc` handle callback, upsert user, set session
- `GET /auth/logout` clear session
- `GET /auth/me` current user
- `PATCH /auth/me` update current user

- `src/auth.py` registers OIDC
- `authuser()` reads `request.session["userid"]`
- Login returns to `env.URL`

## Routes

Registered in `src/routes/__init__.py`.

### Key Routes

- Auth: `src/routes/auth.py`
- Org metadata: `GET /api/{name}/metadata.json`
- User metadata: `GET /api/user/metadata.json`
- User orgs: `GET /auth/me` includes `organizations`
- App list: `GET /api/orgs/{organization}/apps`
- App metadata: `GET /api/orgs/{organization}/apps/{app_name}/metadata`
- App proxy: `GET|POST|PUT|PATCH|DELETE /api/orgs/{organization}/apps/{app_name}[/{full_path:path}]`
- Registry: `POST /api/compute/registry`
- Registries: `GET /api/compute/registries`
- Compute logs: `GET /api/orgs/{organization}/compute/logs`
- Pages: `GET /api/pages/{page_name}`
- Demo routes: `src/routes/example.py`

## Adapters

### Compute

- Kubernetes namespaces, app deployments, services, ingress
- Shared instance: `src/adapters/compute/kubernetes.py:root`
- Needs `COMPUTE_KUBE_CONFIG_PATH`

### Database

- PostgreSQL org databases and app schemas
- Shared instance: `src/adapters/database/postgre.py:root`
- Needs `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`

### Storage

- S3-compatible buckets
- Shared instance: `src/adapters/storage/s3.py:root`
- Needs `STORAGE_PROTOCOL`, `STORAGE_ENDPOINT_URL`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`

## When Editing

- Update the skill doc when the public API changes
- Keep the Vite proxy contract in mind
- Prefer minimal changes

## Verification

- Run API: `uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- Format: `python -m isort .`
- Adapter smoke tests live in `src/adapters/database/postgre.py` and `src/adapters/storage/s3.py`
