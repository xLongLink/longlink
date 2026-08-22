from uuid import UUID
from sqlalchemy import func, select
from src.errors import ConflictError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import load_only
from src.models.types import DatabaseSSLMode
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.databases import DatabaseRegistry
from src.database.models.organizations import Organization


async def fetch_page(session: AsyncSession, pagination: Pagination) -> tuple[list[DatabaseRegistry], int]:
    """Return one ordered page of database registries."""

    # Load only the fields exposed by the administrator response.
    statement = (
        select(DatabaseRegistry)
        .options(
            load_only(
                DatabaseRegistry.id,
                DatabaseRegistry.name,
                DatabaseRegistry.host,
                DatabaseRegistry.port,
                DatabaseRegistry.sslmode,
                DatabaseRegistry.username,
            )
        )
        .order_by(DatabaseRegistry.name, DatabaseRegistry.id)
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)
    items = list(result.all())

    # Count every registered database target.
    count_result = await session.execute(select(func.count()).select_from(DatabaseRegistry))
    return items, count_result.scalar_one()


async def available(session: AsyncSession) -> UUID | None:
    """Return the ID of the least-used database registry."""

    # Order database registries by their active Organization assignment count.
    assignments = (
        select(func.count(Organization.id))
        .where(Organization.database_id == DatabaseRegistry.id, Organization.deleted_at.is_(None))
        .scalar_subquery()
    )
    return await session.scalar(select(DatabaseRegistry.id).order_by(assignments, DatabaseRegistry.name).limit(1))


async def create(
    session: AsyncSession, name: str, host: str, port: int, username: str, password: str, sslmode: DatabaseSSLMode
) -> DatabaseRegistry:
    """Register one database backend."""

    # Persist administrator credentials only at the registry control-plane boundary.
    registry = DatabaseRegistry(
        name=name,
        host=host,
        port=port,
        password=password,
        sslmode=sslmode,
        username=username,
    )
    session.add(registry)

    # Translate unique registry names to one stable API conflict.
    try:
        await session.flush()
    except IntegrityError as exc:
        raise ConflictError("Database registry already exists") from exc

    return registry


async def delete(session: AsyncSession, registry_id: UUID) -> bool:
    """Delete an unused database registry."""

    # Lock the registry while checking immutable Organization assignments.
    registry = await session.get(DatabaseRegistry, registry_id, with_for_update=True)
    if registry is None:
        return False

    # Keep registries assigned to active or cleanup-pending Organizations available.
    if await session.scalar(select(Organization.id).where(Organization.database_id == registry_id).limit(1)) is not None:
        raise ConflictError("Database registry is used by organizations")

    # Internal registries have no soft-delete or audit lifecycle.
    await session.delete(registry)
    return True
