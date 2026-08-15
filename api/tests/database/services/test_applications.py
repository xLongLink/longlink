import pytest
from uuid import uuid4
from sqlmodel import col
from factories import create_application, create_organization
from sqlalchemy import update
from src.errors import ConflictError
from src.models.types import Image
from src.models.statuses import Status
from src.database.session import get_session, session_scope
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
            password="test-password-hash",
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
    async with session_scope() as session:
        with pytest.raises(ConflictError) as exc:
            await applications.create(
                session,
                organization.id,
                "Dashboard",
                slug="dashboard",
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                user=user,
                secrets={},
            )
        await session.execute(update(Organization).where(col(Organization.id) == organization.id).values(status=Status.running))
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
    assert str(exc.value) == "Organization is not ready"
    assert application.name == "Dashboard"
    assert application.organization_id == organization.id
    assert application.image_desired == "ghcr.io/longlink/dashboard@sha256:test"
    assert application.image_deployed is None


async def test_create_rejects_duplicate_application_slug_within_organization() -> None:
    """Reject duplicate application slugs inside the same organization."""

    # Arrange
    user, organization, _ = await create_application_context("duplicate")

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

    # Assert
    assert str(exc.value) == "Application slug already exists"


async def test_fetch_and_organization_applications_ignore_deleted_applications() -> None:
    """Return only active applications from collection read services."""

    # Arrange
    user, organization, deleted_application = await create_application_context("collections")
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


async def test_mark_running_updates_active_applications() -> None:
    """Publish readiness only for active Applications in the creating state."""

    # Arrange
    user, _, application = await create_application_context("runtime")

    # Act
    async with session_scope() as session:
        await applications.mark_running(session, application.id)
        await session.commit()
        running = await applications.get(session, application.id)

    async with session_scope() as session:
        await applications.soft_delete(session, application.id, user)
        await session.commit()
        await applications.mark_running(session, application.id)
        deleted = await applications.get(session, application.id, include_deleted=True)

    # Assert
    assert running is not None
    assert running.status == Status.running
    assert deleted is not None
    assert deleted.status == Status.deleting


async def test_soft_delete_marks_application_deleted() -> None:
    """Soft-delete an application while scheduling its cleanup operation."""

    # Arrange
    user, _, application = await create_application_context("delete")

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
