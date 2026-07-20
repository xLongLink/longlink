import secrets
from uuid import UUID, uuid4
from fastapi import HTTPException
from src.utils import names
from contextlib import suppress
from sqlalchemy import and_, delete, select
from sqlalchemy.orm import selectinload
from collections.abc import Callable, Awaitable
from src.models.roles import ApplicationRoles
from src.models.types import Image
from longlink.utils.time import utcnow
from src.models.statuses import ComputeStatus, ApplicationStatus, OrganizationStatus
from src.database.session import session_scope
from src.database.services import operations
from src.adapters.storage.base import StorageRuntimeCredentials
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation
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
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(Application.deleted_at.is_(None))
            .order_by(Organization.name, Application.name)
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def for_compute(compute_id: UUID, include_deleted: bool = False) -> list[Application]:
    """Return Applications belonging to Organizations on one compute target."""

    # Reconciliation loads active and pending-removal rows through the same query shape.
    async with session_scope() as session:
        conditions = [Organization.compute_id == compute_id]
        if not include_deleted:
            conditions.extend([Organization.deleted_at.is_(None), Application.deleted_at.is_(None)])
        statement = (
            select(Application)
            .join(Organization, Organization.id == Application.organization_id)
            .options(selectinload(Application.organization))
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def purge(application_id: UUID) -> bool:
    """Hard-delete one application after all external runtime resources are gone."""

    # The tombstone remains the retry marker until cleanup can finish with this transaction.
    async with session_scope() as session:
        application = (
            await session.execute(select(Application).where(Application.id == application_id).with_for_update())
        ).scalar_one_or_none()
        if application is None:
            return False
        if application.deleted_at is None:
            raise RuntimeError("Active applications cannot be purged")
        await session.execute(delete(UserApplication).where(UserApplication.application_id == application_id))
        await session.execute(delete(Application).where(Application.id == application_id))
        await session.commit()
        return True


async def get(application_id: UUID, include_deleted: bool = False) -> Application | None:
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
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def membership_role(application_id: UUID, user_id: UUID) -> ApplicationRoles | None:
    """Return one application membership role for one user."""

    # Query the active membership role.
    async with session_scope() as session:
        statement = select(UserApplication.role).where(
            UserApplication.application_id == application_id,
            UserApplication.user_id == user_id,
            UserApplication.deleted_at.is_(None),
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def members(application_id: UUID, organization_id: UUID) -> list[tuple[User, UserOrganization, UserApplication | None]]:
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


async def set_member_role(application_id: UUID, organization_id: UUID, member_id: UUID, role: ApplicationRoles | None, user: User) -> bool:
    """Set or remove one organization member's application role."""

    # Update membership rows in one transaction.
    async with session_scope() as session:
        membership_result = await session.execute(
            select(UserOrganization.user_id)
            .join(User, User.id == UserOrganization.user_id)
            .where(
                UserOrganization.organization_id == organization_id,
                UserOrganization.user_id == member_id,
                UserOrganization.deleted_at.is_(None),
                User.deleted_at.is_(None),
            )
        )

        # Require an active organization membership first.
        if membership_result.scalar_one_or_none() is None:
            return False

        application_membership = await session.get(
            UserApplication,
            {
                "application_id": application_id,
                "organization_id": organization_id,
                "user_id": member_id,
            },
        )
        now = utcnow()

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
                role=role,
                created_id=user.id,
                updated_id=user.id,
            )
            session.add(application_membership)
        else:
            application_membership.deleted_at = None
            application_membership.deleted_id = None
            application_membership.updated_at = now
            application_membership.updated_id = user.id
            application_membership.role = role

        await session.commit()
        return True


async def create(
    organization_id: UUID,
    name: str,
    slug: str,
    image: Image | str,
    user: User,
    status: ApplicationStatus = ApplicationStatus.creating,
    database_password: str | None = None,
    version: str | None = None,
    sdk: str | None = None,
    description: str | None = None,
    digest: str | None = None,
    icon: str | None = None,
    envs: dict[str, str] | None = None,
) -> Application:
    """Create an Organization-owned LongLink Application and queue compute reconciliation."""

    # Validate direct service callers while preserving already-validated API values.
    image = Image(image)

    # Create the application and owner membership transactionally.
    async with session_scope() as session:
        # Resolve the parent before taking locks in aggregate order.
        current = await session.get(Organization, organization_id)
        if current is None:
            raise HTTPException(status_code=404, detail="Organization not found")
        compute = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == current.compute_id).with_for_update())
        ).scalar_one_or_none()
        organization = (
            await session.execute(select(Organization).where(Organization.id == organization_id).with_for_update())
        ).scalar_one_or_none()
        if compute is None or organization is None:
            raise HTTPException(status_code=404, detail="Organization not found")
        if compute.deleted_at is not None or compute.status != ComputeStatus.ready:
            raise HTTPException(status_code=409, detail="Compute registry is not ready")
        if organization.deleted_at is not None or organization.status != OrganizationStatus.running:
            raise HTTPException(status_code=409, detail="Organization is not ready")

        # Check slug uniqueness so K8s resource names stay collision-free.
        slug_statement = select(Application.id).where(
            Application.organization_id == organization_id,
            Application.slug == slug,
        )
        slug_result = await session.execute(slug_statement)

        # Prevent duplicate application slugs within the organization.
        if slug_result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Application slug already exists")

        # Generate the application ID before validating its deterministic storage prefix.
        application_id = uuid4()
        names.application_storage_prefix(application_id)

        application = Application(
            id=application_id,
            organization_id=organization_id,
            name=name,
            slug=slug,
            status=status,
            sdk=sdk,
            digest=digest,
            version=version,
            description=description,
            image=image.value,
            icon=icon,
            envs=dict(envs or {}),
            database_password=database_password or secrets.token_urlsafe(24),
        )
        application.created_id = user.id
        application.updated_id = user.id
        session.add(application)
        session.add(
            UserApplication(
                application_id=application.id,
                user_id=user.id,
                organization_id=organization_id,
                role=ApplicationRoles.admin,
                created_id=user.id,
                updated_id=user.id,
            )
        )
        compute.updated_id = user.id
        await operations.enqueue_in_session(session, compute.id)
        await session.commit()

        statement = (
            select(Application)
            .options(
                selectinload(Application.organization).selectinload(Organization.created_by),
                selectinload(Application.organization).selectinload(Organization.updated_by),
                selectinload(Application.organization).selectinload(Organization.deleted_by),
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(Application.id == application.id)
        )
        result = await session.execute(statement)
        return result.scalar_one()


def storage_credentials(application: Application) -> StorageRuntimeCredentials | None:
    """Return complete persisted credentials for a LongLink Application's stable storage identity."""

    # Credentials are usable only when both storage credential fields were stored.
    if application.storage_access_key_id is None or application.storage_secret_access_key is None:
        return None

    return {
        "access_key_id": application.storage_access_key_id,
        "secret_access_key": application.storage_secret_access_key,
    }


async def provision_storage_credentials(
    application_id: UUID,
    operation_id: UUID,
    attempt_count: int,
    platform_version: str,
    provision: Callable[[], Awaitable[StorageRuntimeCredentials]],
    discard: Callable[[StorageRuntimeCredentials], Awaitable[None]],
) -> tuple[Application, StorageRuntimeCredentials] | None:
    """Provision and persist credentials while holding the Application and reconciliation lease locks."""

    generated: StorageRuntimeCredentials | None = None
    try:
        # Lock the Application first to match desired-state mutation lock ordering.
        async with session_scope() as session:
            application = (
                await session.execute(select(Application).where(Application.id == application_id).with_for_update())
            ).scalar_one_or_none()
            if application is None:
                return None

            # Lock and validate the current lease before starting the external IAM operation.
            now = utcnow()
            lease = (
                await session.execute(
                    select(Operation.id)
                    .where(
                        Operation.id == operation_id,
                        Operation.attempt_count == attempt_count,
                        Operation.platform_version == platform_version,
                        Operation.lease_expires_at > now,
                        Operation.started_at.is_not(None),
                        Operation.stopped_at.is_(None),
                    )
                    .with_for_update()
                )
            ).scalar_one_or_none()
            if lease is None:
                return None

            # Reuse credentials committed by a prior attempt that completed before these locks were acquired.
            credentials = storage_credentials(application)
            if credentials is not None:
                return application, credentials

            # Keep deterministic provider replacement and persistence inside the same lease ownership window.
            generated = await provision()
            application.storage_access_key_id = generated["access_key_id"]
            application.storage_secret_access_key = generated["secret_access_key"]
            await session.commit()
            await session.refresh(application)
            return application, generated
    except Exception:
        # Delete only a definitely unpersisted key; preserve it when a lost commit response actually stored it.
        if generated is not None:
            with suppress(Exception):
                current = await get(application_id, include_deleted=True)
                if current is None or storage_credentials(current) != generated:
                    await discard(generated)
        raise


async def set_status(application_id: UUID, status: ApplicationStatus) -> Application | None:
    """Update one application status and return the refreshed row."""

    # Update the status inside one session.
    async with session_scope() as session:
        # Ignore missing applications for status updates.
        application = await session.get(Application, application_id)
        if application is None:
            return None

        application.status = status
        await session.commit()
        await session.refresh(application)
        return application


async def update_runtime(
    application_id: UUID,
    image: str,
    user: User | None,
    status: ApplicationStatus = ApplicationStatus.creating,
    version: str | None = None,
    sdk: str | None = None,
    description: str | None = None,
    digest: str | None = None,
    icon: str | None = None,
    envs: dict[str, str] | None = None,
) -> Application | None:
    """Persist runtime metadata resolved by reconciliation without reviving a deleted LongLink Application."""

    # Update runtime metadata in one session.
    async with session_scope() as session:
        application = await session.get(Application, application_id)

        # Ignore missing or deleted applications.
        if application is None or application.deleted_at is not None:
            return None

        # Keep the database metadata aligned with the workload that will be applied.
        application.sdk = sdk
        application.digest = digest
        application.description = description
        if user is not None:
            application.updated_id = user.id
        application.version = version
        application.status = status
        application.image = image
        application.icon = icon

        # Preserve existing environment configuration when callers do not replace it.
        if envs is not None:
            application.envs = dict(envs)
        await session.commit()
        await session.refresh(application)
        return application


async def soft_delete(application_id: UUID, user: User) -> Application | None:
    """Tombstone a LongLink Application and atomically queue compute cleanup."""

    # Soft-delete the application and memberships together.
    async with session_scope() as session:
        current = await session.get(Application, application_id)

        # Resolve parents before taking locks in aggregate order.
        if current is None:
            return None
        current_organization = await session.get(Organization, current.organization_id)
        if current_organization is None:
            return None
        compute = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == current_organization.compute_id).with_for_update())
        ).scalar_one_or_none()
        organization = (
            await session.execute(select(Organization).where(Organization.id == current.organization_id).with_for_update())
        ).scalar_one_or_none()
        application = (
            await session.execute(select(Application).where(Application.id == application_id).with_for_update())
        ).scalar_one_or_none()

        # Ignore missing or already-deleted applications.
        if compute is None or organization is None or application is None or application.deleted_at is not None:
            return None

        now = utcnow()
        application.status = ApplicationStatus.deleting
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

        # Application tombstone and reconciliation request are one Platform transaction.
        compute.updated_id = user.id
        await operations.enqueue_in_session(session, compute.id)

        await session.commit()
        statement = (
            select(Application)
            .options(
                selectinload(Application.organization).selectinload(Organization.created_by),
                selectinload(Application.organization).selectinload(Organization.updated_by),
                selectinload(Application.organization).selectinload(Organization.deleted_by),
                selectinload(Application.created_by),
                selectinload(Application.updated_by),
                selectinload(Application.deleted_by),
            )
            .where(Application.id == application_id)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()
