from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import and_, delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import contains_eager
from collections.abc import Callable, Awaitable
from src.models.roles import ApplicationRoles
from src.models.types import Image
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations
from src.models.operations import OperationKind
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
            .options(contains_eager(Application.organization))
            .where(Application.deleted_at.is_(None))
            .order_by(Organization.name, Application.name)
        )
        return list(await session.scalars(statement))


async def gateway_routes(compute_id: UUID) -> list[tuple[UUID, str]]:
    """Return stable Service route identities for running Applications on one compute."""

    # Gateway reconciliation needs no provider credentials or Application runtime configuration.
    async with session_scope() as session:
        statement = (
            select(Application.id, Organization.slug)
            .join(Organization, Organization.id == Application.organization_id)
            .where(
                Organization.compute_id == compute_id,
                Organization.deleted_at.is_(None),
                Application.deleted_at.is_(None),
                Application.status == Status.running,
            )
            .order_by(Organization.slug, Application.id)
        )
        return list((await session.execute(statement)).tuples())


async def purge(application_id: UUID) -> None:
    """Hard-delete one application after all external runtime resources are gone."""

    # The tombstone remains the retry marker until cleanup can finish with this transaction.
    async with session_scope() as session:
        application = await session.get(Application, application_id, with_for_update=True)
        if application is None:
            return
        if application.deleted_at is None:
            raise RuntimeError("Active applications cannot be purged")
        await session.execute(delete(UserApplication).where(UserApplication.application_id == application_id))
        await session.execute(delete(Application).where(Application.id == application_id))
        await session.commit()


async def get(application_id: UUID, include_deleted: bool = False) -> Application | None:
    """Return a registered application by id."""

    # Load one application by id.
    async with session_scope() as session:
        statement = select(Application).where(Application.id == application_id)

        # Exclude deleted applications unless requested.
        if not include_deleted:
            statement = statement.where(Application.deleted_at.is_(None))

        return (await session.scalars(statement)).one_or_none()


async def membership_role(application_id: UUID, user_id: UUID) -> ApplicationRoles | None:
    """Return one application membership role for one user."""

    # Query the active membership role.
    async with session_scope() as session:
        statement = select(UserApplication.role).where(
            UserApplication.application_id == application_id,
            UserApplication.user_id == user_id,
            UserApplication.deleted_at.is_(None),
        )
        return (await session.scalars(statement)).one_or_none()


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
        return list((await session.execute(statement)).tuples())


async def set_member_role(application_id: UUID, organization_id: UUID, member_id: UUID, role: ApplicationRoles | None, user: User) -> bool:
    """Set or remove one organization member's application role."""

    # Update membership rows in one transaction.
    async with session_scope() as session:
        # Require an active organization membership first.
        membership_id = (
            await session.scalars(
                select(UserOrganization.user_id)
                .join(User, User.id == UserOrganization.user_id)
                .where(
                    UserOrganization.organization_id == organization_id,
                    UserOrganization.user_id == member_id,
                    UserOrganization.deleted_at.is_(None),
                    User.deleted_at.is_(None),
                )
            )
        ).one_or_none()
        if membership_id is None:
            return False

        # Load any current Application membership before applying the requested role.
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
    digest: str,
    sdk: str | None = None,
    version: str | None = None,
    description: str | None = None,
    icon: str | None = None,
) -> tuple[Application, Operation]:
    """Create an Organization-owned LongLink Application and queue its deployment lifecycle."""

    # Validate direct service callers while preserving already-validated API values.
    image = Image(image)
    if "@" not in image or image.tag_or_digest != digest:
        raise ValueError("Application image must be pinned to its resolved digest")

    # Create the application and owner membership transactionally.
    async with session_scope() as session:
        # Resolve the parent before taking locks in aggregate order.
        current = await session.get(Organization, organization_id)
        if current is None:
            raise HTTPException(status_code=404, detail="Organization not found")
        compute = await session.get(ComputeRegistry, current.compute_id, with_for_update=True)
        organization = (
            await session.scalars(select(Organization).where(Organization.id == organization_id).with_for_update())
        ).one_or_none()
        if compute is None or organization is None:
            raise HTTPException(status_code=404, detail="Organization not found")
        if compute.status != Status.running:
            raise HTTPException(status_code=409, detail="Compute registry is not ready")
        if organization.deleted_at is not None or organization.status != Status.running:
            raise HTTPException(status_code=409, detail="Organization is not ready")

        # Build the Application row before checking its Organization-scoped uniqueness.
        application = Application(
            organization_id=organization_id,
            name=name,
            slug=slug,
            status=Status.creating,
            description=description,
            image=image.value,
            sdk=sdk,
            digest=digest,
            version=version,
            icon=icon,
        )
        application.created_id = user.id
        application.updated_id = user.id
        application.organization = organization
        session.add(application)

        # Let the Organization-scoped database constraint arbitrate slug uniqueness.
        try:
            await session.flush()
        except IntegrityError as exc:
            raise HTTPException(status_code=409, detail="Application slug already exists") from exc

        # Grant the creator administration and queue the delayed deployment lifecycle.
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
        operation = await operations.enqueue_in_session(
            session,
            compute.id,
            locked_compute=compute,
            kind=OperationKind.application_create,
            target_id=application.id,
            delay_seconds=30,
        )
        await session.commit()
        return application, operation


