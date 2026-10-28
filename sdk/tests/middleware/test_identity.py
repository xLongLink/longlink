import httpx2
import pytest
import asyncio
from uuid import UUID
from types import SimpleNamespace
from fastapi import FastAPI, WebSocket
from longlink import User, identity
from collections.abc import Iterator
from longlink.database import audit
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from longlink.database.base import Database
from longlink.utils.settings import Envs
from longlink.middleware.identity import IdentityMiddleware

IDENTITY_SECRET = "test-identity-secret-01234567890"


def identity_headers(user_id: UUID) -> dict[str, str]:
    """Build a current Platform identity assertion for middleware admission."""

    return {
        "x-longlink-identity": identity.create_identity_token(User(id=user_id, name="Test User", email="test@example.com"), IDENTITY_SECRET)
    }


@pytest.mark.parametrize(("secret", "identity_header"), [(IDENTITY_SECRET, "invalid-token"), ("", None)])
def test_context_middleware_treats_untrusted_identity_as_anonymous(secret: str, identity_header: str | None) -> None:
    """Treat invalid tokens and missing credentials as anonymous."""

    # Install the real context middleware around the shared anonymous probe route.
    app = FastAPI()
    app.add_middleware(IdentityMiddleware, identity_secret=secret, require_identity=False, local_user_id=None)

    @app.get("/", response_model=dict[str, bool])
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


@pytest.fixture
def production_client() -> Iterator[TestClient]:
    """Provide a production identity boundary with HTTP and WebSocket routes."""

    # Install the same production identity boundary used by the Solution application.
    app = FastAPI()
    database = Database(Envs(ENV="testing"))
    app.state.longlink = SimpleNamespace(database=database)
    app.add_middleware(IdentityMiddleware, identity_secret=IDENTITY_SECRET, require_identity=True, local_user_id=None)

    @app.get("/views.json", response_model=dict[str, bool])
    async def views() -> dict[str, bool]:
        """Expose whether the request carried a verified user."""

        return {"authenticated": audit.current_actor.get() is not None}

    @app.get("/health", response_model=dict[str, bool])
    @app.get("/ready", response_model=dict[str, bool])
    async def probe() -> dict[str, bool]:
        """Provide anonymous liveness and readiness probes."""

        return {"ok": True}

    @app.websocket("/events")
    async def events(socket: WebSocket) -> None:
        """Accept a connection if it bypasses the HTTP identity boundary."""

        await socket.accept()

    # Keep the application lifespan local to each test.
    client = TestClient(app)
    with client:
        try:
            yield client
        finally:
            assert client.portal is not None
            client.portal.call(database.dispose)


# Production requests require a valid assertion signed by the configured Platform.
HTTP_IDENTITY_CASES = [
    pytest.param({}, None, 401, {"detail": "Authentication required"}, id="missing"),
    pytest.param({"x-longlink-identity": "invalid-token"}, None, 401, {"detail": "Authentication required"}, id="malformed"),
    pytest.param({}, "wrong-identity-secret-01234567890", 401, {"detail": "Authentication required"}, id="wrong-key"),
    pytest.param({}, IDENTITY_SECRET, 200, {"authenticated": True}, id="valid"),
]


@pytest.mark.parametrize(("headers", "signing_secret", "status", "payload"), HTTP_IDENTITY_CASES)
def test_production_context_requires_signed_http_identity(
    production_client: TestClient, headers: dict[str, str], signing_secret: str | None, status: int, payload: dict[str, str | bool]
) -> None:
    """Admit protected HTTP requests only with a valid Platform assertion."""

    # Arrange
    if signing_secret is not None:
        token = identity.create_identity_token(User(id=UUID(int=1), name="Test User", email="test@example.com"), signing_secret)
        headers = {"x-longlink-identity": token}

    # Act
    response = production_client.get("/views.json", headers=headers)

    # Assert
    assert response.status_code == status
    assert response.json() == payload


@pytest.mark.parametrize("path", ["/health", "/ready"])
def test_production_context_allows_anonymous_probes(production_client: TestClient, path: str) -> None:
    """Allow anonymous liveness and readiness requests."""

    # Act
    response = production_client.get(path)

    # Assert
    assert response.status_code == 200
    assert response.json() == {"ok": True}


@pytest.mark.parametrize("signed", [False, True], ids=["anonymous", "signed"])
def test_production_context_rejects_websockets(production_client: TestClient, signed: bool) -> None:
    """Reject WebSockets even when the request carries a valid identity."""

    # Arrange
    headers = identity_headers(UUID("00000000-0000-0000-0000-000000000001")) if signed else {}

    # Act
    with pytest.raises(WebSocketDisconnect) as rejection, production_client.websocket_connect("/events", headers=headers):
        pass

    # Assert
    assert rejection.value.code == 1008


async def test_context_middleware_isolates_concurrent_audit_identities() -> None:
    """Keep audit identities isolated across concurrently handled requests."""

    # Arrange
    first_id = UUID("00000000-0000-0000-0000-000000000006")
    second_id = UUID("00000000-0000-0000-0000-000000000007")
    first_outer_id = UUID("00000000-0000-0000-0000-000000000008")
    second_outer_id = UUID("00000000-0000-0000-0000-000000000009")
    both_requests_arrived = asyncio.Barrier(2)
    app = FastAPI()
    database = Database(Envs(ENV="testing"))
    app.state.longlink = SimpleNamespace(database=database)
    app.add_middleware(IdentityMiddleware, identity_secret=IDENTITY_SECRET, require_identity=False, local_user_id=None)

    @app.get("/", response_model=dict[str, str | None])
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
    try:
        async with client:
            async with asyncio.timeout(5):

                # Overlap both handlers to exercise task-local identity isolation.
                first_response, second_response = await asyncio.gather(
                    request(first_id, first_outer_id), request(second_id, second_outer_id)
                )
    finally:
        await database.dispose()

    # Assert
    assert first_response.status_code == 200
    assert first_response.json() == {"user_id": str(first_id)}
    assert second_response.status_code == 200
    assert second_response.json() == {"user_id": str(second_id)}
