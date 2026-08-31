from uuid import UUID
from sqlalchemy import func, select
from src.errors import ConflictError, NotFoundError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import load_only
from collections.abc import Sequence
from src.models.pagination import Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.storages import StorageRegistry
from src.database.models.organizations import Organization


async def fetch_page(session: AsyncSession, pagination: Pagination) -> tuple[Sequence[StorageRegistry], int]:
    """Return one ordered page of storage registries."""

    # Load only the fields exposed by the administrator response.
    statement = (
        select(StorageRegistry)
        .options(
            load_only(
                StorageRegistry.id,
                StorageRegistry.name,
                StorageRegistry.endpoint_url,
            )
        )
        .order_by(StorageRegistry.name, StorageRegistry.id)
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    result = await session.scalars(statement)

    # Count every registered storage target.
    count_result = await session.execute(select(func.count()).select_from(StorageRegistry))
    return result.all(), count_result.scalar_one()


async def create(session: AsyncSession, name: str, endpoint_url: str, access_key_id: str, secret_access_key: str) -> StorageRegistry:
    """Register one Exoscale SOS backend."""

    # Persist the complete provider connection so each registry has an independent provisioning identity.
    registry = StorageRegistry(
        name=name,
        endpoint_url=endpoint_url,
        access_key_id=access_key_id,
        secret_access_key=secret_access_key,
    )
    session.add(registry)

    # Translate unique registry names to one stable API conflict.
    try:
        await session.flush()
    except IntegrityError as exc:
        raise ConflictError("Storage registry already exists") from exc

    return registry


async def delete(session: AsyncSession, registry_id: UUID) -> None:
    """Delete an unused object-storage registry."""

    # Lock the registry while checking immutable Organization assignments.
    registry = await session.get(StorageRegistry, registry_id, with_for_update=True)
    if registry is None:
        raise NotFoundError("Storage registry not found")

    # Keep registries assigned to active or cleanup-pending Organizations available.
    if await session.scalar(select(Organization.id).where(Organization.storage_id == registry_id).limit(1)) is not None:
        raise ConflictError("Storage registry is used by organizations")

    # Internal registries have no soft-delete or audit lifecycle.
    await session.delete(registry)