async def set_status(application_id: UUID, expected_status: Status, status: Status) -> bool:
    """Transition one active Application from the expected lifecycle state."""

    # Guard lifecycle writes from stale attempts after deletion or another transition.
    async with session_scope() as session:
        application = await session.scalar(
            update(Application)
            .where(
                Application.id == application_id,
                Application.deleted_at.is_(None),
                Application.status == expected_status,
                Application.status != Status.deleting,
            )
            .values(status=status)
            .returning(Application)
        )
        await session.commit()
        return application is not None


async def replace_environment(
    application_id: UUID,
    expected_status: Status,
    replace: Callable[[], Awaitable[None]],
) -> Status | None:
    """Replace cluster environment state while preventing concurrent Application deletion."""

    # Lock the active Application across the external replacement so tombstoning cannot race Secret creation.
    async with session_scope() as session:
        application = (
            await session.scalars(
                select(Application)
                .where(
                    Application.id == application_id,
                    Application.deleted_at.is_(None),
                )
                .with_for_update()
            )
        ).one_or_none()
        if application is None:
            return None

        # Mutate Kubernetes only while the locked Application remains in the caller's expected lifecycle state.
        if application.status == expected_status:
            await replace()
        return application.status


async def mark_running(application_id: UUID, compute_id: UUID) -> Operation | None:
    """Publish Application readiness and queue fallback gateway reconciliation atomically."""

    # Lock the compute aggregate before updating the Application and its outbox entry.
    async with session_scope() as session:
        compute = await session.get(ComputeRegistry, compute_id, with_for_update=True)
        application = await session.get(Application, application_id, with_for_update=True)
        if compute is None or application is None or application.deleted_at is not None:
            return None

        # Publish running only from active creation state and retain a fallback gateway reconciliation.
        if application.status != Status.creating:
            return None
        application.status = Status.running
        operation = await operations.enqueue_in_session(
            session,
            compute.id,
            locked_compute=compute,
        )
        await session.commit()
        return operation


async def soft_delete(application_id: UUID, user: User) -> tuple[Application, Operation] | None:
    """Tombstone a LongLink Application and atomically queue lifecycle cleanup."""

    # Soft-delete the application and memberships together.
    async with session_scope() as session:
        # Resolve parents before taking locks in aggregate order.
        current = await session.get(Application, application_id)
        if current is None:
            return None
        current_organization = await session.get(Organization, current.organization_id)
        if current_organization is None:
            return None

        # Lock the aggregate resources and stop if any disappear during acquisition.
        compute = await session.get(ComputeRegistry, current_organization.compute_id, with_for_update=True)
        organization = (
            await session.scalars(select(Organization).where(Organization.id == current.organization_id).with_for_update())
        ).one_or_none()
        application = (await session.scalars(select(Application).where(Application.id == application_id).with_for_update())).one_or_none()
        if compute is None or organization is None or application is None:
            return None

        # Record the tombstone once; repeated requests only ensure cleanup remains queued.
        if application.deleted_at is None:
            now = utcnow()
            application.status = Status.deleting
            application.deleted_at = now
            application.deleted_id = user.id
            application.updated_at = now
            application.updated_id = user.id

            # Mark active Application memberships as deleted.
            memberships = await session.scalars(
                select(UserApplication).where(
                    UserApplication.application_id == application_id,
                    UserApplication.deleted_at.is_(None),
                )
            )
            for membership in memberships:
                membership.deleted_at = now
                membership.deleted_id = user.id
                membership.updated_at = now
                membership.updated_id = user.id

        # Application tombstone and reconciliation request are one Platform transaction.
        operation = await operations.enqueue_in_session(
            session,
            compute.id,
            locked_compute=compute,
            kind=OperationKind.application_delete,
            target_id=application.id,
        )

        # Retain the already locked Organization for detached response serialization.
        application.organization = organization
        await session.commit()
        return application, operation
