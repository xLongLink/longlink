from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.models.storage import StorageKind
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.storage import StorageRegistry
from src.utils.utils import slugify


class StorageService:
    """Manage storage backend registrations."""

    async def list(self) -> list[StorageRegistry]:
        """Return all registered storage backends."""

        async with session_scope() as session:
            statement = select(StorageRegistry).options(
                selectinload(StorageRegistry.created_by),
                selectinload(StorageRegistry.updated_by),
                selectinload(StorageRegistry.deleted_by),
            )
            result = await session.execute(statement)
            return result.scalars().all()

    async def get(self, registry_id: str) -> StorageRegistry | None:
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
        location_id: str,
        user: User,
    ) -> StorageRegistry:
        """Create or update one storage backend registration."""

        async with session_scope() as session:
            result = await session.execute(select(StorageRegistry).where(StorageRegistry.name == name))
            storage = result.scalar_one_or_none()

            # Create a new registration or refresh the stored connection data.
            if storage is None:
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
            else:
                storage.kind = kind
                storage.protocol = protocol
                storage.endpoint_url = endpoint_url
                storage.access_key_id = access_key_id
                storage.secret_access_key = secret_access_key
                storage.location_id = location_id
                storage.slug = slugify(name)
                storage.updated_id = user.id
                storage.deleted_at = None
                storage.deleted_id = None

            await session.commit()
            await session.refresh(storage)
            statement = select(StorageRegistry).options(
                selectinload(StorageRegistry.created_by),
                selectinload(StorageRegistry.updated_by),
                selectinload(StorageRegistry.deleted_by),
            ).where(StorageRegistry.id == storage.id)
            result = await session.execute(statement)
            return result.scalar_one()

    async def delete(self, registry_id: str, deleted_id: str | None = None) -> StorageRegistry | None:
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
