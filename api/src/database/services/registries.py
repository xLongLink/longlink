from uuid import UUID
from sqlmodel import col
from src.utils import github, images
from sqlalchemy import select, update
from src.errors import InvalidError, ConflictError, NotFoundError, ForbiddenError
from src.models.roles import OrganizationRoles
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.database.services import operations, organizations
from src.models.operations import OperationKind
from src.models.registries import RegistryCreate
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.solutions import Revision
from src.database.models.registries import RegistryConnection
from src.database.models.organizations import Organization


async def lock(session: AsyncSession, organization_id: UUID) -> None:
    """Serialize registry mutations, secret synchronization, and revision admission."""

    # SQLite requires a write reservation rather than SELECT FOR UPDATE.
    if session.get_bind().dialect.name == "sqlite":
        await session.execute(
            update(Organization).where(col(Organization.id) == organization_id).values(updated_at=col(Organization.updated_at))
        )

    # Lock and refresh Organization state before checking availability.
    organization = await session.get(Organization, organization_id, populate_existing=True, with_for_update=True)
    if organization is None or organization.deleted_at is not None:
        raise ConflictError("Organization is not available")


async def create(session: AsyncSession, organization_id: UUID, payload: RegistryCreate, user_id: UUID) -> RegistryConnection:
    """Authorize a registry connection and queue secret synchronization in the caller's final transaction."""

    # Authorize before using the submitted token to resolve its GitHub account.
    membership = await organizations.require_membership(session, user_id, organization_id, OrganizationRoles.maintain)

    # Release the transaction and discard its permission snapshot before waiting for GitHub.
    await session.commit()
    session.expire(membership)
    username = await github.username(payload.credential)

    # Revalidate access after the external lookup and serialize creation with secret synchronization.
    await lock(session, organization_id)
    await organizations.require_membership(session, user_id, organization_id, OrganizationRoles.maintain)

    # Store new credentials within the authorized Organization.
    connection = RegistryConnection(
        organization_id=organization_id,
        username=username,
        credential=payload.credential.get_secret_value(),
    )
    session.add(connection)

    # Always queue fresh work: active reconciliation may have synchronized older credentials.
    await operations.enqueue(session, kind=OperationKind.organization_create, target_id=organization_id, coalesce=False)
    return connection


async def delete(session: AsyncSession, organization_id: UUID, connection_id: UUID, user_id: UUID) -> None:
    """Authorize removal of unused registry credentials and queue secret synchronization."""

    # Refresh maintenance access under the Organization lock after route authorization.
    await lock(session, organization_id)
    await organizations.locked_membership(session, user_id, organization_id, OrganizationRoles.maintain)

    # Resolve only registry credentials belonging to the authorized Organization.
    connection = await session.get(RegistryConnection, connection_id)
    if connection is None or connection.organization_id != organization_id:
        raise NotFoundError("Registry connection not found")

    # Retained deployment revisions must keep their registry credentials available.
    dependency = await session.scalar(select(col(Revision.id)).where(col(Revision.registry_connection_id) == connection_id).limit(1))
    if dependency is not None:
        raise ConflictError("Registry connection is used by retained Solution revisions")
    await session.delete(connection)

    # Do not coalesce deletion with reconciliation that already applied its captured secrets.
    await operations.enqueue(session, kind=OperationKind.organization_create, target_id=organization_id, coalesce=False)


async def resolve(session: AsyncSession, organization_id: UUID, connection_id: UUID | None, image: Image) -> RegistryConnection | None:
    """Resolve a retained connection within its organization and image host."""

    # Public images do not need a registry connection.
    if connection_id is None:
        return None

    # Never search other organizations or try unrelated credentials.
    connection = await session.get(RegistryConnection, connection_id, populate_existing=True)
    if connection is None or connection.organization_id != organization_id:
        raise NotFoundError("Registry connection not found")
    if connection.host != image.registry:
        raise InvalidError("Registry connection does not match the image host")
    return connection


async def inspect(session: AsyncSession, organization_id: UUID | None, image: Image) -> tuple[LongLinkMetadata, UUID | None]:
    """Inspect anonymously first, then find an authorized organization-scoped pull credential."""

    # Public images must not depend on saved credentials; retry only registry access denials.
    try:
        metadata = await images.required_metadata(image)
        return metadata, None
    except ForbiddenError:
        if organization_id is None or image.registry != RegistryConnection.host:
            raise

    # Only matching credentials in the caller-authorized organization may reach this registry.
    result = await session.scalars(
        select(RegistryConnection).where(col(RegistryConnection.organization_id) == organization_id).order_by(col(RegistryConnection.id))
    )
    connections = result.all()
    for connection in connections:
        # Stop on a successful lookup or a non-authentication error, never masking invalid metadata.
        try:
            metadata = await images.required_metadata(image, connection)
            return metadata, connection.id
        except ForbiddenError:
            continue

    # Report a stable access error after every eligible credential has been denied.
    raise ForbiddenError("Registry denied image access. Check package permissions and registry credentials.")
