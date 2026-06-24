from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy import select
from src.database.session import session_scope
from src.models.countries import Country
from src.models.locations import LocationProvider
from src.database.models.users import User
from src.database.models.locations import Location


class LocationsService:
    """Manage location records."""

    async def list(self) -> list[Location]:
        """Return all registered locations."""

        async with session_scope() as session:
            statement = select(Location).where(Location.deleted_at.is_(None))
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, location_id: UUID) -> Location | None:
        """Return one location by id."""

        async with session_scope() as session:
            statement = select(Location).where(Location.id == location_id, Location.deleted_at.is_(None))
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(
        self,
        slug: str,
        name: str,
        user: User,
        country: Country,
        provider: LocationProvider = LocationProvider.local,
    ) -> Location:
        """Create one location."""

        async with session_scope() as session:
            location = Location(name=name, slug=slug, country=country, provider=provider)
            location.created_id = user.id
            location.updated_id = user.id
            session.add(location)
            await session.commit()
            await session.refresh(location)
            return location

    async def delete(self, location_id: UUID, deleted_id: UUID | None = None) -> Location | None:
        """Mark one location as deleted."""

        async with session_scope() as session:
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
