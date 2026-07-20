from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.environments import env
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.models.users import User
from src.models.infrastructure import StorageKind
from src.database.models.storages import StorageRegistry
from src.database.models.organizations import Organization


async def fetch() -> list[StorageRegistry]:
    """Return all registered storage backends."""

    # Open a session for the registry list query.
    async with session_scope() as session:
        statement = (
            select(StorageRegistry)
            .options(
                selectinload(StorageRegistry.created_by),
                selectinload(StorageRegistry.updated_by),
                selectinload(StorageRegistry.deleted_by),
            )
            .where(StorageRegistry.deleted_at.is_(None))
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def get(registry_id: UUID, include_deleted: bool = False) -> StorageRegistry | None:
    """Return one storage backend by id."""

    # Open a session for the registry lookup.
    async with session_scope() as session:
        conditions = [StorageRegistry.id == registry_id]

        # Hide soft-deleted registries unless explicitly requested.
        if not include_deleted:
            conditions.append(StorageRegistry.deleted_at.is_(None))

        statement = (
            select(StorageRegistry)
            .options(
                selectinload(StorageRegistry.created_by),
                selectinload(StorageRegistry.updated_by),
                selectinload(StorageRegistry.deleted_by),
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def create(
    name: str,
    slug: str,
    kind: StorageKind,
    endpoint_url: str,
    runtime_endpoint_url: str | None,
    access_key_id: str | None,
    secret_access_key: str | None,
    user: User,
) -> StorageRegistry:
    """Register one object-storage backend."""

    # Root MinIO credentials are a local-development convenience, not a production provisioning contract.
    if kind == StorageKind.minio and not env.DEVELOPMENT:
        raise HTTPException(status_code=409, detail="MinIO storage is supported only for local development")
    if kind == StorageKind.minio and (access_key_id is None or secret_access_key is None):
        raise ValueError("MinIO storage requires registry credentials")
    if kind == StorageKind.exoscale:
        env.exoscale()

    # Persist provisioning credentials only at the registry control-plane boundary.
    async with session_scope() as session:
        registry = StorageRegistry(
            kind=kind,
            name=name,
            slug=slug,
            endpoint_url=endpoint_url,
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
            runtime_endpoint_url=runtime_endpoint_url or endpoint_url,
            created_id=user.id,
            updated_id=user.id,
        )
        session.add(registry)

        # Translate unique registry names and slugs to one stable API conflict.
        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise HTTPException(status_code=409, detail="Storage registry already exists") from exc

        return await get(registry.id) or registry


async def delete(registry_id: UUID, user: User) -> StorageRegistry | None:
    """Tombstone an unused object-storage registry."""

    # Lock the registry while checking immutable Organization assignments.
    async with session_scope() as session:
        registry = (
            await session.execute(select(StorageRegistry).where(StorageRegistry.id == registry_id).with_for_update())
        ).scalar_one_or_none()
        if registry is None or registry.deleted_at is not None:
            return None

        # Keep registries assigned to active or cleanup-pending Organizations available.
        organization_id = (
            await session.execute(select(Organization.id).where(Organization.storage_id == registry_id).limit(1))
        ).scalar_one_or_none()
        if organization_id is not None:
            raise HTTPException(status_code=409, detail="Storage registry is used by organizations")

        # Record the administrator and hide the registry from future assignments.
        now = utcnow()
        registry.deleted_at = now
        registry.deleted_id = user.id
        registry.updated_at = now
        registry.updated_id = user.id
        await session.commit()

    return await get(registry_id, include_deleted=True)
