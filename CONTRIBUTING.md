# Contributing to LongLink

This document defines how to contribute to the LongLink project. The goal is to maintain architectural consistency, enforce platform principles, and ensure long-term scalability.

## Guiding Principles

All contributions must respect the core design constraints:

1. **Control plane owns infrastructure concerns**
    - Authentication, permissions, storage, logging, execution policies

2. **Applications contain only business logic**
    - No custom auth, no custom storage policies

3. **Deterministic execution**
    - All state transitions occur server-side

4. **Single source of truth**
    - Actions define logic, UI, and API simultaneously

## Repository Structure

- `api/` → Control plane (FastAPI)
- `sdk/` → Python SDK
- `web/` → Frontend renderer

## Development Workflow

### 1. Setup Environment

```bash
uv venv
source .venv/bin/activate
uv pip install -e './api[dev]'
uv pip install -e './sdk'
```

Frontend:

```bash
bun --cwd=web install
bun --cwd=web dev
```

### 1.1 Local infrastructure connection parameters

After running `make up`, local dependencies are available from `dev/compose.yml` (PostgreSQL + MinIO) and from the `k3d` cluster created by the Makefile (`compute`). Use the following values when connecting providers in the settings screens.

#### Database (PostgreSQL)

Use these values in **Settings → Database → Connect database server**:

- **Server name**: `local-postgres` (or any label you prefer)
- **Host**: `localhost`
- **Port**: `15432`
- **Username**: `admin`
- **Password**: `admin`
- **Maintenance database** (API default): `postgres`

> Docker service source: `postgres` in `dev/compose.yml` with `POSTGRES_USER=admin`, `POSTGRES_PASSWORD=admin`, and port mapping `15432:5432`.

#### Storage (MinIO / S3-compatible)

Use these values in **Settings → Storage → Connect storage provider**:

- **Provider name**: `local-minio` (or any label you prefer)
- **Endpoint URL**: `http://localhost:19000`
- **Region**: `us-east-1` (recommended; optional in UI)
- **Access key**: `admin`
- **Secret key**: `admin`

> Docker service source: `minio` in `dev/compose.yml` with `MINIO_ROOT_USER=admin`, `MINIO_ROOT_PASSWORD=admin`, and port mapping `19000:9000`.

#### Compute (k3d cluster)

`make up` creates a local cluster named `compute` with Kubernetes API exposed on port `6550`.

- **Cluster name**: `compute`
- **Kubernetes API server URL**: `https://localhost:6550`
- **Default namespace**: `default`
- **TLS verification**: disable if your local certificate is not trusted (`verify_ssl=false`)

If you need exact kubeconfig-auth data for manual API calls, run:

```bash
k3d kubeconfig get compute
```

Use the credentials/certificates from that kubeconfig output.

### 2. Branching

- `main` → stable
- `dev` → integration
- feature branches → `feature/<name>`

### 3. Code Standards

#### Python

- Use type hints everywhere
- Follow PEP8
- Prefer explicit over implicit
- No hidden side effects

#### API (Control Plane)

- Must enforce permissions centrally
- No business logic leakage from apps

#### SDK

- Must remain opinionated and constrained
- Avoid introducing flexibility that breaks consistency

#### Web

- Pure renderer
- No business logic in frontend

## Actions Design Rules

When adding new functionality:

- Must be defined as an **action**

- Must be:
    - Typed
    - Stateless (unless explicitly part of workflow)
    - Deterministic

- Must automatically support:
    - UI rendering
    - API access
    - SDK invocation

## Database Changes

- Use migration system via CLI:

```bash
longlink db migrate
```

- No manual schema drift
- All models must be defined in SDK

## Testing

- Unit tests for:
    - SDK logic
    - Control plane services

- Integration tests for:
    - Action execution
    - Permission enforcement

## Pull Requests

Each PR must:

- Clearly state purpose
- Explain architectural impact
- Avoid breaking platform invariants
- Include tests (if applicable)

## What NOT to Do

- ❌ Add authentication inside apps
- ❌ Introduce client-side logic
- ❌ Duplicate infrastructure concerns
- ❌ Bypass control plane
- ❌ Add unstructured APIs outside actions

## Open Areas

- Permissions system design
- Workflow engine implementation
- Application lifecycle management
- UI schema standardization

## Communication

Be precise. Avoid ambiguity. All design discussions should be grounded in system constraints.

## License

[TODO]
