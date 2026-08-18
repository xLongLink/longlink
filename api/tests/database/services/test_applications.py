import pytest
from uuid import uuid4
from factories import create_application, create_organization
from src.errors import ConflictError
from src.models.types import Image
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import applications, organizations
from src.database.models.users import User


async def test_create_allows_creating_organization(users: tuple[User, User, User]) -> None:
    """Create Applications for Organizations queued for reconciliation."""

    # Arrange
    user = users[0]
    organization = await create_organization(user)

    # Act
    async with session_scope() as session:
        application = await applications.create(
            session,
            organization.id,
            "Dashboard",
            slug="dashboard",
            image=Image("ghcr.io/longlink/dashboard@sha256:test"),
            user=user,
            secrets={},
        )
        await session.commit()

    # Assert
    assert application.name == "Dashboard"
    assert application.organization_id == organization.id
    assert application.image_desired == "ghcr.io/longlink/dashboard@sha256:test"


async def test_create_rejects_duplicate_application_slug_within_organization(users: tuple[User, User, User]) -> None:
    """Reject duplicate application slugs inside the same organization."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="duplicate-org", slug="duplicate-org")
    await create_application(organization, user, name="Dashboard")

    # Act
    async with session_scope() as session:
        with pytest.raises(ConflictError) as exc:
            await applications.create(
                session,
                organization.id,
                "Duplicate dashboard",
                slug="dashboard",
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                user=user,
                secrets={},
            )
        created = await applications.create(
            session,
            organization.id,
            "Reports",
            slug="reports",
            image=Image("ghcr.io/longlink/reports@sha256:test"),
            user=user,
            secrets={},
        )
        await session.commit()

    # Assert
    assert str(exc.value) == "Application slug already exists"
    assert created.slug == "reports"


async def test_fetch_and_organization_applications_ignore_deleted_applications(users: tuple[User, User, User]) -> None:
    """Return only active applications from collection read services."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="collections-org", slug="collections-org")
    deleted_application = await create_application(organization, user, name="Dashboard")
    async with session_scope() as session:
        active_application = await applications.create(
            session,
            organization.id,
            "Reports",
            slug="reports",
            image=Image("ghcr.io/longlink/reports@sha256:test"),
            user=user,
            secrets={},
        )
        await applications.soft_delete(session, deleted_application.id, user)
        await session.commit()

        # Act
        fetched = await applications.fetch(session)
        listed = await organizations.applications(session, organization.id)

    # Assert
    assert [application.id for application in fetched] == [active_application.id]
    assert [application.id for application in listed] == [active_application.id]


async def test_soft_delete_marks_application_deleted(users: tuple[User, User, User]) -> None:
    """Soft-delete an application while scheduling its cleanup operation."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="delete-org", slug="delete-org")
    application = await create_application(organization, user, name="Dashboard")

    # Act
    async with session_scope() as session:
        result = await applications.soft_delete(session, application.id, user)
        await session.commit()
        active_application = await applications.get(session, application.id)
        deleted_application = await applications.get(session, application.id, include_deleted=True)
        second_delete = await applications.soft_delete(session, application.id, user)
        missing_delete = await applications.soft_delete(session, uuid4(), user)
        await session.commit()

    # Assert
    assert result is not None
    assert result.deleted_id == user.id
    assert active_application is None
    assert deleted_application is not None
    assert deleted_application.deleted_id == user.id
    assert second_delete is not None
    assert second_delete.id == result.id
    assert missing_delete is None


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
            user,
        )
        await session.commit()

    # Assert
    assert result is None
