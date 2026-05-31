from sqlalchemy import select
from src.db.models import Location

from .base import ServiceBase


class LocationsService(ServiceBase):
    """Manage location records."""

    async def list(self) -> list[Location]:
        """Return all registered locations."""

        async with self.session() as session:
            result = await session.execute(select(Location))
            return list(result.scalars().all())

    async def get(self, location_id: int) -> Location | None:
        """Return one location by id."""

        async with self.session() as session:
            result = await session.execute(select(Location).where(Location.id == location_id))
            return result.scalar_one_or_none()

    async def create(self, name: str, display_name: str) -> Location:
        """Create one location."""

        async with self.session() as session:
            location = Location(name=name, display_name=display_name)
            session.add(location)
            await session.commit()
            await session.refresh(location)
            return location

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
