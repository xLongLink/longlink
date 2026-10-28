import pytest
import pytest_asyncio
from uuid import UUID
from typing import ClassVar
from datetime import UTC, datetime
from sqlmodel import Field, SQLModel
from collections.abc import Iterator, AsyncIterator
from longlink.database import base as database_base
from longlink.database import audit
from longlink.utils.settings import Envs

pytestmark = pytest.mark.usefixtures("audit_model_cleanup")


@pytest_asyncio.fixture
async def audit_engine() -> AsyncIterator[database_base.Database]:
    """Bind an isolated SQLite engine to the SDK session lifecycle."""

    database = database_base.Database(Envs(ENV="testing"))

    try:
        yield database
    finally:
        await database.dispose()


@pytest.fixture
def audit_model_cleanup() -> Iterator[None]:
    """Remove temporary SQLModel tables after an audit test completes."""

    # Snapshot existing tables before each test creates its temporary model.
    metadata = SQLModel.metadata
    existing_tables = set(metadata.tables)
    yield

    # Clean up even if a test fails immediately after declaring a model.
    for table_name in set(metadata.tables) - existing_tables:
        metadata.remove(metadata.tables[table_name])


async def test_audit_hook_persists_fields_and_leaves_deletes_hard(audit_engine: database_base.Database) -> None:
    """Persist creation and update audit fields while retaining ordinary hard deletes."""

    # Define one isolated mapped table for the real SQLite lifecycle.
    class AuditLifecycleItem(database_base.Audit, table=True):
        """Temporary SDK table used to verify the complete audit lifecycle."""

        # Table metadata
        __tablename__: ClassVar[str] = "audit_lifecycle_items"

        # Item fields
        id: int | None = Field(default=None, primary_key=True)
        name: str

    # Verify inherited audit columns, user foreign keys, and both relationships.
    table = SQLModel.metadata.tables[AuditLifecycleItem.__tablename__]
    assert {"created_at", "updated_at"} <= set(table.c.keys())
    assert {foreign_key.target_fullname for foreign_key in table.c.created_id.foreign_keys} == {"users.id"}
    assert {foreign_key.target_fullname for foreign_key in table.c.updated_id.foreign_keys} == {"users.id"}
    assert hasattr(AuditLifecycleItem, "created_by")
    assert hasattr(AuditLifecycleItem, "updated_by")

    # Bind this test's users and isolated engine.
    creator_id = UUID("00000000-0000-0000-0000-000000000002")
    updater_id = UUID("00000000-0000-0000-0000-000000000003")
    deleter_id = UUID("00000000-0000-0000-0000-000000000005")

    # Insert through AsyncSession so the registered sync before_flush listener runs.
    async with audit_engine.session() as session:
        item = AuditLifecycleItem(name="draft")
        with audit.actor(creator_id):
            session.add(item)
            await session.commit()

        assert item.id is not None
        item_id = item.id

        # Inspect audit defaults written by the actual flush listener.
        assert item.created_at is not None
        assert item.updated_at is not None
        assert item.created_at.tzinfo is UTC
        assert item.updated_at.tzinfo is UTC
        created_at = item.created_at
        updated_at = item.updated_at
        assert (item.updated_at, item.created_id, item.updated_id) == (created_at, creator_id, creator_id)

        # Update the persisted row with a second audit identity.
        with audit.actor(updater_id):
            item.name = "reviewed"
            await session.commit()

        assert item.created_at == created_at
        assert item.created_id == creator_id
        assert item.updated_id == updater_id
        assert item.updated_at >= updated_at

    # Delete the reloaded row through the ordinary hard-delete lifecycle.
    async with audit_engine.session() as session:
        item = await session.get(AuditLifecycleItem, item_id)
        assert item is not None

        with audit.actor(deleter_id):
            await session.delete(item)
            await session.commit()

    # Reload after deletion to prove the row was removed.
    async with audit_engine.session() as session:
        assert await session.get(AuditLifecycleItem, item_id) is None


async def test_audit_hook_preserves_explicit_insert_fields_for_unchanged_rows(audit_engine: database_base.Database) -> None:
    """Keep caller-provided audit fields when an unchanged row is committed."""

    # Arrange
    class ExplicitAuditItem(database_base.Audit, table=True):
        """Temporary SDK table used to verify explicit audit values."""

        # Table metadata
        __tablename__: ClassVar[str] = "explicit_audit_items"

        # Item fields
        id: int | None = Field(default=None, primary_key=True)
        name: str

    created_at = datetime(2026, 7, 14, 10, 0, tzinfo=UTC)
    updated_at = datetime(2026, 7, 14, 11, 0, tzinfo=UTC)
    creator_id = UUID("00000000-0000-0000-0000-000000000002")
    updater_id = UUID("00000000-0000-0000-0000-000000000003")

    async with audit_engine.session() as session:

        # Explicit audit fields must survive the real flush listener unchanged.
        item = ExplicitAuditItem(name="draft", created_at=created_at, updated_at=updated_at, created_id=creator_id, updated_id=updater_id)
        session.add(item)
        await session.commit()

        # The initial commit supplies the identity used by later lifecycle transitions.
        assert item.id is not None
        item_id = item.id

    # Act
    async with audit_engine.session() as session:
        item = await session.get(ExplicitAuditItem, item_id)
        assert item is not None
        item.name = "draft"
        await session.commit()

    # Assert
    async with audit_engine.session() as session:
        item = await session.get(ExplicitAuditItem, item_id)
        assert item is not None
        assert (item.created_at, item.updated_at, item.created_id, item.updated_id) == (created_at, updated_at, creator_id, updater_id)


async def test_audit_hook_preserves_ordinary_model_inserts_and_updates(audit_engine: database_base.Database) -> None:
    """Leave ordinary SQLModel inserts and updates unchanged."""

    # Arrange
    class PlainLifecycleItem(SQLModel, table=True):
        """Temporary ordinary table used to verify audit listener scope."""

        # Table metadata
        __tablename__: ClassVar[str] = "plain_lifecycle_items"

        # Item fields
        id: int | None = Field(default=None, primary_key=True)
        name: str

    # Act
    async with audit_engine.session() as session:
        item = PlainLifecycleItem(name="draft")
        session.add(item)
        await session.commit()
        assert item.id is not None
        item_id = item.id

    async with audit_engine.session() as session:

        # Plain lifecycle models do not opt into actor-attribution updates.
        item = await session.get(PlainLifecycleItem, item_id)
        assert item is not None

        # Exercise a normal update without opting the model into audit behavior.
        item.name = "published"
        await session.commit()

    # Assert
    async with audit_engine.session() as session:
        item = await session.get(PlainLifecycleItem, item_id)
        assert item is not None
        assert item.name == "published"
