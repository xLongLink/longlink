import pytest
from uuid import UUID
from fastapi import Depends, FastAPI
from longlink import context
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from fastapi.testclient import TestClient


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
    context.install_context_middleware(app)

    @app.get("/")
    async def get_context(value: context.Context = Depends(context.data)) -> dict[str, bool]:
        """Expose dependency values for the request-boundary test."""

        return {"user_matches": value.user is user, "storage_matches": value.storage is storage}

    client = TestClient(app)

    # Act
    response = client.get("/", headers={} if identity is None else {"x-user-id": str(identity)})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"user_matches": True, "storage_matches": True}
    assert database.lookups == ([] if identity is None else [(context.Audit, identity)])
    assert session_closed
