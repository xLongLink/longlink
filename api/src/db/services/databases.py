from sqlalchemy import select

from src.db.models import Database
from src.db.session import get_session


class DatabasesService:
    async def list(self) -> list[Database]:
        '''Return all configured database root connections.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(Database)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, database_id: int) -> Database | None:
        '''Return a database root connection by id.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(Database).where(Database.id == database_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(
        self,
        *,
        type: str,
        host: str,
        port: int,
        name: str,
        username: str,
        password: str,
    ) -> Database:
        '''Create a database root connection.'''

        Session = await get_session()
        async with Session() as session:
            database = Database(
                type=type,
                host=host,
                port=port,
                name=name,
                username=username,
                password=password,
            )
            session.add(database)
            await session.commit()
            await session.refresh(database)
            return database

    async def update(
        self,
        database_id: int,
        *,
        type: str,
        host: str,
        port: int,
        name: str,
        username: str,
        password: str,
    ) -> Database | None:
        '''Update a database root connection.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(Database).where(Database.id == database_id)
            result = await session.execute(statement)
            database = result.scalar_one_or_none()
            if database is None:
                return None

            database.type = type
            database.host = host
            database.port = port
            database.name = name
            database.username = username
            database.password = password

            await session.commit()
            await session.refresh(database)
            return database

    async def delete(self, database_id: int) -> bool:
        '''Delete a database root connection by id.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(Database).where(Database.id == database_id)
            result = await session.execute(statement)
            database = result.scalar_one_or_none()
            if database is None:
                return False

            await session.delete(database)
            await session.commit()
            return True
