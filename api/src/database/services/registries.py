from uuid import UUID
from sqlmodel import col
from src.utils import images
from sqlalchemy import select, update
from src.errors import InvalidError, ConflictError, NotFoundError, ForbiddenError
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.registries import RegistryProvider
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.registries import RegistryConnection
from src.database.models.organizations import Organization


async def lock(session: AsyncSession, organization_id: UUID) -> None:
    """Serialize registry mutations, secret synchronization, and revision admission."""

    # SQLite requires a write reservation rather than SELECT FOR UPDATE.
    if session.get_bind().dialect.name == "sqlite":
        await session.execute(
            update(Organization).where(col(Organization.id) == organization_id).values(updated_at=col(Organization.updated_at))
        )
    organization = await session.scalar(select(Organization).where(col(Organization.id) == organization_id).with_for_update())
    if organization is None or organization.deleted_at is not None:
        raise ConflictError("Organization is not available")


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
        if organization_id is None or image.registry != RegistryProvider.ghcr.host:
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
