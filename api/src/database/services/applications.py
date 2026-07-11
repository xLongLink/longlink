from uuid import UUID
from fastapi import HTTPException
from datetime import UTC, datetime
from src.utils import buckets
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload
from src.models.roles import ApplicationRoles
from src.models.statuses import ApplicationStatus
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def fetch() -> list[Application]:
    """Return all registered applications for admin views."""

    # Load active applications with related response data.
    async with session_scope() as session:
        statement = (
            select(Application)
            .join(Application.organization)
            .options(
                selectinload(Application.organization).selectinload(Organization.created_by),
                selectinload(Application.organization).selectinload(Organization.updated_by),
                selectinload(Application.organization).selectinload(Organization.deleted_by),
                selectinload(Application.compute_registry),
                selectinload(Application.database_registry),
                selectinload(Application.storage_registry),
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(Application.deleted_at.is_(None))
            .order_by(Organization.name, Application.name)
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def list_by_organization(organization_id: UUID, include_deleted: bool = False) -> list[Application]:
    """Return all active applications for one organization."""

    # Query organization applications in one session.
    async with session_scope() as session:
        conditions = [Application.organization_id == organization_id]

        # Include deleted rows only when requested.
        if not include_deleted:
            conditions.append(Application.deleted_at.is_(None))

        statement = (
            select(Application)
            .options(
                selectinload(Application.organization).selectinload(Organization.created_by),
                selectinload(Application.organization).selectinload(Organization.updated_by),
                selectinload(Application.organization).selectinload(Organization.deleted_by),
                selectinload(Application.compute_registry),
                selectinload(Application.database_registry),
                selectinload(Application.storage_registry),
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(*conditions)
            .order_by(Application.created_at.asc())
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def get(organization_id: UUID, slug: str) -> Application | None:
    """Return a registered application by organization and slug."""

    # Load one active application by slug.
    async with session_scope() as session:
        statement = (
            select(Application)
            .options(
                selectinload(Application.organization).selectinload(Organization.created_by),
                selectinload(Application.organization).selectinload(Organization.updated_by),
                selectinload(Application.organization).selectinload(Organization.deleted_by),
                selectinload(Application.compute_registry),
                selectinload(Application.database_registry),
                selectinload(Application.storage_registry),
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(
                Application.organization_id == organization_id,
                Application.slug == slug,
                Application.deleted_at.is_(None),
            )
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def get_by_id(application_id: UUID, include_deleted: bool = False) -> Application | None:
    """Return a registered application by id."""

    # Load one application by id.
    async with session_scope() as session:
        conditions = [Application.id == application_id]

        # Exclude deleted applications unless requested.
        if not include_deleted:
            conditions.append(Application.deleted_at.is_(None))

        statement = (
            select(Application)
            .options(
                selectinload(Application.organization).selectinload(Organization.created_by),
                selectinload(Application.organization).selectinload(Organization.updated_by),
                selectinload(Application.organization).selectinload(Organization.deleted_by),
                selectinload(Application.compute_registry),
                selectinload(Application.database_registry),
                selectinload(Application.storage_registry),
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def get_reference(application_id: UUID, include_deleted: bool = False) -> Application | None:
    """Return a registered application by id without eager-loaded relationships."""

    # Load a lightweight application reference by id.
    async with session_scope() as session:
        conditions = [Application.id == application_id]

        # Exclude deleted applications unless requested.
        if not include_deleted:
            conditions.append(Application.deleted_at.is_(None))

        statement = select(Application).where(*conditions)
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def membership_role(application_id: UUID, user_id: UUID) -> ApplicationRoles | None:
    """Return one application membership role for one user."""

    # Query the active membership role.
    async with session_scope() as session:
        statement = select(UserApplication.role_name).where(
            UserApplication.application_id == application_id,
            UserApplication.user_id == user_id,
            UserApplication.deleted_at.is_(None),
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def list_user_memberships(organization_id: UUID, user_id: UUID) -> list[UserApplication]:
    """Return active application memberships for one user in one organization."""

    # Query active application memberships for response shaping at the route boundary.
    async with session_scope() as session:
        statement = select(UserApplication).where(
            UserApplication.organization_id == organization_id,
            UserApplication.user_id == user_id,
            UserApplication.deleted_at.is_(None),
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def list_members(
    application_id: UUID,
    organization_id: UUID,
) -> list[tuple[User, UserOrganization, UserApplication | None]]:
    """Return organization member rows with optional application membership rows."""

    # Query organization members and app roles together.
    async with session_scope() as session:

        # Start from organization memberships so users without app access are visible.
        statement = (
            select(User, UserOrganization, UserApplication)
            .join(UserOrganization, UserOrganization.user_id == User.id)
            .outerjoin(
                UserApplication,
                and_(
                    UserApplication.organization_id == UserOrganization.organization_id,
                    UserApplication.application_id == application_id,
                    UserApplication.user_id == User.id,
                    UserApplication.deleted_at.is_(None),
                ),
            )
            .where(
                UserOrganization.organization_id == organization_id,
                UserOrganization.deleted_at.is_(None),
                User.deleted_at.is_(None),
            )
            .order_by(User.name, User.email)
        )
        result = await session.execute(statement)
        return [
            (member, organization_membership, application_membership)
            for member, organization_membership, application_membership in result.all()
        ]


async def set_member_role(
    application_id: UUID,
    organization_id: UUID,
    member_id: UUID,
    role: ApplicationRoles | None,
    user: User,
) -> bool:
    """Set or remove one organization member's application role."""

    # Update membership rows in one transaction.
    async with session_scope() as session:
        membership_result = await session.execute(
            select(UserOrganization)
            .join(User, User.id == UserOrganization.user_id)
            .where(
                UserOrganization.organization_id == organization_id,
                UserOrganization.user_id == member_id,
                UserOrganization.deleted_at.is_(None),
                User.deleted_at.is_(None),
            )
        )
        organization_membership = membership_result.scalar_one_or_none()

        # Require an active organization membership first.
        if organization_membership is None:
            return False

        application_membership = await session.get(
            UserApplication,
            {
                "application_id": application_id,
                "organization_id": organization_id,
                "user_id": member_id,
            },
        )
        now = datetime.now(UTC)

        # Remove application access when no role is provided.
        if role is None:

            # Soft-delete an existing active application membership.
            if application_membership is not None and application_membership.deleted_at is None:
                application_membership.deleted_at = now
                application_membership.deleted_id = user.id
                application_membership.updated_at = now
                application_membership.updated_id = user.id
            await session.commit()
            return True

        # Create a membership when none exists.
        if application_membership is None:
            application_membership = UserApplication(
                application_id=application_id,
                organization_id=organization_id,
                user_id=member_id,
                role_name=role,
                created_id=user.id,
                updated_id=user.id,
            )
            session.add(application_membership)
        else:
            application_membership.deleted_at = None
            application_membership.deleted_id = None
            application_membership.updated_at = now
            application_membership.updated_id = user.id
            application_membership.role_name = role

        await session.commit()
        return True


async def create(
    organization_id: UUID,
    name: str,
    slug: str,
    image: str,
    user: User,
    status: ApplicationStatus = ApplicationStatus.creating,
    compute_registry_id: UUID | None = None,
    database_registry_id: UUID | None = None,
    storage_registry_id: UUID | None = None,
    version: str | None = None,
    sdk: str | None = None,
    description: str | None = None,
    digest: str | None = None,
    icon: str | None = None,
    storage_bucket_name: str | None = None,
) -> Application:
    """Add a new application to the database for one organization."""

    # Create the application and owner membership transactionally.
    async with session_scope() as session:
        organization = await session.get(Organization, organization_id)

        # Require the owning organization to exist.
        if organization is None:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Check slug uniqueness so K8s resource names stay collision-free.
        slug_statement = select(Application).where(
            Application.organization_id == organization_id,
            Application.slug == slug,
        )
        slug_result = await session.execute(slug_statement)

        # Prevent duplicate application slugs within the organization.
        if slug_result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Application slug already exists")

        application_kwargs: dict[str, object] = {
            "organization_id": organization_id,
            "compute_registry_id": compute_registry_id,
            "database_registry_id": database_registry_id,
            "storage_registry_id": storage_registry_id,
            "storage_bucket_name": storage_bucket_name or buckets.application(organization.slug, slug),
            "name": name,
            "slug": slug,
            "status": status,
            "sdk": sdk,
            "digest": digest,
            "version": version,
            "description": description,
            "image": image,
            "icon": icon,
        }

        application = Application(**application_kwargs)
        application.created_id = user.id
        application.updated_id = user.id
        session.add(application)
        session.add(
            UserApplication(
                application_id=application.id,
                user_id=user.id,
                organization_id=organization_id,
                role_name=ApplicationRoles.admin,
                created_id=user.id,
                updated_id=user.id,
            )
        )
        await session.commit()

        await session.refresh(application)
        statement = (
            select(Application)
            .options(
                selectinload(Application.organization).selectinload(Organization.created_by),
                selectinload(Application.organization).selectinload(Organization.updated_by),
                selectinload(Application.organization).selectinload(Organization.deleted_by),
                selectinload(Application.compute_registry),
                selectinload(Application.database_registry),
                selectinload(Application.storage_registry),
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(Application.id == application.id)
        )
        result = await session.execute(statement)
        return result.scalar_one()


async def set_status(application_id: UUID, status: ApplicationStatus) -> Application | None:
    """Update one application status and return the refreshed row."""

    # Update the status inside one session.
    async with session_scope() as session:
        application = await session.get(Application, application_id)

        # Ignore missing applications for status updates.
        if application is None:
            return None

        application.status = status
        await session.commit()
        await session.refresh(application)
        return application


async def update_runtime(
    application_id: UUID,
    image: str,
    user: User,
    status: ApplicationStatus = ApplicationStatus.creating,
    compute_registry_id: UUID | None = None,
    database_registry_id: UUID | None = None,
    storage_registry_id: UUID | None = None,
    version: str | None = None,
    sdk: str | None = None,
    description: str | None = None,
    digest: str | None = None,
    icon: str | None = None,
) -> Application | None:
    """Update one existing application's runtime metadata."""

    # Update runtime metadata in one session.
    async with session_scope() as session:
        application = await session.get(Application, application_id)

        # Ignore missing or deleted applications.
        if application is None or application.deleted_at is not None:
            return None

        # Keep the database metadata aligned with the workload that will be applied.
        application.compute_registry_id = compute_registry_id
        application.database_registry_id = database_registry_id
        application.storage_registry_id = storage_registry_id
        application.sdk = sdk
        application.digest = digest
        application.description = description
        application.updated_id = user.id
        application.version = version
        application.status = status
        application.image = image
        application.icon = icon
        await session.commit()
        await session.refresh(application)
        return application


async def soft_delete(application_id: UUID, user: User) -> Application | None:
    """Soft-delete one application and its application memberships."""

    # Soft-delete the application and memberships together.
    async with session_scope() as session:
        application = await session.get(Application, application_id)

        # Ignore missing or already-deleted applications.
        if application is None or application.deleted_at is not None:
            return None

        now = datetime.now(UTC)
        application.deleted_at = now
        application.deleted_id = user.id
        application.updated_at = now
        application.updated_id = user.id

        memberships = await session.execute(
            select(UserApplication).where(
                UserApplication.application_id == application_id,
                UserApplication.deleted_at.is_(None),
            )
        )

        # Mark active application memberships as deleted.
        for membership in memberships.scalars().all():
            membership.deleted_at = now
            membership.deleted_id = user.id
            membership.updated_at = now
            membership.updated_id = user.id

        await session.commit()
        await session.refresh(application)
        statement = (
            select(Application)
            .options(
                selectinload(Application.organization).selectinload(Organization.created_by),
                selectinload(Application.organization).selectinload(Organization.updated_by),
                selectinload(Application.organization).selectinload(Organization.deleted_by),
                selectinload(Application.compute_registry),
                selectinload(Application.database_registry),
                selectinload(Application.storage_registry),
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(Application.id == application_id)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()
