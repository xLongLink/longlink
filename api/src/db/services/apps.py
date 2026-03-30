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

    async def get_by_token(self, token: str) -> App | None:
        '''Return a registered app by token.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(App).where(App.token == token)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(self, name: str, url: str, token: str) -> App:
        '''Add a new app to the database.'''

        Session = await get_session()

        async with Session() as session:
            statement = select(App).where(App.url == url)
            result = await session.execute(statement)
            existing_app = result.scalar_one_or_none()
            if existing_app is not None:
                raise ValueError('App URL already exists')

            token_statement = select(App).where(App.token == token)
            token_result = await session.execute(token_statement)
            existing_token = token_result.scalar_one_or_none()
            if existing_token is not None:
                raise ValueError('App token already exists')

            app = App(name=name, url=url, token=token)
            session.add(app)
            await session.commit()
            await session.refresh(app)
            return app
