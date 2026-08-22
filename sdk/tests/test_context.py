from uuid import UUID
from fastapi import FastAPI
from longlink import context
from contextlib import asynccontextmanager
from starlette.requests import Request


async def test_data_resolves_authenticated_audit_user_and_request_services(monkeypatch) -> None:
    """Yield the shared user, storage, and database session for an authenticated request."""

    # Arrange
    user_id = UUID("00000000-0000-0000-0000-000000000001")
    user = object()
    storage = object()

    class Database:
        """Return the requested shared audit user."""

        async def get(self, model: object, identity: UUID) -> object:
            """Record the audit model and identity lookup."""

            assert model is context.Audit
            assert identity == user_id
            return user

    database = Database()

    @asynccontextmanager
    async def session():
        """Yield the request-scoped database session."""

        yield database

    app = FastAPI()
    app.state.longlink = type("Runtime", (), {"storage": storage})()
    request = Request({"type": "http", "app": app, "headers": [], "method": "GET", "path": "/", "query_string": b""})
    request.state.longlink_identity = user_id
    monkeypatch.setattr(context, "session", session)

    # Act
    values = context.data(request)
    value = await anext(values)

    # Assert
    assert value.user is user
    assert value.storage is storage
    assert value.database is database


async def test_data_does_not_lookup_user_for_anonymous_request(monkeypatch) -> None:
    """Yield an anonymous context without querying the audit table."""

    # Arrange
    storage = object()

    class Database:
        """Reject unexpected user lookups."""

        async def get(self, *_args: object) -> object:
            """Fail if an anonymous request looks up an audit user."""

            raise AssertionError("anonymous request queried Audit")

    database = Database()

    @asynccontextmanager
    async def session():
        """Yield the request-scoped database session."""

        yield database

    app = FastAPI()
    app.state.longlink = type("Runtime", (), {"storage": storage})()
    request = Request({"type": "http", "app": app, "headers": [], "method": "GET", "path": "/", "query_string": b""})
    request.state.longlink_identity = None
    monkeypatch.setattr(context, "session", session)

    # Act
    values = context.data(request)
    value = await anext(values)

    # Assert
    assert value.user is None
    assert value.storage is storage
    assert value.database is database
