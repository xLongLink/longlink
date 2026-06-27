import pytest
from types import SimpleNamespace
from sqlalchemy import select
from src.models.roles import OrganizationRoles
from src.database.session import get_session
from src.models.countries import Country
from src.database.models.users import User
from src.database.services.users import users
from src.database.services.compute import compute
from src.database.services.storage import storage
from src.database.services.database import database
from src.database.models.association import UserOrganization
from src.database.services.invitations import invitations
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.applications import applications
from src.database.services.organizations import organizations

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
    location = await db.locations.create("local", "Local testing", owner, Country.CH)

    # Act
    organization = await db.organizations.create("acme", location.id, owner)

    # Assert
    assert organization.name == "acme"
    assert organization.slug == "acme"

    reloaded = await db.organizations.get(organization.id)
    assert reloaded is not None
    assert reloaded.name == "acme"
    assert reloaded.slug == "acme"
    assert [member.id for member in reloaded.users] == [owner.id]

    Session = await get_session()
    async with Session() as session:
        statement = select(UserOrganization.role_name).where(
            UserOrganization.user_id == owner.id,
            UserOrganization.organization_id == organization.id,
        )
        result = await session.execute(statement)

        assert result.scalar_one() == OrganizationRoles.owner


async def test_get_returns_users_from_membership_table(users: tuple[User, User, User]) -> None:
    """Return org members loaded through the organization relationship."""

    # Arrange
    owner, member = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.write,
            )
        )
        await session.commit()

    # Act
    reloaded = await db.organizations.get(organization.id)

    # Assert
    assert reloaded is not None
    assert {user.id for user in reloaded.users} == {owner.id, member.id}


async def test_get_ignores_deleted_applications_without_mutating_relationship(users: tuple[User, User, User]) -> None:
    """Return org details after an app delete without breaking the read path."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    # Act
    await db.applications.delete(organization.id, application.id, deleted_id=owner.id)
    reloaded = await db.organizations.get(organization.id)

    # Assert
    assert reloaded is not None
    assert reloaded.applications == []


async def test_create_raises_value_error_when_org_already_exists(users: tuple[User, User, User]) -> None:
    """Reject duplicate organization names."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    await db.organizations.create("acme", location.id, owner)

    # Act
    with pytest.raises(ValueError) as exc:
        await db.organizations.create("acme", location.id, owner)

    # Assert
    assert str(exc.value) == "Organization already exists"


async def test_create_invitation_persists_pending_invitation(users: tuple[User, User, User]) -> None:
    """Persist one invitation for a user email."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    # Act
    invitation = await db.invitations.create(organization.id, invitee.email, OrganizationRoles.write, owner)

    # Assert
    assert invitation.organization_id == organization.id
    assert invitation.email == invitee.email
    assert invitation.role_name == OrganizationRoles.write
    reloaded = await db.invitations.list_by_organization(organization.id)
    assert [item.id for item in reloaded] == [invitation.id]


async def test_create_invitation_rejects_duplicate_email(users: tuple[User, User, User]) -> None:
    """Reject a second invitation for the same email address."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    await db.invitations.create(organization.id, invitee.email, OrganizationRoles.write, owner)

    # Act
    with pytest.raises(ValueError) as exc:
        await db.invitations.create(organization.id, invitee.email, OrganizationRoles.admin, owner)

    # Assert
    assert str(exc.value) == "Invitation already exists"
