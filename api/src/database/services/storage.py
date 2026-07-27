from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from src.database.session import session_scope
from src.database.models.storages import StorageRegistry
from src.database.models.organizations import Organization


async def fetch() -> list[StorageRegistry]:
    """Return all registered storage backends."""

    # Open a session for the registry list query.
    async with session_scope() as session:
        result = await session.execute(select(StorageRegistry))
        return result.scalars().all()


async def get(registry_id: UUID) -> StorageRegistry | None:
    """Return one storage backend by id."""

    # Open a session for the registry lookup.
    async with session_scope() as session:
        statement = select(StorageRegistry).where(StorageRegistry.id == registry_id)
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def create(name: str, slug: str, endpoint_url: str, access_key_id: str, secret_access_key: str) -> StorageRegistry:
    """Register one Exoscale SOS backend."""

    # Persist the complete provider connection so each registry has an independent provisioning identity.
    async with session_scope() as session:
        registry = StorageRegistry(
            name=name,
            slug=slug,
            endpoint_url=endpoint_url,
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
        )
        session.add(registry)

        # Translate unique registry names and slugs to one stable API conflict.
        try:
            await session.commit()
        except IntegrityError as exc:
            raise HTTPException(status_code=409, detail="Storage registry already exists") from exc

        return registry


async def delete(registry_id: UUID) -> bool:
    """Delete an unused object-storage registry."""

    # Lock the registry while checking immutable Organization assignments.
    async with session_scope() as session:
        registry = (
            await session.execute(select(StorageRegistry).where(StorageRegistry.id == registry_id).with_for_update())
        ).scalar_one_or_none()
        if registry is None:
            return False

        # Keep registries assigned to active or cleanup-pending Organizations available.
        organization_id = (
            await session.execute(select(Organization.id).where(Organization.storage_id == registry_id).limit(1))
        ).scalar_one_or_none()
        if organization_id is not None:
            raise HTTPException(status_code=409, detail="Storage registry is used by organizations")

        # Internal registries have no soft-delete or audit lifecycle.
        await session.delete(registry)
        await session.commit()
        return True
