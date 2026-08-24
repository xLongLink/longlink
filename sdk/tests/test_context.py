import pytest
from uuid import UUID
from fastapi import Depends, FastAPI, Request
from longlink import context, identity
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from fastapi.testclient import TestClient

IDENTITY_SECRET = "test-identity-secret-01234567890"


def identity_headers(user_id: UUID) -> dict[str, str]:
    """Build one current Platform identity assertion for context tests."""

    # Use the shared token constructor used by the Platform gateway.
    return {"x-longlink-identity": identity.create_identity_token(user_id, IDENTITY_SECRET)}


@pytest.mark.parametrize(
    ("identity", "user"),
    [
        pytest.param(UUID("00000000-0000-0000-0000-000000000001"), object(), id="authenticated"),
        pytest.param(UUID("00000000-0000-0000-0000-000000000002"), None, id="deleted-user"),
        pytest.param(None, None, id="anonymous"),
    ],
)
def test_data_resolves_request_services(
    monkeypatch: pytest.MonkeyPatch,
    identity: UUID | None,
    user: object | None,
) -> None:
    """Yield request services and look up an audit user only for authenticated requests."""

    # Arrange
    storage = object()
    session_closed = False

    class Database:
        """Record audit-user lookups for the request."""

        def __init__(self) -> None:
            """Initialize recorded audit lookups."""

            self.lookups: list[tuple[object, UUID]] = []

        async def get(self, model: object, user_id: UUID) -> object | None:
            """Record an audit lookup and return the configured result."""

            self.lookups.append((model, user_id))
            return user

    database = Database()
    app = FastAPI()
    app.state.longlink = type("Runtime", (), {"storage": storage})()

    @asynccontextmanager
    async def fake_session(database: object) -> AsyncIterator[object]:
        """Yield one fake request-scoped database session and record cleanup."""

        nonlocal session_closed
        try:
            yield database
        finally:
            session_closed = True

    monkeypatch.setattr(context, "session", lambda: fake_session(database))
    context.install_context_middleware(app, IDENTITY_SECRET)

    @app.get("/")
    async def get_context(value: context.Context = Depends(context.data)) -> dict[str, bool]:
        """Expose dependency values for the request-boundary test."""

        return {"user_matches": value.user is user, "storage_matches": value.storage is storage}

    client = TestClient(app)

    # Act
    response = client.get("/", headers={} if identity is None else identity_headers(identity))

    # Assert
    assert response.status_code == 200
    assert response.json() == {"user_matches": True, "storage_matches": True}
    assert database.lookups == ([] if identity is None else [(context.Audit, identity)])
    assert session_closed


def test_context_middleware_treats_malformed_identity_as_anonymous() -> None:
    """Ignore a malformed Platform identity token."""

    # Arrange
    app = FastAPI()
    context.install_context_middleware(app, IDENTITY_SECRET)

    @app.get("/")
    async def get_identity(request: Request) -> dict[str, bool]:
        """Expose whether the middleware accepted the supplied identity."""

        return {"authenticated": request.state.longlink_identity is not None}

    client = TestClient(app)

    # Act
    response = client.get(
        "/",
        headers={"x-longlink-identity": "invalid-token"},
    )

    # Assert
    assert response.status_code == 200
    assert response.json() == {"authenticated": False}
