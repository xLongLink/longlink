from sqlalchemy import select
from src.db.models import StorageRegistry
from src.db.session import get_session


class StorageRegistriesService:
    """Manage storage backend registrations."""

    async def list(self) -> list[StorageRegistry]:
        """Return all registered storage backends."""

        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(StorageRegistry))
            return list(result.scalars().all())

    async def get(self, name: str) -> StorageRegistry | None:
        """Return one storage backend by name."""

        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(StorageRegistry).where(StorageRegistry.name == name))
            return result.scalar_one_or_none()

    async def create(
        self,
        name: str,
        protocol: str,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
    ) -> StorageRegistry:
        """Create or update one storage backend registration."""

        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(StorageRegistry).where(StorageRegistry.name == name))
            storage = result.scalar_one_or_none()

            # Create a new registration or refresh the stored connection data.
            if storage is None:
                storage = StorageRegistry(
                    name=name,
                    protocol=protocol,
                    endpoint_url=endpoint_url,
                    access_key_id=access_key_id,
                    secret_access_key=secret_access_key,
                )
                session.add(storage)
            else:
                storage.protocol = protocol
                storage.endpoint_url = endpoint_url
                storage.access_key_id = access_key_id
                storage.secret_access_key = secret_access_key

            await session.commit()
            await session.refresh(storage)
            return storage

    async def delete(self, name: str) -> StorageRegistry | None:
        """Delete one storage backend registration."""

        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(StorageRegistry).where(StorageRegistry.name == name))
            storage = result.scalar_one_or_none()
            # Return early when the registration does not exist.
            if storage is None:
                return None

            await session.delete(storage)
            await session.commit()
            return storage
