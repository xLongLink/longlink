import pytest
from uuid import uuid4
from fastapi import HTTPException
from factories import create_organization, mark_organization_running, create_ready_infrastructure
from src.environments import env
from src.models.roles import ApplicationRoles, OrganizationRoles
from longlink.utils.time import utcnow
from src.models.statuses import ComputeStatus, OrganizationStatus
from src.database.session import get_session
from src.database.services import compute, operations, invitations, applications, organizations
from src.models.operations import OperationStatus
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization


async def test_create_persists_org_and_owner_membership(users: tuple[User, User, User]) -> None:
    """Persist a new org and link the creator as owner."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)

    # Act
    organization = await create_organization(infrastructure, owner, country="DE")
    reloaded_compute = await compute.get(infrastructure.compute.id)
    open_operations = [item for item in await operations.fetch() if item.stopped_at is None]

    # Assert
    assert organization.name == "acme"
    assert organization.slug == "acme"
    assert organization.country == "DE"
    assert organization.compute_id == infrastructure.compute.id
    assert organization.database_id == infrastructure.database.id
    assert organization.storage_id == infrastructure.storage.id
    assert organization.status == OrganizationStatus.creating
    assert reloaded_compute is not None
    assert reloaded_compute.status == ComputeStatus.ready
    assert reloaded_compute.version == env.VERSION
    assert len(open_operations) == 1
    assert open_operations[0].compute_id == infrastructure.compute.id
    assert open_operations[0].platform_version == env.VERSION
    assert open_operations[0].status == OperationStatus.scheduled

    reloaded = await organizations.get(organization.id)
    assert reloaded is not None
    memberships = await organizations.members(organization.id)
    assert reloaded.name == "acme"
    assert reloaded.slug == "acme"
    assert reloaded.country == "DE"
    assert [member.id for member, _ in memberships] == [owner.id]

    Session = await get_session()
    async with Session() as session:
        membership = await session.get(UserOrganization, (owner.id, organization.id))

        assert membership is not None
        assert membership.role == OrganizationRoles.owner


async def test_get_returns_users_from_membership_table(users: tuple[User, User, User]) -> None:
    """Return org members loaded through the organization relationship."""

    # Arrange
    owner, member = users[0], users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    # Act
    reloaded = await organizations.get(organization.id)
    memberships = await organizations.members(organization.id)

    # Assert
    assert reloaded is not None
    assert {user.id for user, _ in memberships} == {owner.id, member.id}


async def test_fetch_ignores_deleted_organizations(users: tuple[User, User, User]) -> None:
    """Return only active organizations from the collection service."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
    active_organization = await create_organization(infrastructure, owner)
    deleted_organization = await create_organization(infrastructure, owner, name="deleted", slug="deleted")
    await organizations.soft_delete(deleted_organization.id, owner)

    # Act
    fetched = await organizations.fetch()

    # Assert
    assert [organization.id for organization in fetched] == [active_organization.id]


async def test_membership_role_requires_active_membership(users: tuple[User, User, User]) -> None:
    """Return organization roles only for active organization members."""

    # Arrange
    owner, non_member = users[0], users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)

    # Act
    owner_role = await organizations.membership_role(organization.id, owner.id)
    non_member_role = await organizations.membership_role(organization.id, non_member.id)
    missing_role = await organizations.membership_role(uuid4(), owner.id)

    # Assert
    assert owner_role == OrganizationRoles.owner
    assert non_member_role is None
    assert missing_role is None


async def test_update_member_role_updates_existing_memberships(users: tuple[User, User, User]) -> None:
    """Update an active organization member role."""

    # Arrange
    owner, member, non_member = users
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)

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
    updated = await organizations.update_member_role(
        organization.id,
        member.id,
        OrganizationRoles.maintain,
        owner,
    )
    missing = await organizations.update_member_role(
        organization.id,
        non_member.id,
        OrganizationRoles.read,
        owner,
    )
    role = await organizations.membership_role(organization.id, member.id)
    reloaded_compute = await compute.get(infrastructure.compute.id)
    open_operations = [item for item in await operations.fetch() if item.stopped_at is None]

    # Assert
    assert updated is True
    assert missing is False
    assert role == OrganizationRoles.maintain
    assert reloaded_compute is not None
    assert reloaded_compute.status == ComputeStatus.ready
    assert reloaded_compute.version == env.VERSION
    assert len(open_operations) == 1
    assert open_operations[0].compute_id == infrastructure.compute.id
    assert open_operations[0].platform_version == env.VERSION
    assert open_operations[0].status == OperationStatus.scheduled


