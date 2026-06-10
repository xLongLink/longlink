from __future__ import annotations

from .base import ServiceBase
from sqlalchemy import and_, select
from src.db.models import App
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.db.models.users import User
from src.db.models.association import UserApp


class AppsService(ServiceBase):
    async def list(self, organization: str, user_id: int) -> list[tuple[App, str | None]]:
        """Return all registered apps for one organization with membership roles."""

        async with self.session() as session:
            # Join the membership row so the caller can render the app role in one query.
            statement = (
                select(App, UserApp.role_name)
                .options(
                    selectinload(App.created_by),
                    selectinload(App.updated_by),
                    selectinload(App.deleted_by),
                )
                .outerjoin(
                    UserApp,
                    and_(
                        App.organization == UserApp.organization_name,
                        App.name == UserApp.app_name,
                        UserApp.user_id == user_id,
                    ),
                )
                .where(App.organization == organization)
            )
            result = await session.execute(statement)
            return result.all()

    async def get(self, organization: str, name: str) -> App | None:
        """Return a registered app by organization and name."""

        async with self.session() as session:
            statement = select(App).options(
                selectinload(App.created_by),
                selectinload(App.updated_by),
                selectinload(App.deleted_by),
            ).where(App.organization == organization, App.name == name)
            result = await session.execute(statement)
            return result.scalar_one_or_none()


    async def get_by_id(self, app_id: int) -> App | None:
        """Return a registered app by id."""

        async with self.session() as session:
            statement = select(App).options(
                selectinload(App.created_by),
                selectinload(App.updated_by),
                selectinload(App.deleted_by),
            ).where(App.id == app_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(
        self,
        organization: str,
        name: str,
        slug: str,
        image: str,
        description: str | None = None,
        icon: str | None = None,
        user: User | None = None,
    ) -> App:
        """Add a new app to the database for one organization."""

        async with self.session() as session:
            # Check the primary-key conflict first so the API can report a clear message.
            name_statement = select(App).where(App.name == name)
            name_result = await session.execute(name_statement)
            if name_result.scalar_one_or_none() is not None:
                raise ValueError('App name already exists')

            # Check slug uniqueness so K8s resource names stay collision-free.
            slug_statement = select(App).where(
                App.organization == organization,
                App.slug == slug,
            )
            slug_result = await session.execute(slug_statement)
            if slug_result.scalar_one_or_none() is not None:
                raise ValueError('App slug already exists')

            app_kwargs: dict[str, str | None] = {
                'organization': organization,
                'name': name,
                'slug': slug,
                'description': description,
                'image': image,
                'icon': icon,
            }

            app = App(**app_kwargs)
            if user is not None:
                app.created_by_id = user.id
                app.updated_by_id = user.id
            session.add(app)
            await session.commit()
            await session.refresh(app)
            return app

    async def delete(self, organization: str, app_id: int) -> App:
        """Delete an app by organization and id and return it."""

        async with self.session() as session:
            # Load the app first so the delete path can raise a single not-found error.
            statement = select(App).where(App.organization == organization, App.id == app_id)
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
