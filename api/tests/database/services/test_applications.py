import pytest
from uuid import uuid4
from datetime import timedelta
from fastapi import HTTPException
from factories import create_organization, mark_organization_running, create_ready_infrastructure
from src.environments import env
from src.models.roles import ApplicationRoles, OrganizationRoles
from src.models.statuses import ComputeStatus, ApplicationStatus
from longlink.utils.time import utcnow
from src.database.session import get_session
from src.database.services import compute, operations, applications, organizations
from src.models.operations import OperationStatus
from src.database.models.users import User
from src.database.models.operations import Operation
from src.database.models.association import UserOrganization
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def create_application_context(prefix: str) -> tuple[User, Organization, Application]:
    """Create a user, organization, and application for service tests."""

    user = await create_user(prefix)
    infrastructure = await create_ready_infrastructure(user, slug=f"{prefix}-compute", name=f"{prefix} compute")
    organization = await create_organization(
        infrastructure,
        user,
        name=f"{prefix}-org",
        slug=f"{prefix}-org",
    )
    await mark_organization_running(organization)
    application = await applications.create(
        organization.id,
        "Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
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
            is_verified=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


async def test_create_requires_running_organization_and_coalesces_compute_reconciliation() -> None:
    """Create Applications only for running Organizations and coalesce compute work."""

    # Arrange
    user = await create_user("app")
    infrastructure = await create_ready_infrastructure(user)
    organization = await create_organization(infrastructure, user)
    open_before = [item for item in await operations.fetch() if item.stopped_at is None]

    # Act
    with pytest.raises(HTTPException) as exc:
        await applications.create(
            organization.id,
            "Dashboard",
            slug="dashboard",
            image="ghcr.io/longlink/dashboard:latest",
            user=user,
        )
    await mark_organization_running(organization)
    application = await applications.create(
        organization.id,
        "Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    reloaded_compute = await compute.get(infrastructure.compute.id)
    open_after = [item for item in await operations.fetch() if item.stopped_at is None]

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Organization is not ready"
    assert application.name == "Dashboard"
    assert application.organization_id == organization.id
    assert reloaded_compute is not None
    assert reloaded_compute.status == ComputeStatus.ready
    assert reloaded_compute.version == env.VERSION
    assert len(open_before) == 1
    assert [item.id for item in open_after] == [open_before[0].id]
    assert open_after[0].compute_id == infrastructure.compute.id
    assert open_after[0].platform_version == env.VERSION
    assert open_after[0].status == OperationStatus.scheduled


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
            image="ghcr.io/longlink/dashboard:latest",
            user=user,
        )

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Application slug already exists"


async def test_fetch_and_organization_applications_ignore_deleted_applications() -> None:
    """Return only active applications from collection read services."""

    # Arrange
    user, organization, deleted_application = await create_application_context("collections")
    active_application = await applications.create(
        organization.id,
        "Reports",
        slug="reports",
        image="ghcr.io/longlink/reports:latest",
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


async def test_list_members_includes_organization_members_with_optional_application_roles(
    users: tuple[User, User, User],
) -> None:
    """List organization members with their current application roles."""

    # Arrange
    owner, member = users[0], users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    await mark_organization_running(organization)
    application = await applications.create(
        organization.id,
        "Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.read,
            )
        )
        await session.commit()

    # Act
    members = await applications.members(application.id, organization.id)
    members_by_id = {
        member.id: (organization_membership, application_membership) for member, organization_membership, application_membership in members
    }

    # Assert
    owner_organization_membership, owner_application_membership = members_by_id[owner.id]
    member_organization_membership, member_application_membership = members_by_id[member.id]
    assert owner_organization_membership.role == OrganizationRoles.owner
    assert owner_application_membership is not None
    assert owner_application_membership.role == ApplicationRoles.admin
    assert member_organization_membership.role == OrganizationRoles.read
    assert member_application_membership is None


async def test_set_member_role_creates_updates_removes_and_restores_memberships(
    users: tuple[User, User, User],
) -> None:
    """Manage application roles for active organization members."""

    # Arrange
    owner, member, non_member = users
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    await mark_organization_running(organization)
    application = await applications.create(
        organization.id,
        "Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.read,
            )
        )
        await session.commit()

    # Act
    missing = await applications.set_member_role(
        application.id,
        organization.id,
        non_member.id,
        ApplicationRoles.read,
        owner,
    )
    created = await applications.set_member_role(
        application.id,
        organization.id,
        member.id,
        ApplicationRoles.read,
        owner,
    )
    created_role = await applications.membership_role(application.id, member.id)
    updated = await applications.set_member_role(
        application.id,
        organization.id,
        member.id,
        ApplicationRoles.write,
        owner,
    )
    updated_role = await applications.membership_role(application.id, member.id)
    removed = await applications.set_member_role(application.id, organization.id, member.id, None, owner)
    removed_role = await applications.membership_role(application.id, member.id)
    restored = await applications.set_member_role(
        application.id,
        organization.id,
        member.id,
        ApplicationRoles.maintain,
        owner,
    )
    restored_role = await applications.membership_role(application.id, member.id)

    # Assert
    assert missing is False
    assert created is True
    assert created_role == ApplicationRoles.read
    assert updated is True
    assert updated_role == ApplicationRoles.write
    assert removed is True
    assert removed_role is None
    assert restored is True
    assert restored_role == ApplicationRoles.maintain


