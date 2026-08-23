import pytest
from uuid import UUID
from typing import cast
from fastapi import FastAPI
from longlink import context
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator, AsyncIterator
from starlette.requests import Request


def create_request(storage: object, identity: UUID | None) -> Request:
    """Build one SDK request with runtime storage and Platform identity."""

    # Attach the runtime services and trusted identity used by the dependency.
    app = FastAPI()
    app.state.longlink = type("Runtime", (), {"storage": storage})()
    request = Request({"type": "http", "app": app, "headers": [], "method": "GET", "path": "/", "query_string": b""})
    request.state.longlink_identity = identity
    return request


@pytest.mark.parametrize(
    ("identity", "expected_user", "expected_lookups"),
    [
        pytest.param(
            UUID("00000000-0000-0000-0000-000000000001"),
            object(),
            [(context.Audit, UUID("00000000-0000-0000-0000-000000000001"))],
            id="authenticated",
        ),
        pytest.param(None, None, [], id="anonymous"),
    ],
)
async def test_data_resolves_request_services(
    monkeypatch: pytest.MonkeyPatch,
    identity: UUID | None,
    expected_user: object | None,
    expected_lookups: list[tuple[object, UUID]],
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
            return expected_user

    database = Database()

    @asynccontextmanager
    async def fake_session(database: object) -> AsyncIterator[object]:
        """Yield one fake request-scoped database session and record cleanup."""

        nonlocal session_closed
        try:
            yield database
        finally:
            session_closed = True

    request = create_request(storage, identity)
    monkeypatch.setattr(context, "session", lambda: fake_session(database))

    # Act
    values = context.data(request)
    try:
        value = await anext(values)

        # Assert
        assert value.user is expected_user
        assert value.storage is storage
        assert value.database is database
        assert database.lookups == expected_lookups
    finally:
        await cast(AsyncGenerator[object, None], values).aclose()

    assert session_closed
