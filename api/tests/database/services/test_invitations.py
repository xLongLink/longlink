import pytest
from uuid import uuid4
from factories import create_organization
from src.errors import ConflictError, NotFoundError
from src.models.roles import OrganizationRoles
from src.database.services import invitations, organizations
from src.database.models.users import User


async def test_create_normalizes_invitation_email_and_lists_active_invitations(
    users: tuple[User, User, User],
) -> None:
    """Normalize invitation email addresses before storing and listing them."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)

    # Act
    invitation = await invitations.create(organization.id, "  Invited@Example.COM  ", OrganizationRoles.write)
    invitation_rows = await organizations.invitations(organization.id)

    # Assert
    assert invitation.email == "invited@example.com"
    assert invitation.role == OrganizationRoles.write
    assert [item.id for item in invitation_rows] == [invitation.id]


async def test_create_rejects_invitation_for_missing_organization(users: tuple[User, User, User]) -> None:
    """Reject invitations for organizations that do not exist."""

    # Arrange
    owner = users[0]
    organization_id = uuid4()

    # Act
    with pytest.raises(NotFoundError) as exc:
        await invitations.create(organization_id, "invited@example.com", OrganizationRoles.write)

    # Assert
    assert str(exc.value) == "Organization not found"


async def test_create_rejects_invitation_for_existing_member_email(users: tuple[User, User, User]) -> None:
    """Reject invitations for users that already belong to the organization."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)

    # Act
    with pytest.raises(ConflictError) as exc:
        await invitations.create(organization.id, owner.email.upper(), OrganizationRoles.write)

    # Assert
    assert str(exc.value) == "User is already a member"


async def test_create_replaces_invitation_email_case_insensitively(users: tuple[User, User, User]) -> None:
    """Replace an existing grant when an email is invited again."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    invitation = await invitations.create(organization.id, "invited@example.com", OrganizationRoles.write)

    # Act
    replacement = await invitations.create(organization.id, "INVITED@example.com", OrganizationRoles.admin)
    invitation_rows = await organizations.invitations(organization.id)

    # Assert
    assert replacement.id == invitation.id
    assert replacement.role == OrganizationRoles.admin
    assert [item.id for item in invitation_rows] == [invitation.id]
