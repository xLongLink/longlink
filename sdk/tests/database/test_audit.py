import pytest
import asyncio
from uuid import UUID
from typing import ClassVar
from fastapi import FastAPI
from datetime import UTC, datetime
from longlink import context as runtime_context
from sqlmodel import Field
from contextlib import contextmanager
from collections.abc import Iterator
from longlink.database import base as database_base
from longlink.database import audit
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine


@contextmanager
def identity_context(user_id: UUID) -> Iterator[None]:
    """Bind one audit identity for a test operation."""

    # Restore request-local state after each audited operation.
    token = runtime_context._current_identity.set(user_id)
    try:
        yield
    finally:
        runtime_context._current_identity.reset(token)


def create_audit_application() -> FastAPI:
    """Create an application that exposes the request audit identity."""

    app = FastAPI()
    runtime_context.install_context_middleware(app)

    @app.get("/")
    async def current_user() -> dict[str, str | None]:
        """Return the request-local audit identity after yielding control."""

        await asyncio.sleep(0)
        user_id = runtime_context._current_identity.get()
        return {"user_id": str(user_id) if user_id is not None else None}

    return app


async def test_audit_hook_persists_fields_and_converts_soft_deletes(monkeypatch: pytest.MonkeyPatch) -> None:
    """Persist audit fields and convert a real AsyncSession delete into a soft delete."""

    # Define one isolated mapped table for the real SQLite lifecycle.
    class AuditLifecycleItem(database_base.AuditTable, table=True):
        """Temporary SDK table used to verify the complete audit lifecycle."""

        # Table metadata
        __tablename__: ClassVar[str] = "audit_lifecycle_items"

        # Item fields
        id: int | None = Field(default=None, primary_key=True)
        name: str

    # Supply one stable timestamp for each audited flush.
    created_at = datetime(2026, 7, 14, 10, 0, tzinfo=UTC)
    updated_at = datetime(2026, 7, 14, 11, 0, tzinfo=UTC)
    deleted_at = datetime(2026, 7, 14, 12, 0, tzinfo=UTC)
    audit_times = iter((created_at, updated_at, deleted_at))

    # Bind this test's clock, users, and isolated engine.
    monkeypatch.setattr(audit, "utcnow", lambda: next(audit_times))
    creator_id = UUID("00000000-0000-0000-0000-000000000002")
    updater_id = UUID("00000000-0000-0000-0000-000000000003")
    deleter_id = UUID("00000000-0000-0000-0000-000000000004")
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    # Isolate the real SQLite engine behind the SDK's normal session lifecycle.
    monkeypatch.setattr(database_base, "create_engine", lambda _env: engine)
    monkeypatch.setattr(database_base, "Session", None)

    try:
        # Insert through AsyncSession so the registered sync before_flush listener runs.
        async with database_base.session() as session:
            item = AuditLifecycleItem(name="draft")
            with identity_context(creator_id):
                session.add(item)
                await session.commit()

            assert item.id is not None
            assert item.updated_at == created_at
            assert item.updated_id == creator_id
            item_id = item.id

            # Update the persisted row with a second audit identity.
            with identity_context(updater_id):
                item.name = "reviewed"
                await session.commit()

            assert item.updated_at == updated_at
            assert item.updated_id == updater_id

        # Delete the reloaded row and commit the listener's soft-delete conversion.
        async with database_base.session() as session:
            item = await session.get(AuditLifecycleItem, item_id)
            assert item is not None

            with identity_context(deleter_id):
                await session.delete(item)
                await session.commit()

        # Reload after deletion to prove the row and all persisted audit values remain.
        async with database_base.session() as session:
            item = await session.get(AuditLifecycleItem, item_id)
            assert item is not None
            assert item.name == "reviewed"
            assert item.created_at == created_at
            assert item.updated_at == deleted_at
            assert item.deleted_at == deleted_at
            assert item.created_id == creator_id
            assert item.updated_id == deleter_id
            assert item.deleted_id == deleter_id
    finally:
        # Release test metadata and engine resources.
        try:
            database_base.database_metadata.remove(database_base.database_metadata.tables[AuditLifecycleItem.__tablename__])
        finally:
            await engine.dispose()


@pytest.mark.parametrize(
    ("header_value", "expected_user_id"),
    [
        ("00000000-0000-0000-0000-000000000005", "00000000-0000-0000-0000-000000000005"),
        ("invalid", None),
    ],
)
def test_audit_middleware_binds_x_user_id_header(
    header_value: str,
    expected_user_id: str | None,
) -> None:
    """Bind valid audit user headers and ignore malformed values."""

    # Send the candidate audit identity through the HTTP boundary.
    response = TestClient(create_audit_application()).get("/", headers={"x-user-id": header_value})

    # Verify request binding and cleanup after the response.
    assert response.json() == {"user_id": expected_user_id}
    assert runtime_context._current_identity.get() is None


async def test_audit_middleware_isolates_concurrent_request_identities() -> None:
    """Keep audit identities isolated across concurrently handled requests."""

    client = TestClient(create_audit_application())
    first_id = "00000000-0000-0000-0000-000000000006"
    second_id = "00000000-0000-0000-0000-000000000007"

    # Dispatch two requests concurrently, each with a distinct trusted identity.
    first_response, second_response = await asyncio.gather(
        asyncio.to_thread(client.get, "/", headers={"x-user-id": first_id}),
        asyncio.to_thread(client.get, "/", headers={"x-user-id": second_id}),
    )

    # Each handler observes only its own request identity.
    assert first_response.json() == {"user_id": first_id}
    assert second_response.json() == {"user_id": second_id}
