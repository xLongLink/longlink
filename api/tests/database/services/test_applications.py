import pytest
from factories import create_application, create_organization
from src.errors import ConflictError
from src.models.types import Image
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import applications, organizations
from src.models.pagination import Pagination
from src.database.models.users import User
from src.database.models.applications import Application


async def test_create_rejects_duplicate_application_slug_within_organization(users: tuple[User, User, User]) -> None:
    """Reject duplicate application slugs inside the same organization."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="duplicate-org")
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


async def test_fetch_ignores_deleted_applications(users: tuple[User, User, User]) -> None:
    """Return only active applications for administrator views."""

    # Arrange
    user = users[0]
    organization = await create_organization(user, name="collections-org")
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


async def test_create_rejects_tombstoned_organization(users: tuple[User, User, User]) -> None:
    """Prevent new applications from restoring a deleted Organization."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    async with session_scope() as session:
        await organizations.soft_delete(session, organization.id, owner)
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match="Organization is not available"):
            await applications.create(
                session,
                organization.id,
                "Dashboard",
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                secrets={},
            )

    # Assert
    async with session_scope() as session:
        fetched, total = await applications.fetch_page(session, Pagination())
    assert fetched == []
    assert total == 0
