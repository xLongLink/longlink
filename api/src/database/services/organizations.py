from __future__ import annotations

from uuid import UUID

from .base import ServiceBase
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.database.models.__base__ import utcnow
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
            ).where(Organization.deleted_at.is_(None))
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, organization_id: UUID | str) -> Organization | None:
        """Return one organization by id."""

        async with self.session() as session:
            if isinstance(organization_id, str):
                organization_id = UUID(organization_id)

            statement = select(Organization).options(
                selectinload(Organization.users),
                selectinload(Organization.applications).selectinload(Application.organization),
                selectinload(Organization.applications).selectinload(Application.created_by),
                selectinload(Organization.applications).selectinload(Application.updated_by),
                selectinload(Organization.applications).selectinload(Application.deleted_by),
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
                selectinload(Organization.location).selectinload(Location.created_by),
                selectinload(Organization.location).selectinload(Location.updated_by),
                selectinload(Organization.location).selectinload(Location.deleted_by),
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
            ).where(Organization.id == organization_id, Organization.deleted_at.is_(None))
            result = await session.execute(statement)
            organization = result.scalar_one_or_none()
            if organization is not None:
                organization.applications = [application for application in organization.applications if application.deleted_at is None]
                organization.location.organizations = [item for item in organization.location.organizations if item.deleted_at is None]
                organization.location.compute_registries = [registry for registry in organization.location.compute_registries if registry.deleted_at is None]
                organization.location.database_registries = [registry for registry in organization.location.database_registries if registry.deleted_at is None]
                organization.location.storage_registries = [registry for registry in organization.location.storage_registries if registry.deleted_at is None]
            return organization

    async def create(self, name: str, location_id: UUID | str, user: User | None = None, avatar: str | None = None) -> Organization:
        """Create an organization."""

        async with self.session() as session:
            if isinstance(location_id, str):
                location_id = UUID(location_id)

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
                        created_id=user.id,
                        updated_id=user.id,
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
            statement = select(Organization).options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
            ).where(Organization.id == organization.id)
            result = await session.execute(statement)
            return result.scalar_one()

    async def delete(self, organization_id: UUID | str, deleted_id: UUID | str | None = None) -> Organization | None:
        """Mark one organization as deleted."""

        async with self.session() as session:
            if isinstance(organization_id, str):
                organization_id = UUID(organization_id)
            if isinstance(deleted_id, str):
                deleted_id = UUID(deleted_id)

            result = await session.execute(select(Organization).where(Organization.id == organization_id, Organization.deleted_at.is_(None)))
            organization = result.scalar_one_or_none()
            if organization is None:
                return None

            # Mark the organization tree as deleted instead of removing the audit trail.
            memberships_result = await session.execute(select(UserOrganization).where(UserOrganization.organization_id == organization_id))
            for membership in memberships_result.scalars().all():
                membership.deleted_at = utcnow()
                membership.deleted_id = deleted_id
                membership.updated_id = deleted_id

            app_memberships_result = await session.execute(select(UserApplication).where(UserApplication.organization_id == organization_id))
            for membership in app_memberships_result.scalars().all():
                membership.deleted_at = utcnow()
                membership.deleted_id = deleted_id
                membership.updated_id = deleted_id

            applications_result = await session.execute(select(Application).where(Application.organization_id == organization_id, Application.deleted_at.is_(None)))
            for application in applications_result.scalars().all():
                application.deleted_at = utcnow()
                application.deleted_id = deleted_id
                application.updated_id = deleted_id

            organization.deleted_at = utcnow()
            organization.deleted_id = deleted_id
            organization.updated_id = deleted_id
            await session.commit()
            await session.refresh(organization)
            return organization


organizations = OrgsService()
