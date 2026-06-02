from __future__ import annotations

from .base import ServiceBase
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload
from src.db.models import App, Location, Org, User
from sqlalchemy.exc import IntegrityError
from src.models.roles import Roles
from src.db.models.association import UserOrganization


class OrgsService(ServiceBase):
    """Manage org records."""

    async def list(self) -> list[Org]:
        """Return all orgs in the database."""

        async with self.session() as session:
            statement = select(Org).options(
                selectinload(Org.created_by),
                selectinload(Org.updated_by),
                selectinload(Org.deleted_by),
            )
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, name: str) -> Org | None:
        """Return one org by name."""

        async with self.session() as session:
            statement = select(Org).options(
                selectinload(Org.users),
                selectinload(Org.apps).selectinload(App.created_by),
                selectinload(Org.apps).selectinload(App.updated_by),
                selectinload(Org.apps).selectinload(App.deleted_by),
                selectinload(Org.created_by),
                selectinload(Org.updated_by),
                selectinload(Org.deleted_by),
                selectinload(Org.location).selectinload(Location.orgs).selectinload(Org.created_by),
                selectinload(Org.location).selectinload(Location.orgs).selectinload(Org.updated_by),
                selectinload(Org.location).selectinload(Location.orgs).selectinload(Org.deleted_by),
                selectinload(Org.location).selectinload(Location.compute_registries),
                selectinload(Org.location).selectinload(Location.database_registries),
                selectinload(Org.location).selectinload(Location.storage_registries),
            ).where(Org.name == name)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(self, name: str, location_id: int, user: User | None = None) -> Org:
        """Create an org."""

        async with self.session() as session:
            organization = Org(name=name, location_id=location_id)
            if user is not None:
                organization.created_by_id = user.id
                organization.updated_by_id = user.id
                session.add(
                    UserOrganization(
                        user_id=user.id,
                        organization_name=organization.name,
                        role_name=Roles.owner,
                    )
                )
            session.add(organization)

            try:
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise ValueError("Org already exists") from exc

            await session.refresh(organization)
            return organization

    async def delete(self, name: str) -> Org | None:
        """Delete one org by name."""

        async with self.session() as session:
            result = await session.execute(select(Org).where(Org.name == name))
            organization = result.scalar_one_or_none()
            if organization is None:
                return None

            # Remove the org apps first because apps are stored in a separate table.
            await session.execute(delete(App).where(App.organization == name))
            await session.delete(organization)
            await session.commit()
            return organization
