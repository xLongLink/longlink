from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.utils.utils import slugify
from src.models.storages import StorageKind
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.storages import StorageRegistry


class StorageService:
    """Manage storage backend registrations."""

    async def list(self) -> list[StorageRegistry]:
        """Return all registered storage backends."""

        async with session_scope() as session:
            statement = select(StorageRegistry).options(
                selectinload(StorageRegistry.created_by),
                selectinload(StorageRegistry.updated_by),
                selectinload(StorageRegistry.deleted_by),
            ).where(StorageRegistry.deleted_at.is_(None))
            result = await session.execute(statement)
            return result.scalars().all()

    async def get(self, registry_id: UUID) -> StorageRegistry | None:
        """Return one storage backend by id."""

        async with session_scope() as session:
            statement = select(StorageRegistry).options(
                selectinload(StorageRegistry.created_by),
                selectinload(StorageRegistry.updated_by),
                selectinload(StorageRegistry.deleted_by),
            ).where(StorageRegistry.id == registry_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()


    async def create(
        self,
        kind: StorageKind,
        name: str,
        protocol: str,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
        location_id: UUID,
        user: User,
    ) -> StorageRegistry:
        """Create one storage backend registration."""

        async with session_scope() as session:
            result = await session.execute(select(StorageRegistry).where(StorageRegistry.name == name))
            storage = result.scalar_one_or_none()
            if storage is not None:
                raise ValueError("Storage registry already exists")

            slug = slugify(name)
            storage = StorageRegistry(
                kind=kind,
                name=name,
                slug=slug,
                protocol=protocol,
                endpoint_url=endpoint_url,
                access_key_id=access_key_id,
                secret_access_key=secret_access_key,
                location_id=location_id,
            )
            storage.created_id = user.id
            storage.updated_id = user.id
            session.add(storage)

            try:
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise ValueError("Storage registry already exists") from exc

            await session.refresh(storage)
            statement = select(StorageRegistry).options(
                selectinload(StorageRegistry.created_by),
                selectinload(StorageRegistry.updated_by),
                selectinload(StorageRegistry.deleted_by),
            ).where(StorageRegistry.id == storage.id)
            result = await session.execute(statement)
            return result.scalar_one()

    async def delete(self, registry_id: UUID, deleted_id: UUID | None = None) -> StorageRegistry | None:
        """Mark one storage backend registration as deleted."""

        async with session_scope() as session:
            result = await session.execute(
                select(StorageRegistry).options(
                    selectinload(StorageRegistry.created_by),
                    selectinload(StorageRegistry.updated_by),
                    selectinload(StorageRegistry.deleted_by),
                ).where(StorageRegistry.id == registry_id)
            )
            storage = result.scalar_one_or_none()
            # Return early when the registration does not exist.
            if storage is None:
                return None

            storage.deleted_at = datetime.now(UTC)
            storage.deleted_id = deleted_id
            storage.updated_id = deleted_id
            await session.commit()
            await session.refresh(storage)
            return storage

storage = StorageService()
