from uuid import UUID
from src.utils import names, roles
from sqlalchemy import select
from src.errors import ConflictError, NotFoundError, ForbiddenError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer, contains_eager
from collections.abc import Sequence
from src.models.roles import OrganizationRoles
from src.models.types import Image
from longlink.utils.time import utcnow
from src.database.services import operations
from src.models.operations import OperationKind
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.association import UserOrganization
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


async def create(
    session: AsyncSession,
    organization_id: UUID,
    name: str,
    image: Image,
    user_id: UUID,
    secrets: dict[str, str],
    description: str | None = None,
    icon: str | None = None,
) -> Application:
    """Create an Organization-owned LongLink Application."""

    # Lock the Organization before creating an Application against its assignment.
    organization = await session.scalar(select(Organization).where(Organization.id == organization_id).with_for_update())
    if organization is None:
        raise NotFoundError("Organization not found")
    if organization.deleted_at is not None:
        raise ConflictError("Organization is not available")

    # Build the Application row before checking its Organization-scoped uniqueness.
    application = Application(
        organization_id=organization_id,
        name=name,
        slug=names.slugify(name),
        description=description,
        image_desired=image,
        icon=icon,
        secrets=secrets,
    )
    application.created_id = user_id
    application.updated_id = user_id

    # Let the Organization-scoped database constraint arbitrate slug uniqueness.
    try:
        async with session.begin_nested():
            session.add(application)
            await session.flush()
    except IntegrityError as exc:
        raise ConflictError("Application slug already exists") from exc

    await operations.enqueue(
        session,
        kind=OperationKind.application_create,
        target_id=application.id,
    )

    return application


async def release(
    session: AsyncSession,
    application_id: UUID,
    image: Image,
    description: str | None,
    user_id: UUID,
) -> Application | None:
    """Record one desired Application release and queue its deployment."""

    # Lock the Application and its Organization assignment before changing its desired release.
    result = await session.scalars(
        select(Application)
        .join(Application.organization)
        .where(
            Application.id == application_id,
            Application.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
        )
        .with_for_update()
    )
    application = result.one_or_none()
    if application is None:
        return None

    # Persist the image-derived desired release before scheduling its convergence.
    application.image_desired = image
    application.description = description
    application.updated_id = user_id
    await operations.enqueue(
        session,
        kind=OperationKind.application_create,
        target_id=application.id,
    )
    return application


async def delete(session: AsyncSession, application_id: UUID, user_id: UUID) -> None:
    """Authorize, tombstone, and queue cleanup for one LongLink Application."""

    # Lock active application access before changing its lifecycle state.
    result = await session.execute(
        select(Application, UserOrganization.role)
        .join(Application.organization)
        .join(UserOrganization, UserOrganization.organization_id == Organization.id)
        .where(
            Application.id == application_id,
            Application.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
            UserOrganization.user_id == user_id,
            UserOrganization.deleted_at.is_(None),
        )
        .with_for_update()
    )
    row = result.one_or_none()
    if row is None:
        raise ForbiddenError("Access required")
    application, role = row
    if not roles.atleast(role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")

    # Record the tombstone and schedule external cleanup in one transaction.
    application.deleted_at = utcnow()
    application.deleted_id = user_id
    application.updated_id = user_id

    await operations.enqueue(
        session,
        kind=OperationKind.application_delete,
        target_id=application.id,
    )
