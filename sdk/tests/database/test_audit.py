import pytest
import pytest_asyncio
from uuid import UUID
from typing import ClassVar
from datetime import UTC, datetime
from longlink import context as runtime_context
from sqlmodel import Field
from contextlib import contextmanager
from collections.abc import Callable, Iterator, AsyncIterator
from longlink.database import base as database_base
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
