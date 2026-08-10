from uuid import UUID
from sqlalchemy import delete, select
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
    return (await session.scalars(statement)).all()


async def purge(session: AsyncSession, application_id: UUID) -> None:
    """Hard-delete one application after all external runtime resources are gone."""

    # The tombstone remains the retry marker until cleanup can finish with this transaction.
    application = await session.get(Application, application_id, with_for_update=True)
    if application is None:
        return
    if application.deleted_at is None:
        raise RuntimeError("Active applications cannot be purged")
    await session.execute(delete(Application).where(Application.id == application_id))


async def get(session: AsyncSession, application_id: UUID, include_deleted: bool = False) -> Application | None:
    """Return a registered application by id."""

    # Load one application by id.
    statement = select(Application).where(Application.id == application_id)

    # Exclude deleted applications unless requested.
    if not include_deleted:
        statement = statement.where(Application.deleted_at.is_(None))

    return (await session.scalars(statement)).one_or_none()


async def create(
    session: AsyncSession,
    organization_id: UUID,
    name: str,
    slug: str,
    image: Image | str,
    user: User,
    secrets: dict[str, str],
    version: str | None = None,
    description: str | None = None,
    icon: str | None = None,
) -> Application:
    """Create an Organization-owned LongLink Application."""

    # Validate direct service callers while preserving already-validated API values.
    image = Image(image)
    if "@" not in image:
        raise ValueError("Application image must be pinned to its resolved digest")

    # Create the Application after validating its Organization lifecycle state.
    # Resolve the parent before taking locks in aggregate order.
    current = await session.get(Organization, organization_id)
    if current is None:
        raise NotFoundError("Organization not found")
    compute = await session.get(ComputeRegistry, current.compute_id, with_for_update=True)
    organization = (await session.scalars(select(Organization).where(Organization.id == organization_id).with_for_update())).one_or_none()
    if compute is None or organization is None:
        raise NotFoundError("Organization not found")
    if compute.status != Status.running:
        raise ConflictError("Compute registry is not ready")
    if organization.deleted_at is not None or organization.status != Status.running:
        raise ConflictError("Organization is not ready")

    # Build the Application row before checking its Organization-scoped uniqueness.
    application = Application(
        organization_id=organization_id,
        name=name,
        slug=slug,
        description=description,
        image=str(image),
        version=version,
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


async def soft_delete(session: AsyncSession, application_id: UUID, user: User) -> Application | None:
    """Tombstone a LongLink Application."""

    # Soft-delete the application state.
    # Resolve parents before taking locks in aggregate order.
    current = await session.get(Application, application_id)
    if current is None:
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
    await operations.enqueue(
        session,
        organization.compute_id,
        kind=OperationKind.application_delete,
        target_id=application.id,
    )

    return application
