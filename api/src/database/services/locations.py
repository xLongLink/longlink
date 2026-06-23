from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.database.session import session_scope
from src.models.countries import Country
from src.database.models.users import User
from src.database.models.compute import ComputeRegistry
from src.database.models.storage import StorageRegistry
from src.database.models.database import DatabaseRegistry
from src.database.models.location import Location
from src.database.models.organizations import Organization


class LocationsService:
    """Manage location records."""

    async def list(self) -> list[Location]:
        """Return all registered locations."""

        async with session_scope() as session:
            statement = select(Location).options(
                selectinload(Location.created_by),
                selectinload(Location.updated_by),
                selectinload(Location.deleted_by),
                selectinload(Location.organizations).selectinload(Organization.created_by),
                selectinload(Location.organizations).selectinload(Organization.updated_by),
                selectinload(Location.organizations).selectinload(Organization.deleted_by),
                selectinload(Location.compute_registries).selectinload(ComputeRegistry.created_by),
                selectinload(Location.compute_registries).selectinload(ComputeRegistry.updated_by),
                selectinload(Location.compute_registries).selectinload(ComputeRegistry.deleted_by),
                selectinload(Location.database_registries).selectinload(DatabaseRegistry.created_by),
                selectinload(Location.database_registries).selectinload(DatabaseRegistry.updated_by),
                selectinload(Location.database_registries).selectinload(DatabaseRegistry.deleted_by),
                selectinload(Location.storage_registries).selectinload(StorageRegistry.created_by),
                selectinload(Location.storage_registries).selectinload(StorageRegistry.updated_by),
                selectinload(Location.storage_registries).selectinload(StorageRegistry.deleted_by),
            ).where(Location.deleted_at.is_(None))
            result = await session.execute(statement)
            locations = list(result.scalars().all())
            for location in locations:
                location.organizations = [organization for organization in location.organizations if organization.deleted_at is None]
                location.compute_registries = [registry for registry in location.compute_registries if registry.deleted_at is None]
                location.database_registries = [registry for registry in location.database_registries if registry.deleted_at is None]
                location.storage_registries = [registry for registry in location.storage_registries if registry.deleted_at is None]

            return locations

    async def get(self, location_id: UUID | str) -> Location | None:
        """Return one location by id."""

        async with session_scope() as session:
            if isinstance(location_id, str):
                location_id = UUID(location_id)

            statement = select(Location).options(
                selectinload(Location.created_by),
                selectinload(Location.updated_by),
                selectinload(Location.deleted_by),
                selectinload(Location.organizations).selectinload(Organization.created_by),
                selectinload(Location.organizations).selectinload(Organization.updated_by),
                selectinload(Location.organizations).selectinload(Organization.deleted_by),
                selectinload(Location.compute_registries).selectinload(ComputeRegistry.created_by),
                selectinload(Location.compute_registries).selectinload(ComputeRegistry.updated_by),
                selectinload(Location.compute_registries).selectinload(ComputeRegistry.deleted_by),
                selectinload(Location.database_registries).selectinload(DatabaseRegistry.created_by),
                selectinload(Location.database_registries).selectinload(DatabaseRegistry.updated_by),
                selectinload(Location.database_registries).selectinload(DatabaseRegistry.deleted_by),
                selectinload(Location.storage_registries).selectinload(StorageRegistry.created_by),
                selectinload(Location.storage_registries).selectinload(StorageRegistry.updated_by),
                selectinload(Location.storage_registries).selectinload(StorageRegistry.deleted_by),
            ).where(Location.id == location_id, Location.deleted_at.is_(None))
            result = await session.execute(statement)
            location = result.scalar_one_or_none()
            if location is None:
                return None

            location.organizations = [organization for organization in location.organizations if organization.deleted_at is None]
            location.compute_registries = [registry for registry in location.compute_registries if registry.deleted_at is None]
            location.database_registries = [registry for registry in location.database_registries if registry.deleted_at is None]
            location.storage_registries = [registry for registry in location.storage_registries if registry.deleted_at is None]
            return location

    async def create(self, slug: str, name: str, user: User, country: Country | None = None) -> Location:
        """Create one location."""

        async with session_scope() as session:
            # Omit the column when no country is provided so the database default applies.
            location_kwargs: dict[str, str | Country] = {
                "name": name,
                "slug": slug,
            }
            if country is not None:
                location_kwargs["country"] = country

            location = Location(**location_kwargs)
            location.created_id = user.id
            location.updated_id = user.id
            session.add(location)
            await session.commit()
            await session.refresh(location)

            result = await session.execute(
                select(Location).options(
                    selectinload(Location.created_by),
                    selectinload(Location.updated_by),
                    selectinload(Location.deleted_by),
                    selectinload(Location.organizations).selectinload(Organization.created_by),
                    selectinload(Location.organizations).selectinload(Organization.updated_by),
                    selectinload(Location.organizations).selectinload(Organization.deleted_by),
                    selectinload(Location.compute_registries).selectinload(ComputeRegistry.created_by),
                    selectinload(Location.compute_registries).selectinload(ComputeRegistry.updated_by),
                    selectinload(Location.compute_registries).selectinload(ComputeRegistry.deleted_by),
                    selectinload(Location.database_registries).selectinload(DatabaseRegistry.created_by),
                    selectinload(Location.database_registries).selectinload(DatabaseRegistry.updated_by),
                    selectinload(Location.database_registries).selectinload(DatabaseRegistry.deleted_by),
                    selectinload(Location.storage_registries).selectinload(StorageRegistry.created_by),
                    selectinload(Location.storage_registries).selectinload(StorageRegistry.updated_by),
                    selectinload(Location.storage_registries).selectinload(StorageRegistry.deleted_by),
                ).where(Location.id == location.id)
            )
            location = result.scalar_one()
            location.organizations = [organization for organization in location.organizations if organization.deleted_at is None]
            location.compute_registries = [registry for registry in location.compute_registries if registry.deleted_at is None]
            location.database_registries = [registry for registry in location.database_registries if registry.deleted_at is None]
            location.storage_registries = [registry for registry in location.storage_registries if registry.deleted_at is None]
            return location

    async def delete(self, location_id: UUID | str, deleted_id: UUID | str | None = None) -> Location | None:
        """Mark one location as deleted."""

        async with session_scope() as session:
            if isinstance(location_id, str):
                location_id = UUID(location_id)
            if isinstance(deleted_id, str):
                deleted_id = UUID(deleted_id)

            result = await session.execute(select(Location).where(Location.id == location_id, Location.deleted_at.is_(None)))
            location = result.scalar_one_or_none()
            if location is None:
                return None

            location.deleted_at = datetime.now(UTC)
            location.deleted_id = deleted_id
            location.updated_id = deleted_id
            await session.commit()
            await session.refresh(location)
            return location


locations = LocationsService()
