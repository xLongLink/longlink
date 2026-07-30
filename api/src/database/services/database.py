from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from collections.abc import Sequence
from src.models.types import DatabaseSSLMode
from src.database.session import session_scope
from src.database.models.databases import DatabaseRegistry
from src.database.models.organizations import Organization


async def fetch() -> Sequence[DatabaseRegistry]:
    """Return all registered database backends."""

    # Open a session for the registry list query.
    async with session_scope() as session:
        return (await session.scalars(select(DatabaseRegistry))).all()


async def get(registry_id: UUID) -> DatabaseRegistry | None:
    """Return one database backend by id."""

    # Open a session for the registry lookup.
    async with session_scope() as session:
        return await session.get(DatabaseRegistry, registry_id)


async def create(name: str, host: str, port: int, username: str, password: str, sslmode: DatabaseSSLMode) -> DatabaseRegistry:
    """Register one database backend."""

    # Persist administrator credentials only at the registry control-plane boundary.
    async with session_scope() as session:
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
            await session.commit()
        except IntegrityError as exc:
            raise HTTPException(status_code=409, detail="Database registry already exists") from exc

        return registry


async def delete(registry_id: UUID) -> bool:
    """Delete an unused database registry."""

    # Lock the registry while checking immutable Organization assignments.
    async with session_scope() as session:
        registry = await session.get(DatabaseRegistry, registry_id, with_for_update=True)
        if registry is None:
            return False

        # Keep registries assigned to active or cleanup-pending Organizations available.
        if await session.scalar(select(Organization.id).where(Organization.database_id == registry_id).limit(1)) is not None:
            raise HTTPException(status_code=409, detail="Database registry is used by organizations")

        # Internal registries have no soft-delete or audit lifecycle.
        await session.delete(registry)
        await session.commit()
        return True
