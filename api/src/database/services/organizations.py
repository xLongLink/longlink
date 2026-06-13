from __future__ import annotations

from .base import ServiceBase
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.roles import Roles
from src.database.models.organizations import Organization
from src.database.models.applications import Application
from src.database.models.users import User
from src.database.models.compute import ComputeRegistry
from src.database.models.database import DatabaseRegistry
from src.database.models.location import Location
from src.database.models.storage import StorageRegistry
from src.database.models.association import UserOrganization
from src.database.models.association import UserApplication


class OrgsService(ServiceBase):
    """Manage org records."""

    async def list(self) -> list[Organization]:
        """Return all organizations in the database."""

        async with self.session() as session:
            statement = select(Organization).options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
            )
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, organization_id: str) -> Organization | None:
        """Return one organization by id."""

        async with self.session() as session:
            statement = select(Organization).options(
                selectinload(Organization.users),
                selectinload(Organization.applications).selectinload(Application.organization),
                selectinload(Organization.applications).selectinload(Application.created_by),
                selectinload(Organization.applications).selectinload(Application.updated_by),
                selectinload(Organization.applications).selectinload(Application.deleted_by),
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
                selectinload(Organization.location).selectinload(Location.organizations).selectinload(Organization.created_by),
                selectinload(Organization.location).selectinload(Location.organizations).selectinload(Organization.updated_by),
                selectinload(Organization.location).selectinload(Location.organizations).selectinload(Organization.deleted_by),
                selectinload(Organization.location).selectinload(Location.compute_registries).selectinload(ComputeRegistry.created_by),
                selectinload(Organization.location).selectinload(Location.compute_registries).selectinload(ComputeRegistry.updated_by),
                selectinload(Organization.location).selectinload(Location.compute_registries).selectinload(ComputeRegistry.deleted_by),
                selectinload(Organization.location).selectinload(Location.database_registries).selectinload(DatabaseRegistry.created_by),
                selectinload(Organization.location).selectinload(Location.database_registries).selectinload(DatabaseRegistry.updated_by),
                selectinload(Organization.location).selectinload(Location.database_registries).selectinload(DatabaseRegistry.deleted_by),
                selectinload(Organization.location).selectinload(Location.storage_registries).selectinload(StorageRegistry.created_by),
                selectinload(Organization.location).selectinload(Location.storage_registries).selectinload(StorageRegistry.updated_by),
                selectinload(Organization.location).selectinload(Location.storage_registries).selectinload(StorageRegistry.deleted_by),
            ).where(Organization.id == organization_id)
            result = await session.execute(statement)
            organization = result.scalar_one_or_none()
            if organization is not None:
                organization.applications = [application for application in organization.applications if application.deleted_at is None]
            return organization

    async def create(self, name: str, location_id: str, user: User | None = None, avatar: str | None = None) -> Organization:
        """Create an organization."""

        async with self.session() as session:
            organization = Organization(name=name, avatar=avatar, location_id=location_id)
            if user is not None:
                # Attach the creator as the initial owner when the caller is authenticated.
                organization.created_id = user.id
                organization.updated_id = user.id
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
                raise ValueError("Organization already exists") from exc

            await session.refresh(organization)
            statement = select(Organization).options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
            ).where(Organization.id == organization.id)
            result = await session.execute(statement)
            return result.scalar_one()

    async def delete(self, organization_id: str) -> Organization | None:
        """Delete one organization by id."""

        async with self.session() as session:
            result = await session.execute(select(Organization).where(Organization.id == organization_id))
            organization = result.scalar_one_or_none()
            if organization is None:
                return None

            # Remove the organization memberships first because applications live in a separate table.
            await session.execute(delete(UserOrganization).where(UserOrganization.organization_id == organization_id))
            await session.execute(delete(UserApplication).where(UserApplication.organization_id == organization_id))
            await session.execute(delete(Application).where(Application.organization_id == organization_id))
            await session.delete(organization)
            await session.commit()
            return organization


organizations = OrgsService()
