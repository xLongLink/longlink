import httpx2
import pytest
import asyncio
from uuid import UUID
from types import SimpleNamespace
from fastapi import FastAPI, WebSocket
from longlink import context, identity
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from longlink.database import audit
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

IDENTITY_SECRET = "test-identity-secret-01234567890"


class RequestDatabase:
    """Record user lookups and session cleanup at the request database boundary."""

    def __init__(self) -> None:
        """Initialize an authenticated user and isolated session observations."""

        # Keep each request test's user and observations independent.
        self.user: object | None = object()
        self.lookups: list[tuple[object, UUID]] = []
        self.session_closed = False

    async def get(self, model: object, user_id: UUID) -> object | None:
        """Record the audit-user lookup and return the configured user."""

        # Observe the identity passed through the real context dependency.
        self.lookups.append((model, user_id))
        return self.user

    @asynccontextmanager
    async def session(self) -> AsyncIterator["RequestDatabase"]:
        """Yield the test session and record finalization on every exit path."""

        # Preserve cleanup observations for both successful and failing endpoints.
        try:
            yield self
        finally:
            self.session_closed = True


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
    identity: UUID | None,
    user: object | None,
) -> None:
    """Yield request services only when an identity resolves to a user."""

    # Arrange
    request_database = RequestDatabase()
    storage = object()
    request_database.user = user
    app = FastAPI()
    app.state.longlink = SimpleNamespace(storage=storage, database=request_database)
    context.install_context_middleware(app, IDENTITY_SECRET)

    @app.get("/")
    async def get_context(value: context.Context) -> dict[str, bool]:
        """Expose dependency values for the request-boundary test."""

        return {"user_matches": value.user is user, "storage_matches": value.storage is storage}

    client = TestClient(app)

    # Act
    with client:
        response = client.get("/", headers={} if identity is None else identity_headers(identity))

    # Assert
    if user is None:
        assert response.status_code == 401
    else:
        assert response.status_code == 200
        assert response.json() == {"user_matches": True, "storage_matches": True}
    assert request_database.lookups == ([] if identity is None else [(context.User, identity)])
    assert request_database.session_closed


def test_data_closes_database_session_when_endpoint_fails() -> None:
    """Close the request database session when a dependent endpoint raises."""

    # Arrange
    request_database = RequestDatabase()
    app = FastAPI()
    app.state.longlink = SimpleNamespace(storage=object(), database=request_database)
    context.install_context_middleware(app, IDENTITY_SECRET)

    @app.get("/")
    async def fail(_value: context.Context) -> None:
        """Fail after the context dependency opens its session."""

        raise RuntimeError("endpoint failed")

    # Act
    with TestClient(app) as client, pytest.raises(RuntimeError):
        client.get("/", headers=identity_headers(UUID("00000000-0000-0000-0000-000000000001")))

    # Assert
    assert request_database.session_closed


@pytest.mark.parametrize(
    ("secret", "identity_header"),
    [
        pytest.param(IDENTITY_SECRET, "invalid-token", id="invalid-token"),
        pytest.param("", None, id="missing-secret"),
    ],
)
def test_context_middleware_treats_untrusted_identity_as_anonymous(secret: str, identity_header: str | None) -> None:
    """Treat invalid tokens and missing credentials as anonymous."""

    # Install the real context middleware around the shared anonymous probe route.
    app = FastAPI()
    context.install_context_middleware(app, secret)

    @app.get("/")
    async def get_identity() -> dict[str, bool]:
        """Expose whether the middleware accepted the supplied identity."""

        return {"authenticated": audit.current_actor.get() is not None}

    client = TestClient(app)

    # Act
    headers = {} if identity_header is None else {"x-longlink-identity": identity_header}
    if not secret:
        headers = identity_headers(UUID("00000000-0000-0000-0000-000000000001"))
    with client:
        response = client.get("/", headers=headers)

    # Assert
    assert response.status_code == 200
    assert response.json() == {"authenticated": False}


