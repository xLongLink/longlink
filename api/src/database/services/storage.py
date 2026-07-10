from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy import select
from src.errors import ConflictError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.storages import StorageKind
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.storages import StorageRegistry
from src.database.models.applications import Application


async def fetch_all() -> list[StorageRegistry]:
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
    kind: StorageKind,
    name: str,
    slug: str,
    protocol: str,
    endpoint_url: str,
    access_key_id: str,
    secret_access_key: str,
    location_id: UUID,
    user: User,
    runtime_endpoint_url: str | None = None,
) -> StorageRegistry:
    """Create one storage backend registration."""

    # Use one session for duplicate checks and creation.
    async with session_scope() as session:
        result = await session.execute(select(StorageRegistry).where(StorageRegistry.name == name))
        storage = result.scalar_one_or_none()

        # Reject duplicate registry names before insert.
        if storage is not None:
            raise ConflictError("Storage registry already exists")

        storage = StorageRegistry(
            kind=kind,
            name=name,
            slug=slug,
            protocol=protocol,
            endpoint_url=endpoint_url,
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
            runtime_endpoint_url=runtime_endpoint_url or endpoint_url,
            location_id=location_id,
        )
        storage.created_id = user.id
        storage.updated_id = user.id
        session.add(storage)

        # Commit so uniqueness violations surface consistently.
        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise ConflictError("Storage registry already exists") from exc

        await session.refresh(storage)
        statement = (
            select(StorageRegistry)
            .options(
                selectinload(StorageRegistry.created_by),
                selectinload(StorageRegistry.updated_by),
                selectinload(StorageRegistry.deleted_by),
            )
            .where(StorageRegistry.id == storage.id)
        )
        result = await session.execute(statement)
        return result.scalar_one()


async def delete(registry_id: UUID, user: User) -> bool:
    """Soft-delete one storage registry when no active app uses it."""

    # Open a session for the deletion check.
    async with session_scope() as session:
        registry = await session.get(StorageRegistry, registry_id)

        # Treat missing or deleted registries as no-ops.
        if registry is None or registry.deleted_at is not None:
            return False

        active_application = await session.execute(
            select(Application.id).where(
                Application.storage_registry_id == registry_id,
                Application.deleted_at.is_(None),
            )
        )

        # Block deletion while active applications depend on it.
        if active_application.scalar_one_or_none() is not None:
            raise ConflictError("Storage registry is used by active applications")

        now = datetime.now(UTC)
        registry.deleted_at = now
        registry.deleted_id = user.id
        registry.updated_at = now
        registry.updated_id = user.id
        await session.commit()
        return True
