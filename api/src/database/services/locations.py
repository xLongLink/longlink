from uuid import UUID
from fastapi import HTTPException
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from src.database.session import session_scope
from src.models.locations import LocationProvider
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.locations import Location
from src.database.models.organizations import Organization


async def fetch() -> list[Location]:
    """Return all registered locations."""

    # Open a session for the location list query.
    async with session_scope() as session:
        statement = select(Location).where(Location.deleted_at.is_(None))
        result = await session.execute(statement)
        return result.scalars().all()


async def get(location_id: UUID) -> Location | None:
    """Return one location by id."""

    # Open a session for the location lookup.
    async with session_scope() as session:
        statement = select(Location).where(Location.id == location_id, Location.deleted_at.is_(None))
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def create(slug: str, name: str, user: User, country: str, provider: LocationProvider = LocationProvider.local) -> Location:
    """Create one location."""

    # Use one session for creating the location.
    async with session_scope() as session:
        location = Location(name=name, slug=slug, country=country, provider=provider)
        location.created_id = user.id
        location.updated_id = user.id
        session.add(location)

        # Commit so uniqueness violations surface consistently.
        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise HTTPException(status_code=409, detail="Location already exists") from exc

        await session.refresh(location)
        return location


async def delete(location_id: UUID, user: User) -> bool:
    """Soft-delete one location when no active resource depends on it."""

    # Open a session for dependency checks and deletion.
    async with session_scope() as session:
        location = await session.get(Location, location_id)

        # Treat missing or deleted locations as no-ops.
        if location is None or location.deleted_at is not None:
            return False

        dependency_checks = (
            (Organization, "active organizations"),
            (ComputeRegistry, "active compute registries"),
            (DatabaseRegistry, "active database registries"),
            (StorageRegistry, "active storage registries"),
        )

        # Check each resource type that can pin a location.
        for model, label in dependency_checks:
            result = await session.execute(
                select(model.id).where(
                    model.location_id == location_id,
                    model.deleted_at.is_(None),
                )
            )

            # Block deletion when active resources still depend on it.
            if result.scalar_one_or_none() is not None:
                raise HTTPException(status_code=409, detail=f"Location is used by {label}")

        now = datetime.now(UTC)
        location.deleted_at = now
        location.deleted_id = user.id
        location.updated_at = now
        location.updated_id = user.id
        await session.commit()
        return True
