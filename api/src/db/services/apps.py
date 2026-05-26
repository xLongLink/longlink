from __future__ import annotations

from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from src.db.models import App
from src.db.models.association import user_apps

from .base import ServiceBase


class AppsService(ServiceBase):
    async def list(self, organization: str, user_id: int) -> list[tuple[App, str | None]]:
        '''Return all registered apps for one organization with membership roles.'''

        async with self.session() as session:
            # Join the membership row so the caller can render the app role in one query.
            statement = (
                select(App, user_apps.c.role_name)
                .outerjoin(
                    user_apps,
                    and_(
                        App.organization == user_apps.c.organization_name,
                        App.name == user_apps.c.app_name,
                        user_apps.c.user_id == user_id,
                    ),
                )
                .where(App.organization == organization)
            )
            result = await session.execute(statement)
            return result.all()

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
            # Check the primary-key conflict first so the API can report a clear message.
            name_statement = select(App).where(
                App.organization == organization,
                App.name == name,
            )
            name_result = await session.execute(name_statement)
            if name_result.scalar_one_or_none() is not None:
                raise ValueError('App name already exists')

            # Keep the URL uniqueness check in the service so the route stays thin.
            url_statement = select(App).where(App.url == url)
            url_result = await session.execute(url_statement)
            if url_result.scalar_one_or_none() is not None:
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

    async def delete(self, organization: str, name: str) -> App:
        '''Delete an app by organization and name and return it.'''

        async with self.session() as session:
            # Load the app first so the delete path can raise a single not-found error.
            statement = select(App).where(
                App.organization == organization,
                App.name == name,
            )
            result = await session.execute(statement)
            app = result.scalar_one_or_none()
            if app is None:
                raise ValueError('App not found')

            await session.delete(app)
            try:
                # Surface referential integrity failures as service-level validation errors.
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise ValueError('App has dependent resources') from exc

            return app
