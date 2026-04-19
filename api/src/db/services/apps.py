from __future__ import annotations

from sqlalchemy import select
from src.db.models import App
from src.db.session import get_session


class AppsService:
    async def list(self) -> list[App]:
        '''Return all registered apps.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(App)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def list_by_type(self, app_type: str) -> list[App]:
        '''Return all registered apps matching a type.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(App).where(App.type == app_type)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get_by_uuid(self, app_uuid: str) -> App | None:
        '''Return a registered app by UUID.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(App).where(App.id == app_uuid)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> App | None:
        '''Return a registered app by name.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(App).where(App.name == name)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def get_by_url(self, url: str) -> App | None:
        '''Return a registered app by URL.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(App).where(App.url == url)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def get_by_key(self, key: str) -> App | None:
        '''Return a registered app by key.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(App).where(App.key == key)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(
        self,
        name: str,
        url: str,
        key: str,
        app_type: str,
        app_id: str | None = None,
    ) -> App:
        '''Add a new app to the database.'''

        Session = await get_session()

        async with Session() as session:
            statement = select(App).where(App.url == url)
            result = await session.execute(statement)
            existing_app = result.scalar_one_or_none()
            if existing_app is not None:
                raise ValueError('App URL already exists')

            key_statement = select(App).where(App.key == key)
            key_result = await session.execute(key_statement)
            existing_key = key_result.scalar_one_or_none()
            if existing_key is not None:
                raise ValueError('App key already exists')

            if app_id is not None:
                id_statement = select(App).where(App.id == app_id)
                id_result = await session.execute(id_statement)
                existing_id = id_result.scalar_one_or_none()
                if existing_id is not None:
                    raise ValueError('App id already exists')

            app_kwargs: dict[str, str] = {
                'name': name,
                'url': url,
                'key': key,
                'type': app_type,
            }
            if app_id is not None:
                app_kwargs['id'] = app_id

            app = App(**app_kwargs)
            session.add(app)
            await session.commit()
            await session.refresh(app)
            return app
