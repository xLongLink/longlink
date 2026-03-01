from sqlalchemy import select

from src.db.models import Storage
from src.db.session import get_session


class StoragesService:
    async def list(self) -> list[Storage]:
        '''Return all configured storage root connections.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(Storage)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, storage_id: int) -> Storage | None:
        '''Return a storage root connection by id.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(Storage).where(Storage.id == storage_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(
        self,
        *,
        type: str,
        base_path: str,
        options: dict[str, object],
    ) -> Storage:
        '''Create a storage root connection.'''

        Session = await get_session()
        async with Session() as session:
            storage = Storage(
                type=type,
                base_path=base_path,
                options=options,
            )
            session.add(storage)
            await session.commit()
            await session.refresh(storage)
            return storage

    async def update(
        self,
        storage_id: int,
        *,
        type: str,
        base_path: str,
        options: dict[str, object],
    ) -> Storage | None:
        '''Update a storage root connection.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(Storage).where(Storage.id == storage_id)
            result = await session.execute(statement)
            storage = result.scalar_one_or_none()
            if storage is None:
                return None

            storage.type = type
            storage.base_path = base_path
            storage.options = options

            await session.commit()
            await session.refresh(storage)
            return storage

    async def delete(self, storage_id: int) -> bool:
        '''Delete a storage root connection by id.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(Storage).where(Storage.id == storage_id)
            result = await session.execute(statement)
            storage = result.scalar_one_or_none()
            if storage is None:
                return False

            await session.delete(storage)
            await session.commit()
            return True
