import pytest
import asyncio
import pytest_asyncio
from uuid import UUID
from typing import ClassVar
from fastapi import FastAPI
from datetime import UTC, datetime
from longlink import context as runtime_context
from longlink import identity
from sqlmodel import Field
from contextlib import contextmanager
from collections.abc import Callable, Iterator, AsyncIterator
from longlink.database import base as database_base
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine
from longlink.utils.settings import Envs


@contextmanager
def identity_context(user_id: UUID) -> Iterator[None]:
    """Bind one audit identity for a test operation."""

    # Restore request-local state after each audited operation.
    token = runtime_context._current_identity.set(user_id)
    try:
        yield
    finally:
        runtime_context._current_identity.reset(token)


@pytest_asyncio.fixture
async def _audit_engine(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[database_base.Database]:
    """Bind an isolated SQLite engine to the SDK session lifecycle."""

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    monkeypatch.setattr(database_base, "create_engine", lambda _env: engine)
    database = database_base.Database(Envs(ENV="testing"))

    try:
        yield database
    finally:
        await database.dispose()


@pytest.fixture
def audit_model_cleanup() -> Iterator[Callable[[str], None]]:
    """Remove temporary SQLModel tables after an audit test completes."""

    # Track every temporary table even when the test fails before its assertions.
    table_names: list[str] = []
    yield table_names.append

    metadata = database_base.database_metadata
    for table_name in table_names:
        metadata.remove(metadata.tables[table_name])


async def test_audit_hook_persists_fields_and_converts_soft_deletes(
    audit_model_cleanup: Callable[[str], None],
    _audit_engine: database_base.Database,
) -> None:
    """Persist audit fields and convert a real AsyncSession delete into a soft delete."""

    # Define one isolated mapped table for the real SQLite lifecycle.
    class AuditLifecycleItem(database_base.AuditTable, table=True):
        """Temporary SDK table used to verify the complete audit lifecycle."""

        # Table metadata
        __tablename__: ClassVar[str] = "audit_lifecycle_items"

        # Item fields
        id: int | None = Field(default=None, primary_key=True)
        name: str

    audit_model_cleanup(AuditLifecycleItem.__tablename__)

    # Supply one explicit timestamp for the caller-requested soft delete.
    soft_deleted_at = datetime(2026, 7, 14, 12, 0, tzinfo=UTC)

    # Bind this test's users and isolated engine.
    creator_id = UUID("00000000-0000-0000-0000-000000000002")
    updater_id = UUID("00000000-0000-0000-0000-000000000003")
    soft_deleter_id = UUID("00000000-0000-0000-0000-000000000004")
    deleter_id = UUID("00000000-0000-0000-0000-000000000005")
    # Insert through AsyncSession so the registered sync before_flush listener runs.
    async with _audit_engine.session() as session:
        item = AuditLifecycleItem(name="draft")
        with identity_context(creator_id):
            session.add(item)
            await session.commit()

        assert item.id is not None
        item_id = item.id
        assert item.created_at is not None
        assert item.updated_at is not None
        assert item.created_at.tzinfo is UTC
        assert item.updated_at.tzinfo is UTC
        created_at = item.created_at
        updated_at = item.updated_at
        assert (item.updated_at, item.created_id, item.updated_id) == (
            created_at,
            creator_id,
            creator_id,
        )

        # Update the persisted row with a second audit identity.
        with identity_context(updater_id):
            item.name = "reviewed"
            await session.commit()

        assert item.updated_at is not None
        assert item.created_at == created_at
        assert item.created_id == creator_id
        assert item.updated_id == updater_id
        assert item.updated_at >= updated_at
        updated_at = item.updated_at

        # Persist a caller-requested soft delete with the acting identity.
        with identity_context(soft_deleter_id):
            item.deleted_at = soft_deleted_at
            await session.commit()

        # Assert the explicit soft delete before hard-delete conversion overwrites it.
        assert item.updated_at is not None
        assert item.deleted_at == soft_deleted_at
        assert item.updated_id == soft_deleter_id
        assert item.deleted_id == soft_deleter_id
        assert item.updated_at >= updated_at

    # Delete the reloaded row and commit the listener's soft-delete conversion.
    async with _audit_engine.session() as session:
        item = await session.get(AuditLifecycleItem, item_id)
        assert item is not None

        with identity_context(deleter_id):
            await session.delete(item)
            await session.commit()

    # Reload after deletion to prove the row remains as a soft-deleted record.
    async with _audit_engine.session() as session:
        item = await session.get(AuditLifecycleItem, item_id)
        assert item is not None
        assert item.deleted_at is not None
        assert item.deleted_at.tzinfo is UTC
        assert item.deleted_id == deleter_id


async def test_audit_hook_preserves_explicit_insert_fields_for_unchanged_rows(
    audit_model_cleanup: Callable[[str], None],
    _audit_engine: database_base.Database,
) -> None:
    """Keep caller-provided audit fields when an unchanged row is committed."""

    # Arrange
    class ExplicitAuditItem(database_base.AuditTable, table=True):
        """Temporary SDK table used to verify explicit audit values."""

        # Table metadata
        __tablename__: ClassVar[str] = "explicit_audit_items"

        # Item fields
        id: int | None = Field(default=None, primary_key=True)
        name: str

    audit_model_cleanup(ExplicitAuditItem.__tablename__)
    created_at = datetime(2026, 7, 14, 10, 0, tzinfo=UTC)
    updated_at = datetime(2026, 7, 14, 11, 0, tzinfo=UTC)
    creator_id = UUID("00000000-0000-0000-0000-000000000002")
    updater_id = UUID("00000000-0000-0000-0000-000000000003")

    async with _audit_engine.session() as session:
        item = ExplicitAuditItem(
            name="draft",
            created_at=created_at,
            updated_at=updated_at,
            created_id=creator_id,
            updated_id=updater_id,
        )
        session.add(item)
        await session.commit()
        assert item.id is not None
        item_id = item.id

    # Act
    async with _audit_engine.session() as session:
        item = await session.get(ExplicitAuditItem, item_id)
        assert item is not None
        item.name = "draft"
        await session.commit()

    # Assert
    async with _audit_engine.session() as session:
        item = await session.get(ExplicitAuditItem, item_id)
        assert item is not None
        assert (item.created_at, item.updated_at, item.created_id, item.updated_id) == (
            created_at,
            updated_at,
            creator_id,
            updater_id,
        )


IDENTITY_SECRET = "test-identity-secret-01234567890"


def create_audit_application() -> FastAPI:
    """Create an application that exposes the request audit identity."""

    app = FastAPI()
    runtime_context.install_context_middleware(app, IDENTITY_SECRET)

    @app.get("/")
    async def current_user() -> dict[str, str | None]:
        """Return the request-local audit identity after yielding control."""

        await asyncio.sleep(0)
        user_id = runtime_context._current_identity.get()
        return {"user_id": str(user_id) if user_id is not None else None}

    @app.get("/failure")
    async def fail() -> None:
        """Raise after middleware has bound an audit identity."""

        raise RuntimeError("handler failed")

    return app


def identity_headers(user_id: str) -> dict[str, str]:
    """Build one current Platform identity assertion for middleware tests."""

    # Use the same token constructor that the Platform gateway calls.
    return {"x-longlink-identity": identity.create_identity_token(UUID(user_id), IDENTITY_SECRET)}


def test_audit_middleware_binds_signed_identity_header() -> None:
    """Bind one trusted identity and clear it after the response."""

    # Act
    with TestClient(create_audit_application()) as client:
        response = client.get("/", headers=identity_headers("00000000-0000-0000-0000-000000000005"))

    # Assert
    assert response.json() == {"user_id": "00000000-0000-0000-0000-000000000005"}
    assert runtime_context._current_identity.get() is None


async def test_audit_middleware_isolates_concurrent_request_identities() -> None:
    """Keep audit identities isolated across concurrently handled requests."""

    first_id = "00000000-0000-0000-0000-000000000006"
    second_id = "00000000-0000-0000-0000-000000000007"

    # Dispatch two requests concurrently, each with a distinct trusted identity.
    with TestClient(create_audit_application()) as client:
        first_response, second_response = await asyncio.gather(
            *(asyncio.to_thread(client.get, "/", headers=identity_headers(user_id)) for user_id in (first_id, second_id))
        )

    # Each handler observes only its own request identity.
    assert first_response.json() == {"user_id": first_id}
    assert second_response.json() == {"user_id": second_id}


def test_audit_middleware_clears_identity_after_handler_failure() -> None:
    """Restore the ambient audit identity when a route raises an exception."""

    # Arrange
    user_id = "00000000-0000-0000-0000-000000000008"

    # Act
    with TestClient(create_audit_application()) as client, pytest.raises(RuntimeError, match="handler failed"):
        client.get("/failure", headers=identity_headers(user_id))

    # Assert
    assert runtime_context._current_identity.get() is None
