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

    async def create(self, name: str, url: str) -> App:
        '''Add a new app to the database.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(App).where(App.url == url)
            result = await session.execute(statement)
            existing_app = result.scalar_one_or_none()
            if existing_app is not None:
                raise ValueError('App URL already exists')

            app = App(name=name, url=url)
            session.add(app)
            await session.commit()
            await session.refresh(app)
            return app
