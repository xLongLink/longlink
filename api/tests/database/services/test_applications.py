import pytest
from uuid import uuid4
from factories import create_application, create_organization, mark_organization_running
from src.errors import ConflictError
from src.models.statuses import Status
from src.database.session import get_session
from src.database.services import applications, organizations
from src.database.models.users import User
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def create_application_context(prefix: str) -> tuple[User, Organization, Application]:
    """Create a user, organization, and application for service tests."""

    user = await create_user(prefix)
    organization = await create_organization(
        user,
        name=f"{prefix}-org",
        slug=f"{prefix}-org",
    )
    application = await create_application(organization, user, name="Dashboard")
    return user, organization, application


async def create_user(prefix: str) -> User:
    """Persist one verified local user for application service tests."""

    Session = await get_session()

    # These tests do not authenticate, so a fixed non-empty hash is sufficient.
    async with Session() as session:
        user = User(
            name=f"{prefix} User",
            email=f"{prefix}@longlink.dev",
            hashed_password="test-password-hash",
        )
        session.add(user)
        await session.commit()
        return user


async def test_create_requires_running_organization() -> None:
    """Create Applications only for running Organizations."""

    # Arrange
    user = await create_user("app")
    organization = await create_organization(user)

    # Act
    with pytest.raises(ConflictError) as exc:
        await applications.create(
            organization.id,
            "Dashboard",
            slug="dashboard",
            image="ghcr.io/longlink/dashboard@sha256:test",
            user=user,
        )
    await mark_organization_running(organization)
    application = await applications.create(
        organization.id,
        "Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard@sha256:test",
        version="2.0.0",
        user=user,
    )

    # Assert
    assert str(exc.value) == "Organization is not ready"
    assert application.name == "Dashboard"
    assert application.organization_id == organization.id
    assert application.image == "ghcr.io/longlink/dashboard@sha256:test"
    assert application.version == "2.0.0"


async def test_create_rejects_duplicate_application_slug_within_organization() -> None:
    """Reject duplicate application slugs inside the same organization."""

    # Arrange
    user, organization, _ = await create_application_context("duplicate")

    # Act
    with pytest.raises(ConflictError) as exc:
        await applications.create(
            organization.id,
            "Duplicate dashboard",
            slug="dashboard",
            image="ghcr.io/longlink/dashboard@sha256:test",
            user=user,
        )

    # Assert
    assert str(exc.value) == "Application slug already exists"


async def test_fetch_and_organization_applications_ignore_deleted_applications() -> None:
    """Return only active applications from collection read services."""

    # Arrange
    user, organization, deleted_application = await create_application_context("collections")
    active_application = await applications.create(
        organization.id,
        "Reports",
        slug="reports",
        image="ghcr.io/longlink/reports@sha256:test",
        user=user,
    )
    await applications.soft_delete(deleted_application.id, user)

    # Act
    fetched = await applications.fetch()
    listed = await organizations.applications(organization.id)
    listed_with_deleted = await organizations.applications(organization.id, include_deleted=True)

    # Assert
    assert [application.id for application in fetched] == [active_application.id]
    assert [application.id for application in listed] == [active_application.id]
    assert [application.id for application in listed_with_deleted] == [deleted_application.id, active_application.id]


async def test_get_services_return_active_applications_and_respect_include_deleted() -> None:
    """Return applications through direct read services and hide deleted rows by default."""

    # Arrange
    user, _, application = await create_application_context("reads")

    # Act
    await applications.soft_delete(application.id, user)
    deleted_by_id = await applications.get(application.id)
    included_by_id = await applications.get(application.id, include_deleted=True)

    # Assert
    assert deleted_by_id is None
    assert included_by_id is not None
    assert included_by_id.deleted_id == user.id


async def test_mark_running_updates_active_applications() -> None:
    """Publish readiness only for active Applications in the creating state."""

    # Arrange
    user, _, application = await create_application_context("runtime")

    # Act
    marked_running = await applications.mark_running(application.id)
    running = await applications.get(application.id)
    await applications.soft_delete(application.id, user)
    deleted_status = await applications.mark_running(application.id)

    # Assert
    assert marked_running is True
    assert running is not None
    assert running.status == Status.running
    assert deleted_status is False


async def test_soft_delete_marks_application_deleted() -> None:
    """Soft-delete an application without scheduling its cleanup operation."""

    # Arrange
    user, _, application = await create_application_context("delete")

    # Act
    result = await applications.soft_delete(application.id, user)
    active_application = await applications.get(application.id)
    deleted_application = await applications.get(application.id, include_deleted=True)
    second_delete = await applications.soft_delete(application.id, user)
    missing_delete = await applications.soft_delete(uuid4(), user)

    # Assert
    assert result is not None
    assert result.deleted_id == user.id
    assert active_application is None
    assert deleted_application is not None
    assert deleted_application.deleted_id == user.id
    assert second_delete is not None
    assert second_delete.id == result.id
    assert missing_delete is None
