from __future__ import annotations

from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.utils.utils import slugify
from src.models.roles import OrganizationRoles
from src.models.users import UserSummary
from src.database.session import session_scope
from src.models.locations import LocationResponse
from src.models.organizations import (OrganizationDetails,
                                      OrganizationInvitationResponse,
                                      OrganizationMemberSummary,
                                      OrganizationApplicationResponse)
from src.database.services.applications import applications
from src.database.services.invitations import invitations
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization
from src.database.models.applications import Application
from src.database.models.organizations import Organization


class OrganizationsService:
    """Manage organization records."""

    async def list(self) -> list[Organization]:
        """Return all organizations in the database."""

        async with session_scope() as session:
            statement = select(Organization).options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
            ).where(Organization.deleted_at.is_(None))
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, organization_id: UUID) -> OrganizationDetails | None:
        """Return one organization by id."""

        async with session_scope() as session:
            statement = select(Organization).options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
                selectinload(Organization.location),
            ).where(Organization.id == organization_id, Organization.deleted_at.is_(None))
            result = await session.execute(statement)
            organization = result.scalar_one_or_none()
            if organization is None:
                return None

            active_applications = await applications.list_by_organization(organization.id)
            active_invitations = await invitations.list_by_organization(organization.id)

            memberships_result = await session.execute(
                select(User, UserOrganization.role_name, UserOrganization.updated_at)
                .join(UserOrganization, UserOrganization.user_id == User.id)
                .where(UserOrganization.organization_id == organization.id, UserOrganization.deleted_at.is_(None))
            )
            members = [
                OrganizationMemberSummary(
                    id=user.id,
                    name=user.name,
                    email=user.email,
                    avatar=user.avatar or "",
                    role=role_name,
                    last_access_at=updated_at,
                )
                for user, role_name, updated_at in memberships_result.all()
            ]

            return OrganizationDetails(
                id=organization.id,
                name=organization.name,
                slug=organization.slug,
                avatar=organization.avatar,
                location=LocationResponse.model_validate(organization.location),
                location_id=organization.location_id,
                created_at=organization.created_at,
                updated_at=organization.updated_at,
                created_by=UserSummary.model_validate(organization.created_by),
                updated_by=UserSummary.model_validate(organization.updated_by),
                deleted_at=organization.deleted_at,
                deleted_by=UserSummary.model_validate(organization.deleted_by) if organization.deleted_by is not None else None,
                users=members,
                invitations=[OrganizationInvitationResponse.model_validate(invitation) for invitation in active_invitations],
                applications=[OrganizationApplicationResponse.model_validate(application) for application in active_applications],
            )

    async def membership_role(self, organization_id: UUID, user_id: UUID) -> OrganizationRoles | None:
        """Return one member role for an organization."""

        async with session_scope() as session:
            statement = select(UserOrganization.role_name).where(
                UserOrganization.organization_id == organization_id,
                UserOrganization.user_id == user_id,
                UserOrganization.deleted_at.is_(None),
            )
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(self, name: str, location_id: UUID, user: User, avatar: str | None = None) -> Organization:
        """Create an organization."""

        async with session_scope() as session:
            organization = Organization(name=name, slug=slugify(name), avatar=avatar or "", location_id=location_id)
            # Attach the creator as the initial owner for every organization.
            organization.created_id = user.id
            organization.updated_id = user.id
            session.add(
                UserOrganization(
                    user_id=user.id,
                    organization_id=organization.id,
                    role_name=OrganizationRoles.owner,
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
                raise ValueError("Organization already exists") from exc

            await session.refresh(organization)
            statement = select(Organization).options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
                selectinload(Organization.location),
            ).where(Organization.id == organization.id)
            result = await session.execute(statement)
            return result.scalar_one()

    async def delete(self, organization_id: UUID, deleted_id: UUID | None = None) -> Organization | None:
        """Mark one organization as deleted."""

        async with session_scope() as session:
            result = await session.execute(select(Organization).where(Organization.id == organization_id, Organization.deleted_at.is_(None)))
            organization = result.scalar_one_or_none()
            if organization is None:
                return None

            # Mark the organization tree as deleted instead of removing the audit trail.
            memberships_result = await session.execute(select(UserOrganization).where(UserOrganization.organization_id == organization_id))
            for membership in memberships_result.scalars().all():
                membership.deleted_at = datetime.now(UTC)
                membership.deleted_id = deleted_id
                membership.updated_id = deleted_id

            application_memberships_result = await session.execute(select(UserApplication).where(UserApplication.organization_id == organization_id))
            for membership in application_memberships_result.scalars().all():
                membership.deleted_at = datetime.now(UTC)
                membership.deleted_id = deleted_id
                membership.updated_id = deleted_id

            applications_result = await session.execute(select(Application).where(Application.organization_id == organization_id, Application.deleted_at.is_(None)))
            for application in applications_result.scalars().all():
                application.deleted_at = datetime.now(UTC)
                application.deleted_id = deleted_id
                application.updated_id = deleted_id

            organization.deleted_at = datetime.now(UTC)
            organization.deleted_id = deleted_id
            organization.updated_id = deleted_id
            await session.commit()
            await session.refresh(organization)
            return organization


organizations = OrganizationsService()
