import pytest
from uuid import uuid4
from types import SimpleNamespace
from fastapi import HTTPException
from datetime import UTC, datetime
from sqlalchemy import select
from src.models.roles import ApplicationRoles, OrganizationRoles
from src.database.session import get_session
from src.database.services import users, compute, storage, database, locations, operations, invitations, applications, organizations
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization

db = SimpleNamespace(
    applications=applications,
    compute=compute,
    database=database,
    invitations=invitations,
    locations=locations,
    operations=operations,
    organizations=organizations,
    storage=storage,
    users=users,
)


async def test_create_persists_org_and_owner_membership(users: tuple[User, User, User]) -> None:
    """Persist a new org and link the creator as owner."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")

    # Act
    organization = await db.organizations.create("acme", "acme", location.id, owner, country="DE")

    # Assert
    assert organization.name == "acme"
    assert organization.slug == "acme"
    assert organization.country == "DE"

    reloaded = await db.organizations.get(organization.id)
    assert reloaded is not None
    memberships = await db.organizations.members(organization.id)
    assert reloaded.name == "acme"
    assert reloaded.slug == "acme"
    assert reloaded.country == "DE"
    assert [member.id for member, _ in memberships] == [owner.id]

    Session = await get_session()
    async with Session() as session:
        statement = select(UserOrganization.role).where(
            UserOrganization.user_id == owner.id,
            UserOrganization.organization_id == organization.id,
        )
        result = await session.execute(statement)

        assert result.scalar_one() == OrganizationRoles.owner


async def test_get_returns_users_from_membership_table(users: tuple[User, User, User]) -> None:
    """Return org members loaded through the organization relationship."""

    # Arrange
    owner, member = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

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
    reloaded = await db.organizations.get(organization.id)
    memberships = await db.organizations.members(organization.id)

    # Assert
    assert reloaded is not None
    assert {user.id for user, _ in memberships} == {owner.id, member.id}


async def test_fetch_and_list_by_user_ignore_deleted_organizations(users: tuple[User, User, User]) -> None:
    """Return only active organizations from collection services."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    active_organization = await db.organizations.create("acme", "acme", location.id, owner)
    deleted_organization = await db.organizations.create("deleted", "deleted", location.id, owner)
    await db.organizations.soft_delete(deleted_organization.id, owner)

    # Act
    fetched = await db.organizations.fetch()
    user_organizations = await db.users.organizations(owner.id)

    # Assert
    assert [organization.id for organization in fetched] == [active_organization.id]
    assert [organization.id for organization in user_organizations] == [active_organization.id]


async def test_get_member_and_membership_role_require_active_membership(users: tuple[User, User, User]) -> None:
    """Return organization access only for active organization members."""

    # Arrange
    owner, non_member = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

    # Act
    owner_organization = await db.organizations.get_member(organization.id, owner.id)
    non_member_organization = await db.organizations.get_member(organization.id, non_member.id)
    owner_role = await db.organizations.membership_role(organization.id, owner.id)
    missing_role = await db.organizations.membership_role(uuid4(), owner.id)

    # Assert
    assert owner_organization is not None
    assert owner_organization.id == organization.id
    assert non_member_organization is None
    assert owner_role == OrganizationRoles.owner
    assert missing_role is None


async def test_update_member_role_updates_existing_memberships(users: tuple[User, User, User]) -> None:
    """Update an active organization member role."""

    # Arrange
    owner, member, non_member = users
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

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
    updated = await db.organizations.update_member_role(
        organization.id,
        member.id,
        OrganizationRoles.maintain,
        owner,
    )
    missing = await db.organizations.update_member_role(
        organization.id,
        non_member.id,
        OrganizationRoles.read,
        owner,
    )
    role = await db.organizations.membership_role(organization.id, member.id)

    # Assert
    assert updated is True
    assert missing is False
    assert role == OrganizationRoles.maintain