def test_production_context_requires_signed_identity_except_for_probes() -> None:
    """Require signed HTTP identity, allow anonymous probes, and reject all WebSockets."""

    # Install the same production identity boundary used by the Solution application.
    app = FastAPI()
    context.install_context_middleware(app, IDENTITY_SECRET, require_identity=True)

    @app.get("/views.json")
    async def views() -> dict[str, bool]:
        """Expose whether the request carried a verified user."""

        return {"authenticated": audit.current_actor.get() is not None}

    @app.get("/health")
    @app.get("/ready")
    async def probe() -> dict[str, bool]:
        """Provide anonymous liveness and readiness probes."""

        return {"ok": True}

    @app.websocket("/events")
    async def events(socket: WebSocket) -> None:
        """Accept a connection if it bypasses the HTTP identity boundary."""

        await socket.accept()

    user_id = UUID("00000000-0000-0000-0000-000000000001")
    headers = identity_headers(user_id)
    wrong_key_token = identity.create_identity_token(user_id, "wrong-identity-secret-01234567890")
    client = TestClient(app)

    # Direct gateway requests have no valid Platform assertion; proxy requests do.
    with client:
        anonymous = client.get("/views.json")
        assert anonymous.status_code == 401
        assert anonymous.json() == {"detail": "Authentication required"}
        assert client.get("/views.json", headers={"x-longlink-identity": "invalid-token"}).status_code == 401
        forged = client.get("/views.json", headers={"x-longlink-identity": wrong_key_token})
        assert forged.status_code == 401
        assert forged.json() == {"detail": "Authentication required"}
        authorized = client.get("/views.json", headers=headers)
        assert authorized.status_code == 200
        assert authorized.json() == {"authenticated": True}
        assert client.get("/health").status_code == 200
        assert client.get("/ready").status_code == 200

        # Neither anonymous nor validly signed identity grants the unsupported transport.
        with pytest.raises(WebSocketDisconnect) as anonymous_rejection, client.websocket_connect("/events"):
            pass
        assert anonymous_rejection.value.code == 1008
        with pytest.raises(WebSocketDisconnect) as signed_rejection, client.websocket_connect("/events", headers=headers):
            pass
        assert signed_rejection.value.code == 1008


async def test_context_middleware_isolates_concurrent_audit_identities() -> None:
    """Keep audit identities isolated across concurrently handled requests."""

    # Arrange
    first_id = UUID("00000000-0000-0000-0000-000000000006")
    second_id = UUID("00000000-0000-0000-0000-000000000007")
    first_outer_id = UUID("00000000-0000-0000-0000-000000000008")
    second_outer_id = UUID("00000000-0000-0000-0000-000000000009")
    both_requests_arrived = asyncio.Barrier(2)
    app = FastAPI()
    context.install_context_middleware(app, IDENTITY_SECRET)

    @app.get("/")
    async def current_user() -> dict[str, str | None]:
        """Return the audit identity after both requests reach the handler."""

        # Read each request's identity only after both handlers have arrived.
        await both_requests_arrived.wait()
        user_id = audit.current_actor.get()
        return {"user_id": str(user_id) if user_id is not None else None}

    # Send requests in their own coroutine contexts and check restoration there.
    transport = httpx2.ASGITransport(app=app)
    client = httpx2.AsyncClient(transport=transport, base_url="http://test")

    async def request(user_id: UUID, outer_id: UUID) -> httpx2.Response:
        """Verify the middleware restores the caller's actor before returning."""

        # Assert restoration in the same task that executes the ASGI middleware.
        with audit.actor(outer_id):
            response = await client.get("/", headers=identity_headers(user_id))
            assert audit.current_actor.get() == outer_id
            return response

    # Act
    async with client:
        async with asyncio.timeout(5):
            first_response, second_response = await asyncio.gather(
                request(first_id, first_outer_id),
                request(second_id, second_outer_id),
            )

    # Assert
    assert first_response.status_code == 200
    assert first_response.json() == {"user_id": str(first_id)}
    assert second_response.status_code == 200
    assert second_response.json() == {"user_id": str(second_id)}
