# Contributing in `api/`

This folder contains the LongLink Platform API. It is responsible for authentication, permissions, governance, and orchestration.

Run from `api/`:

```bash
uv sync --extra dev                # Create the development environment
uv run alembic upgrade head        # Apply database migrations
uv run python seed.py              # Seed the database
DEVELOPMENT=true uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload
uv run isort .                     # Format imports
```

## Architecture

The combined repository architecture is maintained in `../AGENTS.md`.

## Keep changes aligned

- Define constrained values with shared Enums (for example `ApplicationStatus`) instead of raw strings.
- For fixed access levels, keep the role names in an Enum and store the chosen role on the membership row instead of creating a standalone roles table.
- Use a `permissions` table for fine-grained capabilities and a `role_permissions` association table when mapping fixed roles to permissions.
- Use association tables for `user -> organization` and `user -> application` membership records, including the role column on those rows.
- Use Pydantic models (`BaseModel`) to validate external JSON responses.
- Use `model_validate()` (Pydantic v2) for parse + validation in one step.
- Let FastAPI typing handle request/query validation automatically (for example `ApplicationStatus | None`).
- Centralize validation in schemas, not route handlers.
- Provide defaults at schema level when a model owns the default value.
- Keep route handlers focused on orchestration.
- Normalize external input once at boundaries.
- Catch only meaningful exceptions and map to proper HTTP responses.
- Reuse schemas/enums across API, service, persistence layers.
- Remove outdated paths when introducing new model.

## API Responses

- Use FastAPI `response_model` on route decorators for successful responses.
- Return the plain Pydantic payload for normal endpoints.
- Raise `HTTPException` for failures; the FastAPI app handles error serialization centrally.
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

Fixtures & Data

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
