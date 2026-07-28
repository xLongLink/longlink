import pytest
from uuid import uuid4
from fastapi import HTTPException
from factories import create_application, create_organization, mark_organization_running, create_ready_infrastructure
from src.environments import env
from src.models.statuses import Status
from src.database.session import get_session
from src.database.services import compute, operations, applications, organizations
from src.models.operations import OperationKind, OperationStatus
from src.database.models.users import User
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def create_application_context(prefix: str) -> tuple[User, Organization, Application]:
    """Create a user, organization, and application for service tests."""

    user = await create_user(prefix)
    await create_ready_infrastructure(slug=f"{prefix}-compute", name=f"{prefix} compute")
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


async def test_create_requires_running_organization_and_queues_application_lifecycle() -> None:
    """Create Applications only for running Organizations and queue separate lifecycle work."""

    # Arrange
    user = await create_user("app")
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(user)
    open_before = [item for item in await operations.fetch() if item.finished_at is None]

    # Act
    with pytest.raises(HTTPException) as exc:
        await applications.create(
            organization.id,
            "Dashboard",
            slug="dashboard",
            image="ghcr.io/longlink/dashboard@sha256:test",
            user=user,
        )
    await mark_organization_running(organization)
    application, operation = await applications.create(
        organization.id,
        "Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard@sha256:test",
        sdk="1.2.3",
        version="2.0.0",
        user=user,
    )
    reloaded_compute = await compute.get(infrastructure.compute.id)
    open_after = [item for item in await operations.fetch() if item.finished_at is None]

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Organization is not ready"
    assert application.name == "Dashboard"
    assert application.organization_id == organization.id
    assert application.image == "ghcr.io/longlink/dashboard@sha256:test"
    assert application.sdk == "1.2.3"
    assert application.version == "2.0.0"
    assert operation.id != open_before[0].id
    assert operation.kind == OperationKind.application_create
    assert open_before[0].kind == OperationKind.organization_create
    assert reloaded_compute is not None
    assert reloaded_compute.status == Status.running
    assert reloaded_compute.version == env.VERSION
    assert len(open_before) == 1
    assert {item.id for item in open_after} == {open_before[0].id, operation.id}
    assert {(item.kind, item.target_id) for item in open_after} == {
        (OperationKind.organization_create, organization.id),
        (OperationKind.application_create, application.id),
    }
    assert all(item.platform_version == env.VERSION for item in open_after)
    assert all(item.status == OperationStatus.scheduled for item in open_after)


async def test_create_rejects_duplicate_application_slug_within_organization() -> None:
    """Reject duplicate application slugs inside the same organization."""

    # Arrange
    user, organization, _ = await create_application_context("duplicate")

    # Act
    with pytest.raises(HTTPException) as exc:
        await applications.create(
            organization.id,
            "Duplicate dashboard",
            slug="dashboard",
            image="ghcr.io/longlink/dashboard@sha256:test",
            user=user,
        )

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Application slug already exists"


async def test_fetch_and_organization_applications_ignore_deleted_applications() -> None:
    """Return only active applications from collection read services."""

    # Arrange
    user, organization, deleted_application = await create_application_context("collections")
    active_application, _ = await applications.create(
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
    by_id = await applications.get(application.id)
    await applications.soft_delete(application.id, user)
    deleted_by_id = await applications.get(application.id)
    included_by_id = await applications.get(application.id, include_deleted=True)

    # Assert
    assert by_id is not None
    assert by_id.id == application.id
    assert deleted_by_id is None
    assert included_by_id is not None
    assert included_by_id.deleted_id == user.id


async def test_set_status_modifies_active_applications() -> None:
    """Update application status only for active Applications in the expected state."""

    # Arrange
    user, _, application = await create_application_context("runtime")

    # Act
    await applications.set_status(uuid4(), Status.creating, Status.running)
    await applications.set_status(application.id, Status.creating, Status.running)
    running = await applications.get(application.id)
    await applications.soft_delete(application.id, user)
    deleted_status = await applications.set_status(application.id, Status.running, Status.failed)

    # Assert
    assert running is not None
    assert running.status == Status.running
    assert deleted_status is False


async def test_soft_delete_marks_application_deleted() -> None:
    """Soft-delete an application and queue its cleanup operation."""

    # Arrange
    user, organization, application = await create_application_context("delete")

    # Act
    result = await applications.soft_delete(application.id, user)
    active_application = await applications.get(application.id)
    deleted_application = await applications.get(application.id, include_deleted=True)
    second_delete = await applications.soft_delete(application.id, user)
    missing_delete = await applications.soft_delete(uuid4(), user)
    compute_after = await compute.get(organization.compute_id)
    open_operations = [item for item in await operations.fetch() if item.finished_at is None]

    # Assert
    assert result is not None
    assert result.deleted_id == user.id
    assert active_application is None
    assert deleted_application is not None
    assert deleted_application.deleted_id == user.id
    assert second_delete is not None
    assert second_delete.id == result.id
    assert missing_delete is None
    assert compute_after is not None
    assert compute_after.status == Status.running
    assert compute_after.version == env.VERSION
    assert {item.kind for item in open_operations} == {
        OperationKind.application_create,
        OperationKind.application_delete,
        OperationKind.organization_create,
    }
    deletion = next(item for item in open_operations if item.kind == OperationKind.application_delete)
    assert deletion.kind == OperationKind.application_delete
    assert deletion.target_id == application.id
    assert deletion.platform_version == env.VERSION
    assert deletion.status == OperationStatus.scheduled
