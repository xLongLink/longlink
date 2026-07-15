from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.database.session import session_scope
from src.database.models.databases import DatabaseRegistry


async def fetch() -> list[DatabaseRegistry]:
    """Return all registered database backends."""

    # Open a session for the registry list query.
    async with session_scope() as session:
        statement = (
            select(DatabaseRegistry)
            .options(
                selectinload(DatabaseRegistry.created_by),
                selectinload(DatabaseRegistry.updated_by),
                selectinload(DatabaseRegistry.deleted_by),
            )
            .where(DatabaseRegistry.deleted_at.is_(None))
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def get(registry_id: UUID, include_deleted: bool = False) -> DatabaseRegistry | None:
    """Return one database backend by id."""

    # Open a session for the registry lookup.
    async with session_scope() as session:
        conditions = [DatabaseRegistry.id == registry_id]

        # Hide soft-deleted registries unless explicitly requested.
        if not include_deleted:
            conditions.append(DatabaseRegistry.deleted_at.is_(None))

        statement = (
            select(DatabaseRegistry)
            .options(
                selectinload(DatabaseRegistry.created_by),
                selectinload(DatabaseRegistry.updated_by),
                selectinload(DatabaseRegistry.deleted_by),
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def location(location_id: UUID, include_deleted: bool = False) -> DatabaseRegistry | None:
    """Return the database backend assigned to one location."""

    # Query by location because each location owns at most one database backend.
    async with session_scope() as session:
        conditions = [DatabaseRegistry.location_id == location_id]

        # Hide soft-deleted registries unless explicitly requested.
        if not include_deleted:
            conditions.append(DatabaseRegistry.deleted_at.is_(None))

        statement = (
            select(DatabaseRegistry)
            .options(
                selectinload(DatabaseRegistry.created_by),
                selectinload(DatabaseRegistry.updated_by),
                selectinload(DatabaseRegistry.deleted_by),
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()
