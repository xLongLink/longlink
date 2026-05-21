from sqlalchemy import select
from src.db.models import Organization
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from .base import ServiceBase


class OrganizationsService(ServiceBase):
    """Manage organization records."""

    async def list(self) -> list[Organization]:
        """Return all organizations in the database."""

        async with self.session() as session:
            result = await session.execute(select(Organization))
            return list(result.scalars().all())

    async def get(self, name: str) -> Organization | None:
        """Return one organization by name."""

        async with self.session() as session:
            statement = select(Organization).options(selectinload(Organization.users)).where(Organization.name == name)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(self, name: str) -> Organization:
        """Create an organization."""

        async with self.session() as session:
            organization = Organization(name=name)
            session.add(organization)

            try:
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise ValueError("Organization already exists") from exc

            await session.refresh(organization)
            return organization

    async def delete(self, name: str) -> Organization | None:
        """Delete one organization by name."""

        async with self.session() as session:
            result = await session.execute(select(Organization).where(Organization.name == name))
            organization = result.scalar_one_or_none()
            if organization is None:
                return None

            await session.delete(organization)
            await session.commit()
            return organization
