from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.database.session import session_scope
from src.database.models.storages import StorageRegistry


async def fetch() -> list[StorageRegistry]:
    """Return all registered storage backends."""

    # Open a session for the registry list query.
    async with session_scope() as session:
        statement = (
            select(StorageRegistry)
            .options(
                selectinload(StorageRegistry.created_by),
                selectinload(StorageRegistry.updated_by),
                selectinload(StorageRegistry.deleted_by),
            )
            .where(StorageRegistry.deleted_at.is_(None))
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def get(registry_id: UUID, include_deleted: bool = False) -> StorageRegistry | None:
    """Return one storage backend by id."""

    # Open a session for the registry lookup.
    async with session_scope() as session:
        conditions = [StorageRegistry.id == registry_id]

        # Hide soft-deleted registries unless explicitly requested.
        if not include_deleted:
            conditions.append(StorageRegistry.deleted_at.is_(None))

        statement = (
            select(StorageRegistry)
            .options(
                selectinload(StorageRegistry.created_by),
                selectinload(StorageRegistry.updated_by),
                selectinload(StorageRegistry.deleted_by),
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def location(location_id: UUID, include_deleted: bool = False) -> StorageRegistry | None:
    """Return the storage backend assigned to one location."""

    # Query by location because each location owns at most one storage backend.
    async with session_scope() as session:
        conditions = [StorageRegistry.location_id == location_id]

        # Hide soft-deleted registries unless explicitly requested.
        if not include_deleted:
            conditions.append(StorageRegistry.deleted_at.is_(None))

        statement = (
            select(StorageRegistry)
            .options(
                selectinload(StorageRegistry.created_by),
                selectinload(StorageRegistry.updated_by),
                selectinload(StorageRegistry.deleted_by),
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()
