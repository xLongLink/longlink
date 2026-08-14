from uuid import UUID
from sqlmodel import col
from sqlalchemy import select
from src.errors import ConflictError, NotFoundError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import contains_eager
from collections.abc import Sequence
from src.models.types import Image
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.services import operations
from src.models.operations import OperationKind
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def fetch(session: AsyncSession) -> Sequence[Application]:
    """Return all registered applications for admin views."""

    # Load active applications with related response data.
    statement = (
        select(Application)
        .join(Application.organization)
        .options(contains_eager(Application.organization))
        .where(Application.deleted_at.is_(None))
        .order_by(Organization.name, Application.name)
    )
    result = await session.scalars(statement)
    return result.all()


async def purge(session: AsyncSession, application_id: UUID) -> None:
    """Hard-delete one application after all external runtime resources are gone."""

    # The tombstone remains the retry marker until cleanup can finish with this transaction.
    application = await session.get(Application, application_id, with_for_update=True)
    if application is None:
        return
    if application.deleted_at is None:
        raise RuntimeError("Active applications cannot be purged")
    await session.delete(application)


async def get(session: AsyncSession, application_id: UUID, include_deleted: bool = False) -> Application | None:
    """Return a registered application by id."""

    # Load one application by id.
    statement = select(Application).where(Application.id == application_id)

    # Exclude deleted applications unless requested.
    if not include_deleted:
        statement = statement.where(Application.deleted_at.is_(None))

    result = await session.scalars(statement)
    return result.one_or_none()


async def create(
    session: AsyncSession,
    organization_id: UUID,
    name: str,
    slug: str,
    image: Image,
    user: User,
    secrets: dict[str, str],
    description: str | None = None,
    icon: str | None = None,
) -> Application:
    """Create an Organization-owned LongLink Application."""

    # Validate direct service callers while preserving already-validated API values.
    if "@" not in image:
        raise ValueError("Application image must be pinned to its resolved digest")

    # Create the Application after validating its Organization lifecycle state.
    # Resolve the parent before taking locks in aggregate order.
    compute_id = await session.scalar(select(col(Organization.compute_id)).where(col(Organization.id) == organization_id))
    if compute_id is None:
        raise NotFoundError("Organization not found")
    compute_status = await session.scalar(select(ComputeRegistry.status).where(ComputeRegistry.id == compute_id).with_for_update())
    organization_result = await session.scalars(select(Organization).where(Organization.id == organization_id).with_for_update())
    organization = organization_result.one_or_none()
    if compute_status is None or organization is None:
        raise NotFoundError("Organization not found")
    if compute_status != Status.running:
        raise ConflictError("Compute registry is not ready")
    if organization.deleted_at is not None or organization.status != Status.running:
        raise ConflictError("Organization is not ready")

    # Build the Application row before checking its Organization-scoped uniqueness.
    application = Application(
        organization_id=organization_id,
        name=name,
        slug=slug,
        description=description,
        image_desired=str(image),
        icon=icon,
        secrets=secrets,
    )
    application.created_id = user.id
    application.updated_id = user.id
    application.organization = organization
    session.add(application)

    # Let the Organization-scoped database constraint arbitrate slug uniqueness.
    try:
        await session.flush()
        await operations.enqueue(
            session,
            organization.compute_id,
            kind=OperationKind.application_create,
            target_id=application.id,
        )
    except IntegrityError as exc:
        raise ConflictError("Application slug already exists") from exc

    return application


async def release(
    session: AsyncSession,
    application_id: UUID,
    image: Image,
    description: str | None,
    user: User,
) -> Application | None:
    """Record one desired Application release and queue its deployment."""

    # Lock the Organization and Application before changing its desired release.
    result = await session.execute(
        select(Organization, Application)
        .join(Application, col(Application.organization_id) == col(Organization.id))
        .where(col(Application.id) == application_id)
        .with_for_update()
    )
    row = result.one_or_none()
    if row is None:
        return None
    organization, application = row
    if application.deleted_at is not None:
        return None

    # Persist the image-derived desired release before scheduling its convergence.
    application.image_desired = str(image)
    application.description = description
    application.updated_id = user.id
    application.organization = organization
    await operations.enqueue(
        session,
        organization.compute_id,
        kind=OperationKind.application_create,
        target_id=application.id,
    )
    return application


async def add_runtime_secrets(session: AsyncSession, application_id: UUID, secrets: dict[str, str]) -> dict[str, str] | None:
    """Persist generated runtime secrets unless a previous attempt already did."""

    # Lock the Application so only the first creation attempt writes generated credentials.
    application = await session.get(Application, application_id, with_for_update=True)
    if application is None or application.deleted_at is not None:
        return None

    # Reuse durable runtime values after an interrupted creation attempt.
    if any(name.startswith("LONGLINK_") for name in application.secrets):
        return application.secrets

    # Assign a new mapping so SQLAlchemy persists the encrypted JSON value.
    application.secrets = {**application.secrets, **secrets}
    return application.secrets


async def mark_running(session: AsyncSession, application_id: UUID) -> None:
    """Publish Application readiness."""

    # Lock the Application before publishing readiness.
    application = await session.get(Application, application_id, with_for_update=True)
    if application is None or application.deleted_at is not None:
        return

    # Publish running after the Application workload is ready.
    if application.status != Status.creating:
        return
    application.status = Status.running


async def mark_deployed(session: AsyncSession, application_id: UUID, image: str) -> None:
    """Publish a successfully applied desired release as deployed."""

    # Promote only the exact desired release applied by the worker.
    application = await session.get(Application, application_id, with_for_update=True)
    if application is None or application.deleted_at is not None or application.image_desired != image:
        return
    application.image_deployed = application.image_desired


async def soft_delete(session: AsyncSession, application_id: UUID, user: User) -> Application | None:
    """Tombstone a LongLink Application."""

    # Lock the Organization and Application state before tombstoning.
    result = await session.execute(
        select(Organization, Application)
        .join(Application, col(Application.organization_id) == col(Organization.id))
        .where(col(Application.id) == application_id)
        .with_for_update()
    )
    row = result.one_or_none()
    if row is None:
        return None
    organization, application = row

    # Record the tombstone once; repeated requests only ensure cleanup remains queued.
    if application.deleted_at is None:
        now = utcnow()
        application.status = Status.deleting
        application.deleted_at = now
        application.deleted_id = user.id
        application.updated_id = user.id

    # Retain the already locked Organization for detached response serialization.
    application.organization = organization
    await operations.enqueue(
        session,
        organization.compute_id,
        kind=OperationKind.application_delete,
        target_id=application.id,
    )

    return application
