from uuid import UUID
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import contains_eager
from collections.abc import Callable, Sequence, Awaitable
from src.models.types import Image
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.services.errors import ConflictError, NotFoundError
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def fetch() -> Sequence[Application]:
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
        return (await session.scalars(statement)).all()


async def gateway_routes(compute_id: UUID) -> Sequence[tuple[UUID, str]]:
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
        return (await session.execute(statement)).tuples().all()


async def purge(application_id: UUID) -> None:
    """Hard-delete one application after all external runtime resources are gone."""

    # The tombstone remains the retry marker until cleanup can finish with this transaction.
    async with session_scope() as session:
        application = await session.get(Application, application_id, with_for_update=True)
        if application is None:
            return
        if application.deleted_at is None:
            raise RuntimeError("Active applications cannot be purged")
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


async def create(
    organization_id: UUID,
    name: str,
    slug: str,
    image: Image | str,
    user: User,
    sdk: str | None = None,
    version: str | None = None,
    description: str | None = None,
    icon: str | None = None,
    *,
    require_ready: bool = True,
) -> Application:
    """Create an Organization-owned LongLink Application."""

    # Validate direct service callers while preserving already-validated API values.
    image = Image(image)
    if "@" not in image:
        raise ValueError("Application image must be pinned to its resolved digest")

    # Create the Application after validating its Organization lifecycle state.
    async with session_scope() as session:
        # Resolve the parent before taking locks in aggregate order.
        current = await session.get(Organization, organization_id)
        if current is None:
            raise NotFoundError("Organization not found")
        compute = await session.get(ComputeRegistry, current.compute_id, with_for_update=True)
        organization = (
            await session.scalars(select(Organization).where(Organization.id == organization_id).with_for_update())
        ).one_or_none()
        if compute is None or organization is None:
            raise NotFoundError("Organization not found")
        if require_ready:
            if compute.status != Status.running:
                raise ConflictError("Compute registry is not ready")
            if organization.deleted_at is not None or organization.status != Status.running:
                raise ConflictError("Organization is not ready")
        elif organization.deleted_at is not None:
            raise ConflictError("Organization is not ready")

        # Build the Application row before checking its Organization-scoped uniqueness.
        application = Application(
            organization_id=organization_id,
            name=name,
            slug=slug,
            description=description,
            image=str(image),
            sdk=sdk,
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
            raise ConflictError("Application slug already exists") from exc

        await session.commit()
        return application


async def replace_image(
    application_id: UUID,
    image: Image | str,
    user: User,
    sdk: str | None = None,
    version: str | None = None,
) -> Application | None:
    """Replace one active Application's resolved image metadata."""

    # Require the replacement image to retain the immutable digest deployment contract.
    image = Image(image)
    if "@" not in image:
        raise ValueError("Application image must be pinned to its resolved digest")

    # Lock and update only active Application desired state.
    async with session_scope() as session:
        application = (
            await session.scalars(
                select(Application)
                .where(Application.id == application_id, Application.deleted_at.is_(None))
                .with_for_update()
            )
        ).one_or_none()
        if application is None:
            return None
        if application.image == image and application.sdk == sdk and application.version == version:
            return application
        application.image = str(image)
        application.sdk = sdk
        application.version = version
        application.updated_at = utcnow()
        application.updated_id = user.id
        await session.commit()
        return application


async def set_status(application_id: UUID, expected_status: Status, status: Status) -> bool:
    """Transition one active Application from the expected lifecycle state."""

    # Guard lifecycle writes from stale attempts after deletion or another transition.
    async with session_scope() as session:
        if (
            await session.execute(
                update(Application)
                .where(
                    Application.id == application_id,
                    Application.deleted_at.is_(None),
                    Application.status == expected_status,
                )
                .values(status=status)
            )
        ).rowcount != 1:
            return False
        await session.commit()
        return True


async def stage_environment(application_id: UUID, expected_status: Status, stage: Callable[[], Awaitable[None]]) -> Status | None:
    """Stage initial cluster environment state while preventing concurrent Application deletion."""

    # Lock the active Application across initial Secret creation so tombstoning cannot race it.
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

        # Create Kubernetes state only while the locked Application remains in the expected lifecycle state.
        if application.status == expected_status:
            await stage()
        return application.status


async def mark_running(application_id: UUID) -> bool:
    """Publish Application readiness."""

    # Lock the Application before publishing readiness.
    async with session_scope() as session:
        application = await session.get(Application, application_id, with_for_update=True)
        if application is None or application.deleted_at is not None:
            return False

        # Publish running only from active creation state and retain a fallback gateway reconciliation.
        if application.status != Status.creating:
            return False
        application.status = Status.running
        await session.commit()

    return True


async def soft_delete(application_id: UUID, user: User) -> Application | None:
    """Tombstone a LongLink Application."""

    # Soft-delete the application state.
    async with session_scope() as session:
        # Resolve parents before taking locks in aggregate order.
        current = await session.get(Application, application_id)
        if current is None:
            return None
        current_organization = await session.get(Organization, current.organization_id)
        if current_organization is None:
            return None

        # Lock the Organization and Application state before tombstoning.
        organization = (
            await session.scalars(select(Organization).where(Organization.id == current.organization_id).with_for_update())
        ).one_or_none()
        application = (await session.scalars(select(Application).where(Application.id == application_id).with_for_update())).one_or_none()
        if organization is None or application is None:
            return None

        # Record the tombstone once; repeated requests only ensure cleanup remains queued.
        if application.deleted_at is None:
            now = utcnow()
            application.status = Status.deleting
            application.deleted_at = now
            application.deleted_id = user.id
            application.updated_at = now
            application.updated_id = user.id

        # Retain the already locked Organization for detached response serialization.
        application.organization = organization
        await session.commit()

    return application