async def test_set_status_and_update_runtime_modify_active_applications() -> None:
    """Update application status and runtime metadata for active applications."""

    # Arrange
    user, _, application = await create_application_context("runtime")

    # Act
    running = await applications.set_status(application.id, ApplicationStatus.running)
    missing_status = await applications.set_status(uuid4(), ApplicationStatus.running)
    updated = await applications.update_runtime(
        application.id,
        "ghcr.io/longlink/dashboard:2.0.0",
        user,
        status=ApplicationStatus.failed,
        version="2.0.0",
        sdk="1.2.3",
        description="Updated dashboard",
        digest="sha256:abc123",
        icon="activity",
    )
    await applications.soft_delete(application.id, user)
    deleted_runtime = await applications.update_runtime(
        application.id,
        "ghcr.io/longlink/dashboard:3.0.0",
        user,
    )

    # Assert
    assert running is not None
    assert running.status == ApplicationStatus.running
    assert missing_status is None
    assert updated is not None
    assert updated.image == "ghcr.io/longlink/dashboard:2.0.0"
    assert updated.status == ApplicationStatus.failed
    assert updated.version == "2.0.0"
    assert updated.sdk == "1.2.3"
    assert updated.description == "Updated dashboard"
    assert updated.digest == "sha256:abc123"
    assert updated.icon == "activity"
    assert updated.updated_id == user.id
    assert deleted_runtime is None


async def test_provision_storage_credentials_rejects_stale_operation_lease() -> None:
    """Do not persist generated storage credentials from a stale worker lease."""

    # Arrange
    user, organization, application = await create_application_context("storage-lease")
    operation = await operations.enqueue(organization.compute_id)
    claimed = await operations.claim_next()
    assert claimed is not None
    Session = await get_session()
    async with Session() as session:
        row = await session.get(Operation, operation.id)
        assert row is not None
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        await session.commit()

    async def provision() -> dict[str, str]:
        """Fail if stale lease validation reaches credential provisioning."""

        raise AssertionError("stale workers must not provision credentials")

    async def discard(credentials: dict[str, str]) -> None:
        """Fail if no credentials were generated."""

        raise AssertionError(f"unexpected credentials: {credentials}")

    # Act
    result = await applications.provision_storage_credentials(
        application.id,
        operation.id,
        claimed.attempt_count,
        env.VERSION,
        provision,
        discard,
    )
    reloaded = await applications.get(application.id)

    # Assert
    assert result is None
    assert reloaded is not None
    assert applications.storage_credentials(reloaded) is None


async def test_soft_delete_marks_application_and_memberships_deleted() -> None:
    """Soft-delete an application and its application memberships."""

    # Arrange
    user, organization, application = await create_application_context("delete")

    # Act
    deleted = await applications.soft_delete(application.id, user)
    active_application = await applications.get(application.id)
    deleted_application = await applications.get(application.id, include_deleted=True)
    role = await applications.membership_role(application.id, user.id)
    second_delete = await applications.soft_delete(application.id, user)
    missing_delete = await applications.soft_delete(uuid4(), user)
    compute_after = await compute.get(organization.compute_id)
    open_operations = [item for item in await operations.fetch() if item.stopped_at is None]

    # Assert
    assert deleted is not None
    assert deleted.deleted_id == user.id
    assert active_application is None
    assert deleted_application is not None
    assert deleted_application.deleted_id == user.id
    assert role is None
    assert second_delete is None
    assert missing_delete is None
    assert compute_after is not None
    assert compute_after.status == ComputeStatus.ready
    assert compute_after.version == env.VERSION
    assert len(open_operations) == 1
    assert open_operations[0].compute_id == organization.compute_id
    assert open_operations[0].platform_version == env.VERSION
    assert open_operations[0].status == OperationStatus.scheduled
