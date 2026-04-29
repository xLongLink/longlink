from __future__ import annotations

from sqlalchemy import select
from src.db.models import App
from sqlalchemy.exc import IntegrityError
from src.db.session import get_session


class AppsService:
    async def list(self) -> list[App]:
        '''Return all registered apps.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(App)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, name: str) -> App | None:
        '''Return a registered app by name.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(App).where(App.name == name)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(
        self,
        name: str,
        url: str,
        image: str,
    ) -> App:
        '''Add a new app to the database.'''

        Session = await get_session()

        async with Session() as session:
            statement = select(App).where(App.url == url)
            result = await session.execute(statement)
            existing_app = result.scalar_one_or_none()
            if existing_app is not None:
                raise ValueError('App URL already exists')

            app_kwargs: dict[str, str] = {
                'name': name,
                'url': url,
                'image': image,
            }

            app = App(**app_kwargs)
            session.add(app)
            await session.commit()
            await session.refresh(app)
            return app

    async def delete(self, name: str) -> App | None:
        '''Delete an app by name and return the deleted app when found.'''

        Session = await get_session()

        async with Session() as session:
            # Load the app first so callers can still access its identifying fields.
            statement = select(App).where(App.name == name)
            result = await session.execute(statement)
            app = result.scalar_one_or_none()
            if app is None:
                return None

            await session.delete(app)
            try:
                # Surface referential integrity failures as service-level validation errors.
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise ValueError('App has dependent resources') from exc

            return app
