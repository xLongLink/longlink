import pytest
from factories import create_application, create_organization
from src.errors import ConflictError
from src.models.types import Image
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import applications
from src.models.pagination import Pagination
from src.database.models.users import User
from src.database.models.applications import Application


async def test_create_rejects_duplicate_application_slug_within_organization(users: tuple[User, User, User]) -> None:
    """Reject duplicate application slugs inside the same organization."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="duplicate-org", slug="duplicate-org")
    await create_application(organization, name="Dashboard")

    # Act
    async with session_scope() as session:
        with pytest.raises(ConflictError):
            await applications.create(
                session,
                organization.id,
                "Dashboard",
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                secrets={},
            )
        created = await applications.create(
            session,
            organization.id,
            "Reports",
            image=Image("ghcr.io/longlink/reports@sha256:test"),
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
    deleted_application = await create_application(organization, name="Dashboard")
    active_application = await create_application(organization, name="Reports")
    async with session_scope() as session:
        deleted_application = await session.get(Application, deleted_application.id)
        assert deleted_application is not None
        deleted_application.deleted_at = utcnow()
        await session.commit()

        # Act
        fetched, total = await applications.fetch_page(session, Pagination())

    # Assert
    assert [application.id for application in fetched] == [active_application.id]
    assert total == 1


async def test_delete_marks_application_deleted(users: tuple[User, User, User]) -> None:
    """Soft-delete an application while scheduling its cleanup operation."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="delete-org", slug="delete-org")
    application = await create_application(organization, name="Dashboard")

    # Act
    async with session_scope() as session:
        await applications.delete(session, application.id, user.id)
        await session.commit()
        deleted_application = await session.get(Application, application.id)

    # Assert
    assert deleted_application is not None
    assert deleted_application.deleted_at is not None
