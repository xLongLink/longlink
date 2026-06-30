from uuid import UUID
from typing import Any, cast
from datetime import UTC, datetime
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.roles import ApplicationRoles
from src.models.statuses import ApplicationStatus
from src.database.session import session_scope
from src.models.applications import ApplicationResponse
from src.database.models.users import User
from src.database.models.association import UserApplication
from src.database.models.applications import Application
from src.database.models.organizations import Organization


class ApplicationsService:
    async def list_all(self) -> list[Application]:
        """Return all registered applications for admin views."""

        async with session_scope() as session:
            statement = (
                select(Application)
                .join(Organization, Organization.id == Application.organization_id)
                .options(*_app_relation_options())
                .where(Application.deleted_at.is_(None))
                .order_by(Organization.name, Application.name)
            )
            result = await session.execute(statement)
            return list(result.scalars().all())


    async def list_all_responses(self, user: User) -> list[ApplicationResponse]:
        """Return all registered applications as API payloads."""

        applications = await self.list_all()
        return [_response_payload(application, None, user) for application in applications]


    async def list(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> list[tuple[Application, ApplicationRoles | None]]:
        """Return all registered applications for one organization with membership roles."""

        async with session_scope() as session:
            # Join the membership row so the caller can render the app role in one query.
            role_column = cast(Any, UserApplication.role_name)
            statement = (
                select(Application, role_column)
                .options(*_app_relation_options())
                .outerjoin(
                    UserApplication,
                    and_(
                        Application.organization_id == UserApplication.organization_id,
                        Application.id == UserApplication.application_id,
                        UserApplication.user_id == user_id,
                        UserApplication.deleted_at.is_(None),
                    ),
                )
                .where(Application.organization_id == organization_id, Application.deleted_at.is_(None))
            )
            result = await session.execute(statement)
            return cast(list[tuple[Application, ApplicationRoles | None]], result.all())


    async def list_responses(self, organization_id: UUID, user_id: UUID, user: User) -> list[ApplicationResponse]:
        """Return organization applications as API payloads."""

        application_rows = await self.list(organization_id, user_id)
        return [_response_payload(application, role_name, user) for application, role_name in application_rows]


    async def get(self, organization_id: UUID, slug: str) -> Application | None:
        """Return a registered application by organization and slug."""

        async with session_scope() as session:
            statement = select(Application).options(*_app_relation_options()).where(
                Application.organization_id == organization_id,
                Application.slug == slug,
                Application.deleted_at.is_(None),
            )
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def get_by_id(self, application_id: UUID) -> Application | None:
        """Return a registered application by id."""

        async with session_scope() as session:
            statement = select(Application).options(*_app_relation_options()).where(Application.id == application_id, Application.deleted_at.is_(None))
            result = await session.execute(statement)
            return result.scalar_one_or_none()


    async def create(
        self,
        organization_id: UUID,
        name: str,
        slug: str,
        image: str,
        user: User,
        status: ApplicationStatus = ApplicationStatus.creating,
        compute_registry_id: UUID | None = None,
        database_registry_id: UUID | None = None,
        storage_registry_id: UUID | None = None,
        version: str | None = None,
        sdk_version: str | None = None,
        description: str | None = None,
        icon: str | None = None,
    ) -> Application:
        """Add a new application to the database for one organization."""

        async with session_scope() as session:
            # Check slug uniqueness so K8s resource names stay collision-free.
            slug_statement = select(Application).where(
                Application.organization_id == organization_id,
                Application.slug == slug,
            )
            slug_result = await session.execute(slug_statement)
            if slug_result.scalar_one_or_none() is not None:
                raise ValueError('Application slug already exists')

            application_kwargs: dict[str, object] = {
                'organization_id': organization_id,
                'compute_registry_id': compute_registry_id,
                'database_registry_id': database_registry_id,
                'storage_registry_id': storage_registry_id,
                'name': name,
                'slug': slug,
                'status': status,
                'version': version,
                'sdk_version': sdk_version,
                'description': description,
                'image': image,
                'icon': icon,
            }

            application = Application(**application_kwargs)
            application.created_id = user.id
            application.updated_id = user.id
            session.add(application)
            session.add(
                UserApplication(
                    application_id=application.id,
                    user_id=user.id,
                    organization_id=organization_id,
                    role_name=ApplicationRoles.admin,
                    created_id=user.id,
                    updated_id=user.id,
                )
            )
            await session.commit()

            await session.refresh(application)
            statement = select(Application).options(*_app_relation_options()).where(Application.id == application.id)
            result = await session.execute(statement)
            return result.scalar_one()


    async def set_status(self, application_id: UUID, status: ApplicationStatus) -> Application | None:
        """Update one application status and return the refreshed row."""

        async with session_scope() as session:
            application = await session.get(Application, application_id)
            if application is None:
                return None

            application.status = status
            await session.commit()
            await session.refresh(application)
            return application

    async def delete(self, organization_id: UUID, application_id: UUID, deleted_id: UUID | None = None) -> Application:
        """Delete an application by organization and id and return it."""

        async with session_scope() as session:
            # Load the application first so the delete path can raise a single not-found error.
            statement = select(Application).where(Application.organization_id == organization_id, Application.id == application_id, Application.deleted_at.is_(None))
            result = await session.execute(statement)
            application = result.scalar_one_or_none()
            if application is None:
                raise ValueError('Application not found')

            memberships_result = await session.execute(
                select(UserApplication).where(
                    UserApplication.organization_id == organization_id,
                    UserApplication.application_id == application_id,
                    UserApplication.deleted_at.is_(None),
                )
            )
            for membership in memberships_result.scalars().all():
                membership.deleted_at = datetime.now(UTC)
                membership.deleted_id = deleted_id
                membership.updated_id = deleted_id

            application.deleted_at = datetime.now(UTC)
            application.deleted_id = deleted_id
            application.updated_id = deleted_id
            try:
                # Surface referential integrity failures as service-level validation errors.
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise ValueError('Application has dependent resources') from exc

            return application


def _app_relation_options() -> tuple[Any, ...]:
    """Build the shared eager-loading options for application lookups."""

    return (
        selectinload(Application.organization).selectinload(Organization.created_by),
        selectinload(Application.organization).selectinload(Organization.updated_by),
        selectinload(Application.organization).selectinload(Organization.deleted_by),
        selectinload(Application.compute_registry),
        selectinload(Application.database_registry),
        selectinload(Application.storage_registry),
        selectinload(Application.created_by),
        selectinload(Application.updated_by),
        selectinload(Application.deleted_by),
    )


def _response_payload(application: Application, role_name: ApplicationRoles | None, user: User) -> ApplicationResponse:
    """Build one application API payload from a database row."""

    return ApplicationResponse.model_validate(
        {
            **application.model_dump(),
            "organization": application.organization,
            "created_by": application.created_by or user,
            "updated_by": application.updated_by or application.created_by or user,
            "deleted_by": application.deleted_by,
            "role": role_name,
        }
    )


applications = ApplicationsService()
