from .base import ServiceBase
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.database.models import ComputeRegistry, DatabaseRegistry, Location, Org
from src.models.countries import Country


class LocationsService(ServiceBase):
    """Manage location records."""

    async def list(self) -> list[Location]:
        """Return all registered locations."""

        async with self.session() as session:
            statement = select(Location).options(
                selectinload(Location.orgs).selectinload(Org.created_by),
                selectinload(Location.orgs).selectinload(Org.updated_by),
                selectinload(Location.orgs).selectinload(Org.deleted_by),
                selectinload(Location.compute_registries).selectinload(ComputeRegistry.deleted_by),
                selectinload(Location.database_registries).selectinload(DatabaseRegistry.deleted_by),
                selectinload(Location.storage_registries),
            )
            result = await session.execute(statement)
            return result.scalars().all()

    async def get(self, location_id: int) -> Location | None:
        """Return one location by id."""

        async with self.session() as session:
            statement = select(Location).options(
                selectinload(Location.orgs).selectinload(Org.created_by),
                selectinload(Location.orgs).selectinload(Org.updated_by),
                selectinload(Location.orgs).selectinload(Org.deleted_by),
                selectinload(Location.compute_registries).selectinload(ComputeRegistry.deleted_by),
                selectinload(Location.database_registries).selectinload(DatabaseRegistry.deleted_by),
                selectinload(Location.storage_registries),
            ).where(Location.id == location_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(self, name: str, display_name: str, country: Country | None = None) -> Location:
        """Create one location."""

        async with self.session() as session:
            # Omit the column when no country is provided so the database default applies.
            location_kwargs: dict[str, str | Country] = {
                "name": name,
                "display_name": display_name,
            }
            if country is not None:
                location_kwargs["country"] = country

            location = Location(**location_kwargs)
            session.add(location)
            await session.commit()
            await session.refresh(location)

            result = await session.execute(
                select(Location).options(
                    selectinload(Location.orgs).selectinload(Org.created_by),
                    selectinload(Location.orgs).selectinload(Org.updated_by),
                    selectinload(Location.orgs).selectinload(Org.deleted_by),
                    selectinload(Location.compute_registries).selectinload(ComputeRegistry.deleted_by),
                    selectinload(Location.database_registries).selectinload(DatabaseRegistry.deleted_by),
                    selectinload(Location.storage_registries),
                ).where(Location.id == location.id)
            )
            return result.scalar_one()

    async def delete(self, location_id: int) -> Location | None:
        """Delete one location."""

        async with self.session() as session:
            result = await session.execute(select(Location).where(Location.id == location_id))
            location = result.scalar_one_or_none()
            if location is None:
                return None

            await session.delete(location)
            await session.commit()
            return location
