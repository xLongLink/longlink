# Contributing in `api/`

This folder contains the LongLink control plane, it is responsible for authentication, permissions, governance, orchestration.

```bash
uv sync --extra dev     # Create enviroment
uv run seed.py          # Seed the database
uv run main.py          # Run the file (dev mode)
python -m isort .       # Format the code
```

## Architecture

```bash
Control Plane
├── Infrastructure Registry
│   ├── Compute Pools
│   ├── Database Pools
│   ├── Storage Pools
│   ├── Logging Pools
│   ├── Metrics Pools
│   ├── Tracing Pools
│   ├── Secret Pools
│   ├── Network Pools
│   └── Registry Pools
│
├── Organizations
│   └── Organization
│       ├── Org Identity
│       ├── Org Plan / Quota
│       ├── Org Placement
│       ├── Org Spaces
│       ├── Org Policies
│       ├── Org Usage
│       └── Applications
│
└── Applications
    └── Application
        ├── App Metadata
        ├── App Manifest
        ├── App Deployments
        ├── App Allocations
        ├── App Policies
        ├── App Releases
        └── App Health
```

## Folder Structure

```bash
api/
├── src/
│   ├── .static/      # Static resources
│   ├── adapters/     # Storage/Database/Compute adapters
│   ├── db/           # Database session, models, services
│   ├── models/       # FastAPI Domain models
│   ├── routes/       # FastAPI API routes
│   ├── templates/    # Kubernetes and infra templates
│   ├── utils/        # Shared utilities
│   ├── auth.py       # Auth helpers
│   ├── constants.py  # Shared constants
│   └── env.py        # Environment config
│
├── tests/
│   ├── auth/         # Authentication related tests cases
│   ├── db/           # Database related tests cases
│   └── routes/       # Routes related tests cases
│
└── main.py           # Application entrypoint

```

## Keep changes aligned

- Define constrained values with shared Enums (for example `AppType`) instead of raw strings.
- For fixed access levels, keep the role names in an Enum and store the chosen role on the membership row instead of creating a standalone roles table.
- Use a `permissions` table for fine-grained capabilities and a `role_permissions` association table when mapping fixed roles to permissions.
- Use association tables for `user -> organization` and `user -> app` membership records, including the role column on those rows.
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

## API Responses

- Use FastAPI `response_model` on route decorators for successful responses.
- Return the plain Pydantic payload for normal endpoints.
- Raise `HTTPException` for failures; the app handles error serialization centrally.
- Keep error messages short, specific, and actionable.

## Testing

Structure:

- Use AAA sections with comments: `# Arrange`, `# Act`, `# Assert`
- Test names must describe expected behavior
- One test = one behavior
- Keep tests deterministic, isolated, and independently executable
- Prefer explicit assertions (`==`, exact payloads, exact errors)

Parametrization:

- Keep `@pytest.mark.parametrize` on one line
- Use multiple decorators instead of multi-dimensional tuples
- Extract large parameter sets into constants
- Use `pytest.param(..., id="...")` for non-trivial cases

Test Design:

- Test observable behavior only
- Do not test framework internals
- Separate API tests from service-layer tests
- Test happy paths, edge cases, and failure paths
- In API tests, assert both status codes and response payloads
- Validate error schemas, not only error codes
- Test authentication separately from authorization

Fixtures & Datav

- Prefer fixtures/factories/builders over inline complex setup
- Keep fixtures small, composable, and function-scoped by default
- Avoid shared mutable state
- Keep test data minimal and domain-oriented
- Avoid magic values; use named constants
- Prefer immutable inputs

Mocking:

- Mock external boundaries only (HTTP, DB, filesystem, queues, time)
- Do not mock business logic
- Prefer integration tests for important business flows
- Never call real external services in CI
- Freeze/mock time instead of using sleeps

FastAPI / DB:

- Use dependency overrides for FastAPI dependencies
- Clear `app.dependency_overrides` after tests
- Override auth dependencies in tests
- Use transactional rollback fixtures for DB isolation

Style:

- Avoid conditionals and loops inside tests unless testing branching logic
- Avoid randomness unless seeded
- Avoid snapshot tests for unstable payloads
- Use async tests only for async code
- Keep unit tests fast

```python
STATUSES = ["listed", "setup", "maintenance"]

@pytest.mark.parametrize("status", STATUSES)
@pytest.mark.parametrize("role", ["admin", "viewer"])
async def test_property_visibility(client, role, status):
    """Explanation"""

    # Arrange
    token = create_token(role=role)
    property_id = create_property(status=status)

    # Act
    response = await client.get(
        f"/properties/{property_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Assert
    assert response.status_code == expected_status(role, status)
```
