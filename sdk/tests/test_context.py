import pytest
import asyncio
from uuid import UUID
from fastapi import Depends, FastAPI, Request
from longlink import context, identity
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from collections.abc import AsyncIterator
from fastapi.testclient import TestClient

IDENTITY_SECRET = "test-identity-secret-01234567890"


def identity_headers(user_id: UUID) -> dict[str, str]:
    """Build one current Platform identity assertion for context tests."""

    # Use the shared token constructor used by the Platform gateway.
    return {"x-longlink-identity": identity.create_identity_token(user_id, IDENTITY_SECRET)}


def create_context_application() -> FastAPI:
    """Create an application that exposes the request-local audit identity."""

    # Install the real context middleware around observable test routes.
    app = FastAPI()
    context.install_context_middleware(app, IDENTITY_SECRET)

    @app.get("/")
    async def current_user() -> dict[str, str | None]:
        """Return the request-local audit identity after yielding control."""

        await asyncio.sleep(0)
        user_id = context._current_identity.get()
        return {"user_id": str(user_id) if user_id is not None else None}

    @app.get("/failure")
    async def fail() -> None:
        """Raise after middleware has bound an audit identity."""

        raise RuntimeError("handler failed")

    return app


@pytest.mark.parametrize(
    ("identity", "user"),
    [
        pytest.param(UUID("00000000-0000-0000-0000-000000000001"), object(), id="authenticated"),
        pytest.param(UUID("00000000-0000-0000-0000-000000000002"), None, id="deleted-user"),
        pytest.param(None, None, id="anonymous"),
    ],
)
def test_data_resolves_request_services(
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
    @asynccontextmanager
    async def fake_session(database: object) -> AsyncIterator[object]:
        """Yield one fake request-scoped database session and record cleanup."""

        nonlocal session_closed
        try:
            yield database
        finally:
            session_closed = True

    class DatabaseService:
        """Provide the configured request database session."""

        def session(self) -> AbstractAsyncContextManager[object]:
            """Yield the test database session."""

            return fake_session(database)

    app = FastAPI()
    app.state.longlink = type("Runtime", (), {"storage": storage, "database": DatabaseService()})()
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


def test_data_closes_database_session_when_endpoint_fails() -> None:
    """Close the request database session when a dependent endpoint raises."""

    # Arrange
    session_closed = False

    class Database:
        """Provide the minimal lookup behavior required by the dependency."""

        async def get(self, _model: object, _user_id: UUID) -> None:
            """Return no shared audit user."""

    @asynccontextmanager
    async def fake_session() -> AsyncIterator[Database]:
        """Yield a database session and record finalization."""

        nonlocal session_closed
        try:
            yield Database()
        finally:
            session_closed = True

    class DatabaseService:
        """Open the configured request database session."""

        def session(self) -> AbstractAsyncContextManager[Database]:
            """Return the managed fake session."""

            return fake_session()

    app = FastAPI()
    app.state.longlink = type("Runtime", (), {"storage": object(), "database": DatabaseService()})()
    context.install_context_middleware(app, IDENTITY_SECRET)

    @app.get("/")
    async def fail(_value: context.Context = Depends(context.data)) -> None:
        """Fail after the context dependency opens its session."""

        raise RuntimeError("endpoint failed")

    # Act
    with TestClient(app) as client, pytest.raises(RuntimeError) as error:
        client.get("/", headers=identity_headers(UUID("00000000-0000-0000-0000-000000000001")))

    # Assert
    assert str(error.value) == "endpoint failed"
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


def test_context_middleware_binds_signed_audit_identity() -> None:
    """Bind one trusted audit identity and clear it after the response."""

    # Arrange
    user_id = UUID("00000000-0000-0000-0000-000000000005")

    # Act
    with TestClient(create_context_application()) as client:
        response = client.get("/", headers=identity_headers(user_id))

    # Assert
    assert response.status_code == 200
    assert response.json() == {"user_id": str(user_id)}
    assert context._current_identity.get() is None


async def test_context_middleware_isolates_concurrent_audit_identities() -> None:
    """Keep audit identities isolated across concurrently handled requests."""

    # Arrange
    first_id = UUID("00000000-0000-0000-0000-000000000006")
    second_id = UUID("00000000-0000-0000-0000-000000000007")

    # Act
    with TestClient(create_context_application()) as client:
        first_response, second_response = await asyncio.gather(
            asyncio.to_thread(client.get, "/", headers=identity_headers(first_id)),
            asyncio.to_thread(client.get, "/", headers=identity_headers(second_id)),
        )

    # Assert
    assert first_response.status_code == 200
    assert first_response.json() == {"user_id": str(first_id)}
    assert second_response.status_code == 200
    assert second_response.json() == {"user_id": str(second_id)}


def test_context_middleware_clears_audit_identity_after_handler_failure() -> None:
    """Restore the ambient audit identity when a route raises an exception."""

    # Arrange
    user_id = UUID("00000000-0000-0000-0000-000000000008")

    # Act
    with TestClient(create_context_application()) as client, pytest.raises(RuntimeError, match="handler failed"):
        client.get("/failure", headers=identity_headers(user_id))

    # Assert
    assert context._current_identity.get() is None