async def test_update_member_role_rejects_demoting_last_owner(users: tuple[User, User, User]) -> None:
    """Keep at least one owner in every organization."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.organizations.update_member_role(organization.id, owner.id, OrganizationRoles.admin, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Organization must have at least one owner"
    assert await db.organizations.membership_role(organization.id, owner.id) == OrganizationRoles.owner


async def test_database_users_returns_member_state_ordered_by_email(users: tuple[User, User, User]) -> None:
    """Return organization member state for tenant database synchronization."""

    # Arrange
    owner, member, deleted_member = users
    deleted_at = datetime.now(UTC)
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

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
    database_users = await db.organizations.database_users(organization.id)

    # Assert
    assert [user.email for user in database_users] == [owner.email, member.email, deleted_member.email]
    assert [user.role for user in database_users] == [
        OrganizationRoles.owner.value,
        OrganizationRoles.write.value,
        OrganizationRoles.read.value,
    ]
    assert [user.deleted_at is not None for user in database_users] == [False, False, True]


async def test_get_includes_application_role_for_requested_user(users: tuple[User, User, User]) -> None:
    """Include the requested user's application role in organization details."""

    # Arrange
    owner, member = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

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

    application = await db.applications.create(
        organization.id,
        "Dashboard",
        "dashboard",
        "ghcr.io/longlink/dashboard:latest",
        owner,
    )
    await db.applications.set_member_role(application.id, organization.id, member.id, ApplicationRoles.read, owner)

    # Act
    details = await db.organizations.get(organization.id)
    memberships = await db.applications.list_user_memberships(organization.id, member.id)

    # Assert
    assert details is not None
    assert details.id == organization.id
    assert len(memberships) == 1
    assert memberships[0].application_id == application.id
    assert memberships[0].role == ApplicationRoles.read


async def test_create_rejects_duplicate_organization_names(users: tuple[User, User, User]) -> None:
    """Reject duplicate organization names."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    await db.organizations.create("acme", "acme", location.id, owner)

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.organizations.create("acme", "acme", location.id, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Organization already exists"


async def test_create_rejects_organization_with_overlong_runtime_name(users: tuple[User, User, User]) -> None:
    """Reject organizations whose managed runtime resource names would exceed backend limits."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")

    # Act
    with pytest.raises(ValueError, match="Value must be at most 63 characters"):
        await db.organizations.create("a" * 48, "a" * 48, location.id, owner)

    # Assert
    assert await db.organizations.fetch() == []


async def test_create_invitation_persists_pending_invitation(users: tuple[User, User, User]) -> None:
    """Persist one invitation for a user email."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

    # Act
    invitation = await db.invitations.create(organization.id, invitee.email, OrganizationRoles.write, owner)

    # Assert
    assert invitation.organization_id == organization.id
    assert invitation.email == invitee.email
    assert invitation.role == OrganizationRoles.write
    reloaded = await db.organizations.invitations(organization.id)
    assert [item.id for item in reloaded] == [invitation.id]


async def test_create_invitation_rejects_duplicate_email(users: tuple[User, User, User]) -> None:
    """Reject a second invitation for the same email address."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    await db.invitations.create(organization.id, invitee.email, OrganizationRoles.write, owner)

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.invitations.create(organization.id, invitee.email, OrganizationRoles.admin, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Invitation already exists"


async def test_soft_delete_cascades_nested_organization_rows(users: tuple[User, User, User]) -> None:
    """Soft-delete an organization and its nested application and access rows."""

    # Arrange
    owner, member = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    application = await db.applications.create(
        organization.id,
        "Dashboard",
        "dashboard",
        "ghcr.io/longlink/dashboard:latest",
        owner,
    )
    await db.invitations.create(organization.id, "invited@example.com", OrganizationRoles.write, owner)

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
    deleted = await db.organizations.soft_delete(organization.id, owner)
    active_organization = await db.organizations.get(organization.id)
    deleted_organization = await db.organizations.get(organization.id, include_deleted=True)
    active_application = await db.applications.get(application.id)
    deleted_application = await db.applications.get(application.id, include_deleted=True)
    second_delete = await db.organizations.soft_delete(organization.id, owner)
    missing_delete = await db.organizations.soft_delete(uuid4(), owner)

    # Assert
    assert deleted is not None
    assert deleted.deleted_id == owner.id
    assert active_organization is None
    assert deleted_organization is not None
    assert deleted_organization.deleted_by is not None
    assert deleted_organization.deleted_by.id == owner.id
    assert await db.organizations.members(organization.id) == []
    assert await db.organizations.invitations(organization.id) == []
    assert await db.organizations.applications(organization.id) == []
    assert active_application is None
    assert deleted_application is not None
    assert deleted_application.deleted_id == owner.id
    assert second_delete is None
    assert missing_delete is None
    assert await db.organizations.membership_role(organization.id, owner.id) is None
    assert await db.organizations.membership_role(organization.id, member.id) is None
    assert await db.applications.membership_role(application.id, owner.id) is None
    assert await db.applications.membership_role(application.id, member.id) is None
    assert await db.organizations.invitations(organization.id) == []
