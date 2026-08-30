from uuid import UUID
from src.utils import names, roles
from sqlalchemy import func, select
from src.errors import ConflictError, NotFoundError, ForbiddenError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer, contains_eager
from collections.abc import Sequence
from src.models.roles import OrganizationRoles
from src.models.types import Image
from longlink.utils.time import utcnow
from src.database.services import operations
from src.models.operations import OperationKind
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.association import UserOrganization
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def fetch_page(session: AsyncSession, pagination: Pagination) -> tuple[Sequence[Application], int]:
    """Return one ordered page of active applications for administrator views."""

    # Load page response data without loading encrypted application secrets.
    statement = (
        select(Application)
        .join(Application.organization)
        .options(contains_eager(Application.organization), defer(Application.secrets))
        .where(Application.deleted_at.is_(None))
        .order_by(Organization.name, Application.name, Application.id)
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)

    # Count only rows eligible for the administrator listing.
    count_result = await session.execute(select(func.count()).select_from(Application).where(Application.deleted_at.is_(None)))
    return result.all(), count_result.scalar_one()


async def create(
    session: AsyncSession,
    organization_id: UUID,
    name: str,
    image: Image,
    secrets: dict[str, str],
    description: str | None = None,
    *,
    user_id: UUID,
) -> Application:
    """Create an Organization-owned LongLink Application."""

    # Lock the Organization before creating an Application against its assignment.
    organization = await session.scalar(select(Organization).where(Organization.id == organization_id).with_for_update())
    if organization is None:
        raise NotFoundError("Organization not found")
    if organization.deleted_at is not None:
        raise ConflictError("Organization is not available")

    # Revalidate the caller after locking the Organization so revoked access cannot use stale request state.
    membership = await session.get(UserOrganization, (user_id, organization_id), with_for_update=True)
    if membership is None or membership.deleted_at is not None:
        raise ForbiddenError("Access required")
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")

    # Serialize application creation through the locked Organization to enforce the beta limit.
    application_ids_result = await session.execute(
        select(Application.id)
        .where(
            Application.organization_id == organization_id,
            Application.deleted_at.is_(None),
        )
        .limit(3)
        .with_for_update()
    )
    if len(application_ids_result.all()) >= 3:
        raise ConflictError("Application limit reached during the beta. Contact LongLink to request additional applications.")

    # Build the Application row before checking its Organization-scoped uniqueness.
    application = Application(
        created_id=user_id,
        organization_id=organization_id,
        name=name,
        slug=names.slugify(name),
        description=description,
        image_desired=image,
        secrets=secrets,
        updated_id=user_id,
    )

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


async def delete(session: AsyncSession, application_id: UUID, user_id: UUID) -> None:
    """Authorize, tombstone, and queue cleanup for one LongLink Application."""

    # Lock active application access before changing its lifecycle state.
    result = await session.execute(
        select(Application, UserOrganization.role)
        .join(UserOrganization, UserOrganization.organization_id == Application.organization_id)
        .where(
            Application.id == application_id,
            Application.deleted_at.is_(None),
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
    now = utcnow()
    application.deleted_at = now
    application.deleted_id = user_id
    application.updated_at = now
    application.updated_id = user_id

    await operations.enqueue(
        session,
        kind=OperationKind.application_delete,
        target_id=application.id,
    )
