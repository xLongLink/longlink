from uuid import UUID
from typing import Any
from datetime import UTC, datetime
from src.utils import names
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.roles import OrganizationRoles
from src.models.users import UserSummary
from src.utils.namespace import dbname, k8name, s3name
from src.database.session import session_scope
from src.models.locations import LocationResponse
from src.models.organizations import (OrganizationDetails,
                                      OrganizationMemberSummary,
                                      OrganizationInvitationResponse,
                                      OrganizationApplicationResponse)
from src.database.models.users import User
from src.adapters.database.shared import SharedUser
from src.database.models.association import UserApplication, UserOrganization
from src.database.models.invitations import OrganizationInvitation
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


    async def list_by_user(self, user_id: UUID) -> list[Organization]:
        """Return all active organizations for one active member."""

        async with session_scope() as session:
            statement = (
                select(Organization)
                .join(UserOrganization, UserOrganization.organization_id == Organization.id)
                .options(selectinload(Organization.location))
                .where(
                    UserOrganization.user_id == user_id,
                    UserOrganization.deleted_at.is_(None),
                    Organization.deleted_at.is_(None),
                )
            )
            result = await session.execute(statement)
            return list(result.scalars().all())


    async def database_users(self, organization_id: UUID) -> list[SharedUser]:
        """Return active organization members for the shared users table."""

        async with session_scope() as session:
            statement = (
                select(User, UserOrganization.role_name, UserOrganization.created_at, UserOrganization.updated_at)
                .join(UserOrganization, UserOrganization.user_id == User.id)
                .where(
                    UserOrganization.organization_id == organization_id,
                    UserOrganization.deleted_at.is_(None),
                    User.deleted_at.is_(None),
                )
                .order_by(User.email)
            )
            result = await session.execute(statement)
            rows = result.all()

            return [
                SharedUser(
                    id=user.id,
                    name=user.name,
                    email=user.email,
                    avatar=user.avatar or "",
                    role_name=role_name.value,
                    created_at=created_at,
                    updated_at=max(user.updated_at, updated_at),
                )
                for user, role_name, created_at, updated_at in rows
            ]


    async def get(
        self,
        organization_id: UUID,
        include_deleted: bool = False,
        application_user_id: UUID | None = None,
    ) -> OrganizationDetails | None:
        """Return one organization by id."""

        async with session_scope() as session:
            conditions = [Organization.id == organization_id]
            if not include_deleted:
                conditions.append(Organization.deleted_at.is_(None))

            statement = select(Organization).options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
                selectinload(Organization.location),
            ).where(*conditions)
            result = await session.execute(statement)
            organization = result.scalar_one_or_none()
            if organization is None:
                return None

            applications_result = await session.execute(
                select(Application)
                .options(
                    selectinload(Application.created_by),
                    selectinload(Application.updated_by),
                    selectinload(Application.deleted_by),
                )
                .where(Application.organization_id == organization.id, Application.deleted_at.is_(None))
                .order_by(Application.name)
            )
            active_applications = list(applications_result.scalars().all())
            application_roles = await self._application_roles(session, organization.id, application_user_id)

            invitations_result = await session.execute(
                select(OrganizationInvitation)
                .where(
                    OrganizationInvitation.organization_id == organization.id,
                    OrganizationInvitation.deleted_at.is_(None),
                )
                .order_by(OrganizationInvitation.created_at.desc())
            )
            active_invitations = list(invitations_result.scalars().all())

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
                applications=[
                    OrganizationApplicationResponse.model_validate(
                        {
                            **application.model_dump(),
                            "created_by": application.created_by,
                            "updated_by": application.updated_by,
                            "deleted_by": application.deleted_by,
                            "role": application_roles.get(application.id),
                        }
                    )
                    for application in active_applications
                ],
            )


    async def _application_roles(
        self,
        session: Any,
        organization_id: UUID,
        user_id: UUID | None,
    ) -> dict[UUID, Any]:
        """Return application roles keyed by application id for one user."""

        if user_id is None:
            return {}

        result = await session.execute(
            select(UserApplication.application_id, UserApplication.role_name).where(
                UserApplication.organization_id == organization_id,
                UserApplication.user_id == user_id,
                UserApplication.deleted_at.is_(None),
            )
        )
        return dict(result.all())

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


    async def update_member_role(
        self,
        organization_id: UUID,
        member_id: UUID,
        role: OrganizationRoles,
        user: User,
    ) -> bool:
        """Update one active organization member role."""

        async with session_scope() as session:
            statement = (
                select(UserOrganization)
                .join(User, User.id == UserOrganization.user_id)
                .where(
                    UserOrganization.organization_id == organization_id,
                    UserOrganization.user_id == member_id,
                    UserOrganization.deleted_at.is_(None),
                    User.deleted_at.is_(None),
                )
            )
            result = await session.execute(statement)
            membership = result.scalar_one_or_none()
            if membership is None:
                return False

            membership.updated_at = datetime.now(UTC)
            membership.updated_id = user.id
            membership.role_name = role
            await session.commit()
            return True

    async def create(self, name: str, location_id: UUID, user: User, avatar: str | None = None) -> Organization:
        """Create an organization."""

        async with session_scope() as session:
            slug = names.slugify(name, "Organization")
            k8name(slug)
            dbname(slug)
            s3name(f"{slug}-shared")
            organization = Organization(name=name, slug=slug, avatar=avatar or "", location_id=location_id)
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


    async def soft_delete(self, organization_id: UUID, user: User) -> Organization | None:
        """Soft-delete an organization and all nested access rows."""

        async with session_scope() as session:
            organization = await session.get(Organization, organization_id)
            if organization is None or organization.deleted_at is not None:
                return None

            now = datetime.now(UTC)
            organization.deleted_at = now
            organization.deleted_id = user.id
            organization.updated_at = now
            organization.updated_id = user.id

            applications_result = await session.execute(
                select(Application).where(
                    Application.organization_id == organization_id,
                    Application.deleted_at.is_(None),
                )
            )
            for application in applications_result.scalars().all():
                application.deleted_at = now
                application.deleted_id = user.id
                application.updated_at = now
                application.updated_id = user.id

            user_applications_result = await session.execute(
                select(UserApplication).where(
                    UserApplication.organization_id == organization_id,
                    UserApplication.deleted_at.is_(None),
                )
            )
            for membership in user_applications_result.scalars().all():
                membership.deleted_at = now
                membership.deleted_id = user.id
                membership.updated_at = now
                membership.updated_id = user.id

            user_organizations_result = await session.execute(
                select(UserOrganization).where(
                    UserOrganization.organization_id == organization_id,
                    UserOrganization.deleted_at.is_(None),
                )
            )
            for membership in user_organizations_result.scalars().all():
                membership.deleted_at = now
                membership.deleted_id = user.id
                membership.updated_at = now
                membership.updated_id = user.id

            invitations_result = await session.execute(
                select(OrganizationInvitation).where(
                    OrganizationInvitation.organization_id == organization_id,
                    OrganizationInvitation.deleted_at.is_(None),
                )
            )
            for invitation in invitations_result.scalars().all():
                invitation.deleted_at = now
                invitation.deleted_id = user.id
                invitation.updated_at = now
                invitation.updated_id = user.id

            await session.commit()
            await session.refresh(organization)
            return organization

organizations = OrganizationsService()
