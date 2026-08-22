import pytest
from uuid import uuid4
from factories import create_application, create_organization
from src.errors import ConflictError, ForbiddenError
from src.models.types import Image
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import applications, organizations
from src.database.models.users import User
from src.database.models.applications import Application


async def test_create_rejects_duplicate_application_slug_within_organization(users: tuple[User, User, User]) -> None:
    """Reject duplicate application slugs inside the same organization."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="duplicate-org", slug="duplicate-org")
    await create_application(organization, user, name="Dashboard")

    # Act
    async with session_scope() as session:
        with pytest.raises(ConflictError):
            await applications.create(
                session,
                organization.id,
                "Dashboard",
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                user_id=user.id,
                secrets={},
            )
        created = await applications.create(
            session,
            organization.id,
            "Reports",
            image=Image("ghcr.io/longlink/reports@sha256:test"),
            user_id=user.id,
            secrets={},
        )
        await session.commit()

    # Assert
    assert created.slug == "reports"


async def test_fetch_ignores_deleted_applications(users: tuple[User, User, User]) -> None:
    """Return only active applications for administrator views."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="collections-org", slug="collections-org")
    deleted_application = await create_application(organization, user, name="Dashboard")
    async with session_scope() as session:
        deleted_application = await session.get(Application, deleted_application.id)
        assert deleted_application is not None
        deleted_application.deleted_at = utcnow()
        active_application = await applications.create(
            session,
            organization.id,
            "Reports",
            image=Image("ghcr.io/longlink/reports@sha256:test"),
            user_id=user.id,
            secrets={},
        )
        await session.commit()

        # Act
        fetched = await applications.fetch(session)

    # Assert
    assert [application.id for application in fetched] == [active_application.id]


async def test_delete_marks_application_deleted(users: tuple[User, User, User]) -> None:
    """Soft-delete an application while scheduling its cleanup operation."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="delete-org", slug="delete-org")
    application = await create_application(organization, user, name="Dashboard")

    # Act
    async with session_scope() as session:
        await applications.delete(session, application.id, user.id)
        await session.commit()
        deleted_application = await session.get(Application, application.id)
        with pytest.raises(ForbiddenError):
            await applications.delete(session, uuid4(), user.id)

    # Assert
    assert deleted_application is not None
    assert deleted_application.deleted_id == user.id


async def test_release_requires_an_active_organization(users: tuple[User, User, User]) -> None:
    """Reject releases after the owning Organization is tombstoned."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="release-org", slug="release-org")
    application = await create_application(organization, user, name="Dashboard")

    # Act
    async with session_scope() as session:
        await organizations.soft_delete(session, organization.id, user)
        result = await applications.release(
            session,
            application.id,
            Image("ghcr.io/longlink/dashboard@sha256:release"),
            "Updated dashboard",
            user.id,
        )
        await session.commit()

    # Assert
    assert result is None
