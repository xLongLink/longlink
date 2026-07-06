import pytest
from uuid import uuid4
from types import SimpleNamespace
from datetime import UTC, datetime
from src.models.roles import OrganizationRoles
from src.database.session import get_session
from src.models.countries import Country
from src.database.models.users import User
from src.database.models.invitations import OrganizationInvitation
from src.database.services import invitations
from src.database.services import locations
from src.database.services import organizations

db = SimpleNamespace(
    invitations=invitations,
    locations=locations,
    organizations=organizations,
)


async def test_create_normalizes_invitation_email_and_lists_active_invitations(
    users: tuple[User, User, User],
) -> None:
    """Normalize invitation email addresses before storing and listing them."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    # Act
    invitation = await db.invitations.create(
        organization.id,
        "  Invited@Example.COM  ",
        OrganizationRoles.write,
        owner,
    )
    invitations = await db.invitations.list_by_organization(organization.id)

    # Assert
    assert invitation.email == "invited@example.com"
    assert invitation.role_name == OrganizationRoles.write
    assert invitation.created_id == owner.id
    assert invitation.updated_id == owner.id
    assert [item.id for item in invitations] == [invitation.id]


async def test_create_rejects_invitation_for_missing_organization(users: tuple[User, User, User]) -> None:
    """Reject invitations for organizations that do not exist."""

    # Arrange
    owner = users[0]

    # Act
    with pytest.raises(ValueError) as exc:
        await db.invitations.create(uuid4(), "invited@example.com", OrganizationRoles.write, owner)

    # Assert
    assert str(exc.value) == "Organization not found"


async def test_create_rejects_invitation_for_existing_member_email(users: tuple[User, User, User]) -> None:
    """Reject invitations for users that already belong to the organization."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    # Act
    with pytest.raises(ValueError) as exc:
        await db.invitations.create(organization.id, owner.email.upper(), OrganizationRoles.write, owner)

    # Assert
    assert str(exc.value) == "User is already a member"


async def test_create_rejects_duplicate_invitation_email_case_insensitively(
    users: tuple[User, User, User],
) -> None:
    """Reject duplicate pending invitations even when email case differs."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    await db.invitations.create(organization.id, "invited@example.com", OrganizationRoles.write, owner)

    # Act
    with pytest.raises(ValueError) as exc:
        await db.invitations.create(organization.id, "INVITED@example.com", OrganizationRoles.admin, owner)

    # Assert
    assert str(exc.value) == "Invitation already exists"


async def test_list_by_organization_ignores_deleted_invitations(users: tuple[User, User, User]) -> None:
    """Exclude soft-deleted invitations from organization invitation lists."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    invitation = await db.invitations.create(organization.id, "invited@example.com", OrganizationRoles.write, owner)

    Session = await get_session()
    async with Session() as session:
        deleted_invitation = await session.get(OrganizationInvitation, invitation.id)
        assert deleted_invitation is not None
        deleted_invitation.deleted_at = datetime.now(UTC)
        deleted_invitation.deleted_id = owner.id
        await session.commit()

    # Act
    invitations = await db.invitations.list_by_organization(organization.id)

    # Assert
    assert invitations == []
