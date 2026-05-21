from __future__ import annotations

from sqlalchemy import select
from src.db.models import App
from sqlalchemy.exc import IntegrityError

from .base import ServiceBase


class AppsService(ServiceBase):
    async def list(self, organization: str) -> list[App]:
        '''Return all registered apps for one organization.'''

        async with self.session() as session:
            statement = select(App).where(App.organization == organization)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, organization: str, name: str) -> App | None:
        '''Return a registered app by organization and name.'''

        async with self.session() as session:
            statement = select(App).where(
                App.organization == organization,
                App.name == name,
            )
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(
        self,
        organization: str,
        name: str,
        url: str,
        image: str,
    ) -> App:
        '''Add a new app to the database for one organization.'''

        async with self.session() as session:
            statement = select(App).where(
                App.organization == organization,
                App.url == url,
            )
            result = await session.execute(statement)
            existing_app = result.scalar_one_or_none()
            if existing_app is not None:
                raise ValueError('App URL already exists')

            app_kwargs: dict[str, str] = {
                'organization': organization,
                'name': name,
                'url': url,
                'image': image,
            }

            app = App(**app_kwargs)
            session.add(app)
            await session.commit()
            await session.refresh(app)
            return app

    async def delete(self, organization: str, name: str) -> App | None:
        '''Delete an app by organization and name and return it when found.'''

        async with self.session() as session:
            # Load the app first so callers can still access its identifying fields.
            statement = select(App).where(
                App.organization == organization,
                App.name == name,
            )
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
