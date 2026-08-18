from uuid import UUID
from sqlalchemy import select, update
from src.errors import ConflictError, NotFoundError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer, contains_eager
from collections.abc import Sequence
from src.models.types import Image
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.services import operations
from src.models.operations import OperationKind
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def fetch(session: AsyncSession) -> Sequence[Application]:
    """Return all registered applications for admin views."""

    # Load active applications with related response data.
    statement = (
        select(Application)
        .join(Application.organization)
        .options(contains_eager(Application.organization), defer(Application.secrets))
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

    # Load the requested application by primary key.
    application = await session.get(Application, application_id)
    if application is None or (not include_deleted and application.deleted_at is not None):
        return None
    return application


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

    # Lock the Organization before creating an Application against its assignment.
    result = await session.execute(
        select(Organization)
        .where(Organization.id == organization_id)
        .with_for_update()
    )
    organization = result.scalar_one_or_none()
    if organization is None:
        raise NotFoundError("Organization not found")
    if organization.deleted_at is not None:
        raise ConflictError("Organization is not available")

    # Build the Application row before checking its Organization-scoped uniqueness.
    application = Application(
        organization_id=organization_id,
        name=name,
        slug=slug,
        description=description,
        image_desired=image,
        icon=icon,
        secrets=secrets,
    )
    application.created_id = user.id
    application.updated_id = user.id

    # Let the Organization-scoped database constraint arbitrate slug uniqueness.
    try:
        async with session.begin_nested():
            session.add(application)
            await session.flush()
    except IntegrityError as exc:
        raise ConflictError("Application slug already exists") from exc

    await operations.enqueue(
        session,
        organization.compute_id,
        kind=OperationKind.application_create,
        target_id=application.id,
    )

    return application


async def release(
    session: AsyncSession,
    application_id: UUID,
    image: Image,
    description: str | None,
    user: User,
) -> Application | None:
    """Record one desired Application release and queue its deployment."""

    # Lock the Application and its Organization assignment before changing its desired release.
    result = await session.execute(
        select(Application, Organization.compute_id)
        .join(Application.organization)
        .where(Application.id == application_id, Organization.deleted_at.is_(None))
        .with_for_update()
    )
    row = result.one_or_none()
    if row is None:
        return None
    application, compute_id = row
    if application.deleted_at is not None:
        return None

    # Persist the image-derived desired release before scheduling its convergence.
    application.image_desired = image
    application.description = description
    application.updated_id = user.id
    await operations.enqueue(
        session,
        compute_id,
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
    if "LONGLINK_ENV" not in application.secrets:
        # Assign a new mapping so SQLAlchemy persists the encrypted JSON value.
        application.secrets = {**application.secrets, **secrets}
    return application.secrets


async def publish_deployment(session: AsyncSession, application_id: UUID) -> None:
    """Publish an applied release and Application readiness."""

    # Publish only an active Application's initial deployment transition.
    await session.execute(
        update(Application)
        .where(
            Application.id == application_id,
            Application.deleted_at.is_(None),
            Application.status == Status.creating,
        )
        .values(status=Status.running)
    )


async def soft_delete(session: AsyncSession, application_id: UUID, user: User) -> Application | None:
    """Tombstone a LongLink Application."""

    # Lock the Organization and Application state before tombstoning.
    result = await session.execute(
        select(Application, Organization.compute_id)
        .join(Application.organization)
        .where(Application.id == application_id)
        .with_for_update()
    )
    row = result.one_or_none()
    if row is None:
        return None
    application, compute_id = row

    # Record the tombstone once; repeated requests only ensure cleanup remains queued.
    if application.deleted_at is None:
        application.status = Status.deleting
        application.deleted_at = utcnow()
        application.deleted_id = user.id
        application.updated_id = user.id

    await operations.enqueue(
        session,
        compute_id,
        kind=OperationKind.application_delete,
        target_id=application.id,
    )

    return application
