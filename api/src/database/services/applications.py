from uuid import UUID
from typing import Any
from datetime import UTC, datetime
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.roles import ApplicationRoles
from src.models.statuses import ApplicationStatus
from src.database.session import session_scope
from src.models.applications import (ApplicationResponse,
                                     ApplicationMemberResponse)
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization
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


    async def list_by_organization(self, organization_id: UUID, include_deleted: bool = False) -> list[Application]:
        """Return all active applications for one organization."""

        async with session_scope() as session:
            conditions = [Application.organization_id == organization_id]
            if not include_deleted:
                conditions.append(Application.deleted_at.is_(None))

            statement = (
                select(Application)
                .options(*_app_relation_options())
                .where(*conditions)
                .order_by(Application.created_at.asc())
            )
            result = await session.execute(statement)
            return list(result.scalars().all())


    async def list(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> list[tuple[Application, ApplicationRoles | None]]:
        """Return all registered applications for one organization with membership roles."""

        async with session_scope() as session:
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
                        UserApplication.deleted_at.is_(None),
                    ),
                )
                .where(Application.organization_id == organization_id, Application.deleted_at.is_(None))
            )
            result = await session.execute(statement)
            return [(application, role_name) for application, role_name in result.all()]


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

    async def get_by_id(self, application_id: UUID, include_deleted: bool = False) -> Application | None:
        """Return a registered application by id."""

        async with session_scope() as session:
            conditions = [Application.id == application_id]
            if not include_deleted:
                conditions.append(Application.deleted_at.is_(None))

            statement = select(Application).options(*_app_relation_options()).where(*conditions)
            result = await session.execute(statement)
            return result.scalar_one_or_none()


    async def membership_role(self, application_id: UUID, user_id: UUID) -> ApplicationRoles | None:
        """Return one application membership role for one user."""

        async with session_scope() as session:
            statement = select(UserApplication.role_name).where(
                UserApplication.application_id == application_id,
                UserApplication.user_id == user_id,
                UserApplication.deleted_at.is_(None),
            )
            result = await session.execute(statement)
            return result.scalar_one_or_none()


    async def list_members(self, application_id: UUID, organization_id: UUID) -> list[ApplicationMemberResponse]:
        """Return organization members with their application roles."""

        async with session_scope() as session:
            # Start from organization memberships so users without app access are visible.
            statement = (
                select(User, UserOrganization.role_name, UserApplication.role_name)
                .join(UserOrganization, UserOrganization.user_id == User.id)
                .outerjoin(
                    UserApplication,
                    and_(
                        UserApplication.organization_id == UserOrganization.organization_id,
                        UserApplication.application_id == application_id,
                        UserApplication.user_id == User.id,
                        UserApplication.deleted_at.is_(None),
                    ),
                )
                .where(
                    UserOrganization.organization_id == organization_id,
                    UserOrganization.deleted_at.is_(None),
                    User.deleted_at.is_(None),
                )
                .order_by(User.name, User.email)
            )
            result = await session.execute(statement)
            return [
                ApplicationMemberResponse(
                    id=member.id,
                    name=member.name,
                    email=member.email,
                    avatar=member.avatar or "",
                    application_role=application_role,
                    organization_role=organization_role,
                )
                for member, organization_role, application_role in result.all()
            ]


    async def set_member_role(
        self,
        application_id: UUID,
        organization_id: UUID,
        member_id: UUID,
        role: ApplicationRoles | None,
        user: User,
    ) -> bool:
        """Set or remove one organization member's application role."""

        async with session_scope() as session:
            membership_result = await session.execute(
                select(UserOrganization)
                .join(User, User.id == UserOrganization.user_id)
                .where(
                    UserOrganization.organization_id == organization_id,
                    UserOrganization.user_id == member_id,
                    UserOrganization.deleted_at.is_(None),
                    User.deleted_at.is_(None),
                )
            )
            organization_membership = membership_result.scalar_one_or_none()
            if organization_membership is None:
                return False

            application_membership = await session.get(
                UserApplication,
                {
                    "application_id": application_id,
                    "organization_id": organization_id,
                    "user_id": member_id,
                },
            )
            now = datetime.now(UTC)

            if role is None:
                if application_membership is not None and application_membership.deleted_at is None:
                    application_membership.deleted_at = now
                    application_membership.deleted_id = user.id
                    application_membership.updated_at = now
                    application_membership.updated_id = user.id
                await session.commit()
                return True

            if application_membership is None:
                application_membership = UserApplication(
                    application_id=application_id,
                    organization_id=organization_id,
                    user_id=member_id,
                    role_name=role,
                    created_id=user.id,
                    updated_id=user.id,
                )
                session.add(application_membership)
            else:
                application_membership.deleted_at = None
                application_membership.deleted_id = None
                application_membership.updated_at = now
                application_membership.updated_id = user.id
                application_membership.role_name = role

            await session.commit()
            return True


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
        sdk: str | None = None,
        description: str | None = None,
        digest: str | None = None,
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
                'sdk': sdk,
                'digest': digest,
                'version': version,
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


    async def update_runtime(
        self,
        application_id: UUID,
        image: str,
        user: User,
        status: ApplicationStatus = ApplicationStatus.creating,
        compute_registry_id: UUID | None = None,
        database_registry_id: UUID | None = None,
        storage_registry_id: UUID | None = None,
        version: str | None = None,
        sdk: str | None = None,
        description: str | None = None,
        digest: str | None = None,
        icon: str | None = None,
    ) -> Application | None:
        """Update one existing application's runtime metadata."""

        async with session_scope() as session:
            application = await session.get(Application, application_id)
            if application is None or application.deleted_at is not None:
                return None

            # Keep the database metadata aligned with the workload that will be applied.
            application.compute_registry_id = compute_registry_id
            application.database_registry_id = database_registry_id
            application.storage_registry_id = storage_registry_id
            application.sdk = sdk
            application.digest = digest
            application.description = description
            application.updated_id = user.id
            application.version = version
            application.status = status
            application.image = image
            application.icon = icon
            await session.commit()
            await session.refresh(application)
            return application


    async def soft_delete(self, application_id: UUID, user: User) -> Application | None:
        """Soft-delete one application and its application memberships."""

        async with session_scope() as session:
            application = await session.get(Application, application_id)
            if application is None or application.deleted_at is not None:
                return None

            now = datetime.now(UTC)
            application.deleted_at = now
            application.deleted_id = user.id
            application.updated_at = now
            application.updated_id = user.id

            memberships = await session.execute(
                select(UserApplication).where(
                    UserApplication.application_id == application_id,
                    UserApplication.deleted_at.is_(None),
                )
            )
            for membership in memberships.scalars().all():
                membership.deleted_at = now
                membership.deleted_id = user.id
                membership.updated_at = now
                membership.updated_id = user.id

            await session.commit()
            await session.refresh(application)
            statement = select(Application).options(*_app_relation_options()).where(Application.id == application_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()


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
