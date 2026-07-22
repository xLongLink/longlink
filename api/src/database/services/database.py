from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.types import DatabaseSSLMode
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.databases import DatabaseRegistry
from src.database.models.organizations import Organization


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


async def create(
    name: str,
    slug: str,
    host: str,
    port: int,
    username: str,
    password: str,
    sslmode: DatabaseSSLMode,
    user: User,
) -> DatabaseRegistry:
    """Register one database backend."""

    # Persist administrator credentials only at the registry control-plane boundary.
    async with session_scope() as session:
        registry = DatabaseRegistry(
            name=name,
            slug=slug,
            host=host,
            port=port,
            password=password,
            sslmode=sslmode,
            username=username,
            created_id=user.id,
            updated_id=user.id,
        )
        session.add(registry)

        # Translate unique registry names and slugs to one stable API conflict.
        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise HTTPException(status_code=409, detail="Database registry already exists") from exc

        return await get(registry.id) or registry


async def delete(registry_id: UUID, user: User) -> DatabaseRegistry | None:
    """Tombstone an unused database registry."""

    # Lock the registry while checking immutable Organization assignments.
    async with session_scope() as session:
        registry = (
            await session.execute(select(DatabaseRegistry).where(DatabaseRegistry.id == registry_id).with_for_update())
        ).scalar_one_or_none()
        if registry is None or registry.deleted_at is not None:
            return None

        # Keep registries assigned to active or cleanup-pending Organizations available.
        organization_id = (
            await session.execute(select(Organization.id).where(Organization.database_id == registry_id).limit(1))
        ).scalar_one_or_none()
        if organization_id is not None:
            raise HTTPException(status_code=409, detail="Database registry is used by organizations")

        # Record the administrator and hide the registry from future assignments.
        now = utcnow()
        registry.deleted_at = now
        registry.deleted_id = user.id
        registry.updated_at = now
        registry.updated_id = user.id
        await session.commit()

    return await get(registry_id, include_deleted=True)