async def test_update_member_role_rejects_demoting_last_owner(users: tuple[User, User, User]) -> None:
    """Keep at least one owner in every organization."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)

    # Act
    with pytest.raises(HTTPException) as exc:
        await organizations.update_member_role(organization.id, owner.id, OrganizationRoles.admin, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Organization must have at least one owner"
    assert await organizations.membership_role(organization.id, owner.id) == OrganizationRoles.owner


async def test_members_can_include_deleted_memberships(users: tuple[User, User, User]) -> None:
    """Return every organization membership when deleted rows are requested."""

    # Arrange
    owner, member, deleted_member = users
    deleted_at = utcnow()
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        session.add(
            UserOrganization(
                user_id=deleted_member.id,
                organization_id=organization.id,
                role=OrganizationRoles.read,
                deleted_at=deleted_at,
            )
        )
        await session.commit()

    # Act
    members = await organizations.members(organization.id, include_deleted=True)

    # Assert
    memberships = {user.email: membership for user, membership in members}
    assert set(memberships) == {owner.email, member.email, deleted_member.email}
    assert memberships[owner.email].role == OrganizationRoles.owner
    assert memberships[member.email].role == OrganizationRoles.write
    assert memberships[deleted_member.email].role == OrganizationRoles.read
    assert memberships[owner.email].deleted_at is None
    assert memberships[member.email].deleted_at is None
    assert memberships[deleted_member.email].deleted_at is not None


async def test_create_rejects_organization_on_non_ready_compute(users: tuple[User, User, User]) -> None:
    """Require a fully reconciled compute target before creating an Organization."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
    await compute.record_failure(infrastructure.compute.id)

    # Act
    with pytest.raises(HTTPException) as exc:
        await create_organization(infrastructure, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Compute registry is not ready"
    assert await organizations.fetch() == []
    reloaded_compute = await compute.get(infrastructure.compute.id)
    assert reloaded_compute is not None
    assert reloaded_compute.status == ComputeStatus.failed
    assert reloaded_compute.version == env.VERSION
    assert await operations.fetch() == []


async def test_create_rejects_organization_with_overlong_runtime_name(users: tuple[User, User, User]) -> None:
    """Reject organizations whose namespace slug exceeds backend limits."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)

    # Act
    with pytest.raises(ValueError, match="Value must be at most 63 characters"):
        await create_organization(infrastructure, owner, name="a" * 64, slug="a" * 64)

    # Assert
    assert await organizations.fetch() == []
    reloaded_compute = await compute.get(infrastructure.compute.id)
    assert reloaded_compute is not None
    assert reloaded_compute.status == ComputeStatus.ready
    assert reloaded_compute.version == env.VERSION
    assert await operations.fetch() == []


async def test_soft_delete_cascades_nested_organization_rows(users: tuple[User, User, User]) -> None:
    """Soft-delete an organization and its nested application and access rows."""

    # Arrange
    owner, member = users[0], users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    await mark_organization_running(organization)
    application = await applications.create(
        organization.id,
        "Dashboard",
        "dashboard",
        "ghcr.io/longlink/dashboard:latest",
        owner,
    )
    await invitations.create(organization.id, "invited@example.com", OrganizationRoles.write, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        session.add(
            UserApplication(
                application_id=application.id,
                organization_id=organization.id,
                user_id=member.id,
                role=ApplicationRoles.read,
            )
        )
        await session.commit()

    # Act
    deleted = await organizations.soft_delete(organization.id, owner)
    active_organization = await organizations.get(organization.id)
    deleted_organization = await organizations.get(organization.id, include_deleted=True)
    active_application = await applications.get(application.id)
    deleted_application = await applications.get(application.id, include_deleted=True)
    second_delete = await organizations.soft_delete(organization.id, owner)
    missing_delete = await organizations.soft_delete(uuid4(), owner)
    reloaded_compute = await compute.get(infrastructure.compute.id)
    open_operations = [item for item in await operations.fetch() if item.stopped_at is None]

    # Assert
    assert deleted is not None
    assert deleted.deleted_id == owner.id
    assert active_organization is None
    assert deleted_organization is not None
    assert deleted_organization.deleted_by is not None
    assert deleted_organization.deleted_by.id == owner.id
    assert await organizations.members(organization.id) == []
    assert await organizations.invitations(organization.id) == []
    assert await organizations.applications(organization.id) == []
    assert active_application is None
    assert deleted_application is not None
    assert deleted_application.deleted_id == owner.id
    assert second_delete is None
    assert missing_delete is None
    assert await organizations.membership_role(organization.id, owner.id) is None
    assert await organizations.membership_role(organization.id, member.id) is None
    assert await applications.membership_role(application.id, owner.id) is None
    assert await applications.membership_role(application.id, member.id) is None
    assert await organizations.invitations(organization.id) == []
    assert reloaded_compute is not None
    assert reloaded_compute.status == ComputeStatus.ready
    assert reloaded_compute.version == env.VERSION
    assert len(open_operations) == 1
    assert open_operations[0].compute_id == infrastructure.compute.id
    assert open_operations[0].platform_version == env.VERSION
    assert open_operations[0].status == OperationStatus.scheduled
