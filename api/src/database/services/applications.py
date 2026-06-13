from __future__ import annotations

from .base import ServiceBase
from datetime import UTC, datetime
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.applications import AppStatus
from src.database.models.organizations import Organization
from src.database.models.applications import Application
from src.database.models.users import User
from src.database.models.association import UserApplication


class ApplicationsService(ServiceBase):
    async def list_all(self) -> list[Application]:
        """Return all registered applications for admin views."""

        async with self.session() as session:
            statement = (
                select(Application)
                .join(Organization, Organization.id == Application.organization_id)
                .options(*_app_relation_options())
                .order_by(Organization.name, Application.name)
            )
            result = await session.execute(statement)
            return list(result.scalars().all())


    async def list(self, organization_id: str, user_id: str) -> list[tuple[Application, str | None]]:
        """Return all registered applications for one organization with membership roles."""

        async with self.session() as session:
            # Join the membership row so the caller can render the app role in one query.
            statement = (
                select(Application, UserApplication.role_name)
                .options(*_app_relation_options())
                .outerjoin(
                    UserApplication,
                    and_(
                        Application.organization_id == UserApplication.organization_id,
                        Application.id == UserApplication.application_id,
                        UserApplication.user_id == user_id,
                    ),
                )
                .where(Application.organization_id == organization_id, Application.deleted_at.is_(None))
            )
            result = await session.execute(statement)
            return result.all()

    async def get(self, organization_id: str, name: str) -> Application | None:
        """Return a registered application by organization and name."""

        async with self.session() as session:
            statement = select(Application).options(*_app_relation_options()).where(
                Application.organization_id == organization_id,
                Application.name == name,
                Application.deleted_at.is_(None),
            )
            result = await session.execute(statement)
            return result.scalar_one_or_none()


    async def get_by_id(self, application_id: str) -> Application | None:
        """Return a registered application by id."""

        async with self.session() as session:
            statement = select(Application).options(*_app_relation_options()).where(Application.id == application_id, Application.deleted_at.is_(None))
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(
        self,
        organization_id: str,
        name: str,
        slug: str,
        image: str,
        status: AppStatus = AppStatus.creating,
        description: str | None = None,
        icon: str | None = None,
        user: User | None = None,
    ) -> Application:
        """Add a new application to the database for one organization."""

        async with self.session() as session:
            # Check the primary-key conflict first so the API can report a clear message.
            name_statement = select(Application).where(Application.name == name)
            name_result = await session.execute(name_statement)
            if name_result.scalar_one_or_none() is not None:
                raise ValueError('Application name already exists')

            # Check slug uniqueness so K8s resource names stay collision-free.
            slug_statement = select(Application).where(
                Application.organization_id == organization_id,
                Application.slug == slug,
            )
            slug_result = await session.execute(slug_statement)
            if slug_result.scalar_one_or_none() is not None:
                raise ValueError('Application slug already exists')

            app_kwargs: dict[str, object] = {
                'organization_id': organization_id,
                'name': name,
                'slug': slug,
                'status': status,
                'description': description,
                'image': image,
                'icon': icon,
            }

            application = Application(**app_kwargs)
            if user is not None:
                application.created_id = user.id
                application.updated_id = user.id
            session.add(application)
            await session.commit()

            await session.refresh(application)
            statement = select(Application).options(*_app_relation_options()).where(Application.id == application.id)
            result = await session.execute(statement)
            return result.scalar_one()


    async def set_status(self, application_id: str, status: AppStatus) -> Application | None:
        """Update one application status and return the refreshed row."""

        async with self.session() as session:
            application = await session.get(Application, application_id)
            if application is None:
                return None

            application.status = status
            await session.commit()
            await session.refresh(application)
            return application

    async def delete(self, organization_id: str, application_id: str) -> Application:
        """Delete an application by organization and id and return it."""

        async with self.session() as session:
            # Load the application first so the delete path can raise a single not-found error.
            statement = select(Application).where(Application.organization_id == organization_id, Application.id == application_id, Application.deleted_at.is_(None))
            result = await session.execute(statement)
            application = result.scalar_one_or_none()
            if application is None:
                raise ValueError('Application not found')

            application.deleted_at = datetime.now(UTC)
            try:
                # Surface referential integrity failures as service-level validation errors.
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise ValueError('Application has dependent resources') from exc

            return application


def _app_relation_options() -> tuple:
    """Build the shared eager-loading options for application lookups."""

    return (
        selectinload(Application.organization).selectinload(Organization.created_by),
        selectinload(Application.organization).selectinload(Organization.updated_by),
        selectinload(Application.organization).selectinload(Organization.deleted_by),
        selectinload(Application.created_by),
        selectinload(Application.updated_by),
        selectinload(Application.deleted_by),
    )


applications = ApplicationsService()
