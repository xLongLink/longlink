from __future__ import annotations

from uuid import UUID
from datetime import UTC, datetime
from src.utils import names
from src.utils import gateway
from src.utils import buckets
from sqlalchemy import select
from tenant.models import User as TenantUser
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.roles import OrganizationRoles
from src.models.users import UserSummary
from src.utils.namespace import dbname, k8name
from src.database.session import session_scope
from src.models.locations import LocationResponse
from src.models.organizations import (
    OrganizationDetails,
    OrganizationMemberSummary,
    OrganizationInvitationResponse,
    OrganizationApplicationResponse,
)
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def fetch_all() -> list[Organization]:
    """Return all organizations in the database."""

    async with session_scope() as session:
        statement = (
            select(Organization)
            .options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
            )
            .where(Organization.deleted_at.is_(None))
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def list_by_user(user_id: UUID) -> list[Organization]:
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
        return result.scalars().all()


async def get_member(organization_id: UUID, user_id: UUID) -> Organization | None:
    """Return one active organization for an active member without details."""

    async with session_scope() as session:
        # Join membership in the access check so non-members and missing organizations look identical.
        statement = (
            select(Organization)
            .join(UserOrganization, UserOrganization.organization_id == Organization.id)
            .where(
                Organization.id == organization_id,
                Organization.deleted_at.is_(None),
                UserOrganization.user_id == user_id,
                UserOrganization.deleted_at.is_(None),
            )
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def database_users(organization_id: UUID) -> list[TenantUser]:
    """Return active organization members for shared user synchronization."""

    async with session_scope() as session:
        statement = (
            select(
                User,
                UserOrganization.role_name,
                UserOrganization.created_at,
                UserOrganization.updated_at,
            )
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
            TenantUser(
                id=user.id,
                name=user.name,
                email=user.email,
                avatar=user.avatar or "",
                role=role_name.value,
                created_at=created_at,
                updated_at=max(user.updated_at, updated_at),
            )
            for user, role_name, created_at, updated_at in rows
        ]


async def get(
    organization_id: UUID,
    include_deleted: bool = False,
    application_user_id: UUID | None = None,
) -> OrganizationDetails | None:
    """Return one organization by id."""

    async with session_scope() as session:
        conditions = [Organization.id == organization_id]
        if not include_deleted:
            conditions.append(Organization.deleted_at.is_(None))

        statement = (
            select(Organization)
            .options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
                selectinload(Organization.location),
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        organization = result.scalar_one_or_none()
        if organization is None:
            return None

        applications_result = await session.execute(
            select(Application)
            .options(
                selectinload(Application.compute_registry),
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(
                Application.organization_id == organization.id,
                Application.deleted_at.is_(None),
            )
            .order_by(Application.name)
        )
        active_applications = applications_result.scalars().all()
        application_roles = {}
        caller_organization_role = None
        if application_user_id is not None:
            role_result = await session.execute(
                select(UserOrganization.role_name).where(
                    UserOrganization.organization_id == organization.id,
                    UserOrganization.user_id == application_user_id,
                    UserOrganization.deleted_at.is_(None),
                )
            )
            caller_organization_role = role_result.scalar_one_or_none()
            roles_result = await session.execute(
                select(UserApplication.application_id, UserApplication.role_name).where(
                    UserApplication.organization_id == organization.id,
                    UserApplication.user_id == application_user_id,
                    UserApplication.deleted_at.is_(None),
                )
            )
            application_roles = dict(roles_result.all())

        active_invitations = []
        if application_user_id is None or caller_organization_role in {
            OrganizationRoles.admin,
            OrganizationRoles.maintain,
            OrganizationRoles.owner,
        }:
            invitations_result = await session.execute(
                select(OrganizationInvitation)
                .where(
                    OrganizationInvitation.organization_id == organization.id,
                    OrganizationInvitation.deleted_at.is_(None),
                )
                .order_by(OrganizationInvitation.created_at.desc())
            )
            active_invitations = invitations_result.scalars().all()

        memberships_result = await session.execute(
            select(User, UserOrganization.role_name, UserOrganization.updated_at)
            .join(UserOrganization, UserOrganization.user_id == User.id)
            .where(
                UserOrganization.organization_id == organization.id,
                UserOrganization.deleted_at.is_(None),
            )
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
            shared_storage_bucket_name=organization.shared_storage_bucket_name,
            created_at=organization.created_at,
            updated_at=organization.updated_at,
            created_by=UserSummary.model_validate(organization.created_by),
            updated_by=UserSummary.model_validate(organization.updated_by),
            deleted_at=organization.deleted_at,
            deleted_by=UserSummary.model_validate(organization.deleted_by)
            if organization.deleted_by is not None
            else None,
            users=members,
            invitations=[
                OrganizationInvitationResponse.model_validate(invitation) for invitation in active_invitations
            ],
            applications=[
                OrganizationApplicationResponse.model_validate(
                    {
                        **application.model_dump(),
                        "created_by": application.created_by,
                        "updated_by": application.updated_by,
                        "deleted_by": application.deleted_by,
                        "gateway_url": gateway.application_url(
                            application.id,
                            application.compute_registry.ingress_host,
                        )
                        if application.compute_registry is not None
                        else None,
                        "role": application_roles.get(application.id),
                    }
                )
                for application in active_applications
            ],
        )


async def membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles | None:
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

        if membership.role_name == OrganizationRoles.owner and role != OrganizationRoles.owner:
            owner_statement = (
                select(UserOrganization)
                .where(
                    UserOrganization.organization_id == organization_id,
                    UserOrganization.role_name == OrganizationRoles.owner,
                    UserOrganization.deleted_at.is_(None),
                )
                .with_for_update()
            )
            owner_result = await session.execute(owner_statement)
            if len(owner_result.scalars().all()) <= 1:
                raise ValueError("Organization must have at least one owner")

        membership.updated_at = datetime.now(UTC)
        membership.updated_id = user.id
        membership.role_name = role
        await session.commit()
        return True


async def create(name: str, location_id: UUID, user: User, avatar: str | None = None) -> Organization:
    """Create an organization."""

    async with session_scope() as session:
        slug = names.slugify(name, "Organization")
        k8name(slug)
        dbname(slug)
        organization = Organization(
            name=name,
            slug=slug,
            avatar=avatar or "",
            location_id=location_id,
            shared_storage_bucket_name=buckets.shared(slug),
        )
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
        statement = (
            select(Organization)
            .options(
                selectinload(Organization.created_by),
                selectinload(Organization.updated_by),
                selectinload(Organization.deleted_by),
                selectinload(Organization.location),
            )
            .where(Organization.id == organization.id)
        )
        result = await session.execute(statement)
        return result.scalar_one()


async def soft_delete(organization_id: UUID, user: User) -> Organization | None:
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
