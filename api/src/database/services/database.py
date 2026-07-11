from uuid import UUID
from fastapi import HTTPException
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.database.session import session_scope
from src.models.databases import DatabaseKind
from src.database.models.users import User
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application


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


async def create(
    kind: DatabaseKind,
    name: str,
    slug: str,
    host: str,
    port: int,
    username: str,
    password: str,
    location_id: UUID,
    user: User,
) -> DatabaseRegistry:
    """Create one database backend registration."""

    # Use one session for duplicate checks and creation.
    async with session_scope() as session:
        result = await session.execute(select(DatabaseRegistry.id).where(DatabaseRegistry.name == name))

        # Reject duplicate registry names before insert.
        if result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Database registry already exists")

        location_result = await session.execute(select(DatabaseRegistry.id).where(DatabaseRegistry.location_id == location_id))

        # Each location owns a single database backend.
        if location_result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Database registry already exists for location")

        database = DatabaseRegistry(
            kind=kind,
            name=name,
            slug=slug,
            host=host,
            port=port,
            password=password,
            username=username,
            location_id=location_id,
        )
        database.created_id = user.id
        database.updated_id = user.id
        session.add(database)

        # Commit so uniqueness violations surface consistently.
        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise HTTPException(status_code=409, detail="Database registry already exists") from exc

        registry_id = database.id
        statement = (
            select(DatabaseRegistry)
            .options(
                selectinload(DatabaseRegistry.created_by),
                selectinload(DatabaseRegistry.updated_by),
                selectinload(DatabaseRegistry.deleted_by),
            )
            .where(DatabaseRegistry.id == registry_id)
        )
        result = await session.execute(statement)
        return result.scalar_one()


async def delete(registry_id: UUID, user: User) -> bool:
    """Soft-delete one database registry when no active app uses it."""

    # Open a session for the deletion check.
    async with session_scope() as session:
        registry = await session.get(DatabaseRegistry, registry_id)

        # Treat missing or deleted registries as no-ops.
        if registry is None or registry.deleted_at is not None:
            return False

        active_application = await session.execute(
            select(Application.id).where(
                Application.database_registry_id == registry_id,
                Application.deleted_at.is_(None),
            ).limit(1)
        )

        # Block deletion while active applications depend on it.
        if active_application.scalars().first() is not None:
            raise HTTPException(status_code=409, detail="Database registry is used by active applications")

        now = datetime.now(UTC)
        registry.deleted_at = now
        registry.deleted_id = user.id
        registry.updated_at = now
        registry.updated_id = user.id
        await session.commit()
        return True
