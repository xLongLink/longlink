from __future__ import annotations

from .base import ServiceBase
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.roles import Roles
from src.database.models.organizations import Org
from src.database.models.applications import App
from src.database.models.users import User
from src.database.models.compute import ComputeRegistry
from src.database.models.database import DatabaseRegistry
from src.database.models.location import Location
from src.database.models.association import UserOrganization
from src.database.models.association import UserApp


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

    async def get(self, org_id: str) -> Org | None:
        """Return one org by id."""

        async with self.session() as session:
            statement = select(Org).options(
                selectinload(Org.users),
                selectinload(Org.apps).selectinload(App.organization_rel),
                selectinload(Org.apps).selectinload(App.created_by),
                selectinload(Org.apps).selectinload(App.updated_by),
                selectinload(Org.apps).selectinload(App.deleted_by),
                selectinload(Org.created_by),
                selectinload(Org.updated_by),
                selectinload(Org.deleted_by),
                selectinload(Org.location).selectinload(Location.orgs).selectinload(Org.created_by),
                selectinload(Org.location).selectinload(Location.orgs).selectinload(Org.updated_by),
                selectinload(Org.location).selectinload(Location.orgs).selectinload(Org.deleted_by),
                selectinload(Org.location).selectinload(Location.compute_registries).selectinload(ComputeRegistry.deleted_by),
                selectinload(Org.location).selectinload(Location.database_registries).selectinload(DatabaseRegistry.deleted_by),
                selectinload(Org.location).selectinload(Location.storage_registries),
            ).where(Org.id == org_id)
            result = await session.execute(statement)
            org = result.scalar_one_or_none()
            if org is not None:
                org.apps = [app for app in org.apps if app.deleted_at is None]
            return org

    async def create(self, name: str, location_id: str, user: User | None = None, avatar: str | None = None) -> Org:
        """Create an org."""

        async with self.session() as session:
            organization = Org(name=name, avatar=avatar, location_id=location_id)
            if user is not None:
                # Attach the creator as the initial owner when the caller is authenticated.
                organization.created_by_id = user.id
                organization.updated_by_id = user.id
                session.add(
                    UserOrganization(
                        user_id=user.id,
                        organization_id=organization.id,
                        role_name=Roles.owner,
                    )
                )
            session.add(organization)

            try:
                await session.commit()
            except IntegrityError as exc:
                # Keep name collisions at the service boundary as a simple value error.
                await session.rollback()
                raise ValueError("Org already exists") from exc

            await session.refresh(organization)
            statement = select(Org).options(
                selectinload(Org.created_by),
                selectinload(Org.updated_by),
                selectinload(Org.deleted_by),
            ).where(Org.id == organization.id)
            result = await session.execute(statement)
            return result.scalar_one()

    async def delete(self, org_id: str) -> Org | None:
        """Delete one org by id."""

        async with self.session() as session:
            result = await session.execute(select(Org).where(Org.id == org_id))
            organization = result.scalar_one_or_none()
            if organization is None:
                return None

            # Remove the org apps first because apps are stored in a separate table.
            await session.execute(delete(UserOrganization).where(UserOrganization.organization_id == org_id))
            await session.execute(delete(UserApp).where(UserApp.organization_id == org_id))
            await session.execute(delete(App).where(App.organization_id == org_id))
            await session.delete(organization)
            await session.commit()
            return organization


orgs = OrgsService()
